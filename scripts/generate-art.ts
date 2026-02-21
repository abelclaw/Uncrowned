/**
 * Art Generation Build Script
 *
 * Generates pixel art assets for Uncrowned via ComfyUI REST API.
 * Reads prompts from art-manifest.json, submits to ComfyUI, downloads results,
 * and post-processes with sharp to correct dimensions.
 *
 * Usage:
 *   npx tsx scripts/generate-art.ts --type backgrounds --room forest_clearing
 *   npx tsx scripts/generate-art.ts --type shared
 *   npx tsx scripts/generate-art.ts --type all
 *   npx tsx scripts/generate-art.ts --dry-run --type all
 *   npx tsx scripts/generate-art.ts --type backgrounds --force
 *
 * Requires ComfyUI running at http://127.0.0.1:8188
 *
 * Workflow node IDs (from comfyui-workflow.json):
 *   PROMPT_NODE_ID = "6"  (CLIPTextEncode)
 *   SEED_NODE_ID   = "10" (RandomNoise)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COMFYUI_URL = 'http://127.0.0.1:8188';
const PROMPT_NODE_ID = '6';
const SEED_NODE_ID = '10';
const POLL_INTERVAL_MS = 3000;
const GENERATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '..');

interface StyleGuide {
    promptPrefix: string;
    promptSuffix: string;
    spritePromptPrefix: string;
    spritePromptSuffix: string;
    itemPromptPrefix: string;
    itemPromptSuffix: string;
    outputResolution: { width: number; height: number };
    wideOutputResolution: { width: number; height: number };
    generationResolution: { width: number; height: number };
    loraModel: string;
    loraTrigger: string;
    loraStrength: number;
    sampler: string;
    scheduler: string;
    steps: number;
    guidance: number;
    acts: Record<string, { name: string; palette: string; rooms: string[] }>;
}

interface ManifestEntry {
    prompt: string;
    seed: number;
    output: string;
    dimensions: { width: number; height: number };
    act?: string;
    spriteConfig?: {
        frameWidth: number;
        frameHeight: number;
        frameCount: number;
    };
}

interface ArtManifest {
    version: number;
    sharedBackgrounds: Record<string, ManifestEntry>;
    roomBackgrounds: Record<string, ManifestEntry>;
    playerSprite: ManifestEntry;
    items: Record<string, ManifestEntry>;
    npcs: Record<string, ManifestEntry>;
}

type ComfyUIWorkflow = Record<string, {
    class_type: string;
    inputs: Record<string, unknown>;
    _meta?: { title: string };
}>;

// Load configuration files
function loadConfig(): { styleGuide: StyleGuide; manifest: ArtManifest; workflow: ComfyUIWorkflow } {
    const styleGuide: StyleGuide = JSON.parse(
        fs.readFileSync(path.join(SCRIPTS_DIR, 'style-guide.json'), 'utf-8')
    );
    const manifest: ArtManifest = JSON.parse(
        fs.readFileSync(path.join(SCRIPTS_DIR, 'art-manifest.json'), 'utf-8')
    );
    const workflow: ComfyUIWorkflow = JSON.parse(
        fs.readFileSync(path.join(SCRIPTS_DIR, 'comfyui-workflow.json'), 'utf-8')
    );
    return { styleGuide, manifest, workflow };
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

async function checkComfyUI(): Promise<boolean> {
    try {
        const res = await fetch(COMFYUI_URL, { signal: AbortSignal.timeout(5000) });
        return res.ok || res.status === 200;
    } catch {
        return false;
    }
}

async function generateImage(
    prompt: string,
    seed: number,
    workflow: ComfyUIWorkflow
): Promise<Buffer> {
    // Deep-clone workflow template
    const workflowCopy = JSON.parse(JSON.stringify(workflow)) as ComfyUIWorkflow;

    // Remove the _comment field (not a real node)
    delete (workflowCopy as Record<string, unknown>)['_comment'];

    // Inject prompt into CLIPTextEncode node
    workflowCopy[PROMPT_NODE_ID].inputs.text = prompt;

    // Inject seed into RandomNoise node
    workflowCopy[SEED_NODE_ID].inputs.noise_seed = seed;

    // Submit to ComfyUI
    const submitRes = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflowCopy }),
    });

    if (!submitRes.ok) {
        const errorText = await submitRes.text();
        throw new Error(`ComfyUI prompt submission failed (${submitRes.status}): ${errorText}`);
    }

    const { prompt_id } = (await submitRes.json()) as { prompt_id: string };

    // Poll for completion
    const startTime = Date.now();
    let outputData: Record<string, { images: Array<{ filename: string; type: string }> }> | undefined;

    while (!outputData) {
        if (Date.now() - startTime > GENERATION_TIMEOUT_MS) {
            throw new Error(`Generation timed out after ${GENERATION_TIMEOUT_MS / 1000}s for prompt_id: ${prompt_id}`);
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

        const historyRes = await fetch(`${COMFYUI_URL}/history/${prompt_id}`);
        if (!historyRes.ok) continue;

        const historyData = (await historyRes.json()) as Record<string, {
            outputs?: Record<string, { images: Array<{ filename: string; type: string }> }>;
        }>;

        if (historyData[prompt_id]?.outputs) {
            outputData = historyData[prompt_id].outputs;
        }
    }

    // Find the SaveImage output
    const saveNodeOutput = outputData[Object.keys(outputData).find(
        key => outputData![key].images?.length > 0
    ) ?? ''];

    if (!saveNodeOutput?.images?.[0]) {
        throw new Error(`No output image found for prompt_id: ${prompt_id}`);
    }

    const filename = saveNodeOutput.images[0].filename;

    // Download the generated image
    const imgRes = await fetch(
        `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&type=output`
    );

    if (!imgRes.ok) {
        throw new Error(`Failed to download image: ${filename}`);
    }

    return Buffer.from(await imgRes.arrayBuffer());
}

async function processBackground(
    input: Buffer,
    outputPath: string,
    width: number,
    height: number
): Promise<void> {
    const fullPath = path.resolve(PROJECT_ROOT, outputPath);
    const dir = path.dirname(fullPath);

    // Create output directory if needed
    fs.mkdirSync(dir, { recursive: true });

    await sharp(input)
        .resize(width, height, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(fullPath);
}

async function processSprite(
    input: Buffer,
    outputPath: string,
    width: number,
    height: number
): Promise<void> {
    const fullPath = path.resolve(PROJECT_ROOT, outputPath);
    const dir = path.dirname(fullPath);

    // Create output directory if needed
    fs.mkdirSync(dir, { recursive: true });

    await sharp(input)
        .ensureAlpha()
        .resize(width, height, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(fullPath);
}

// Act palette colors for placeholder backgrounds
const ACT_COLORS: Record<string, { r: number; g: number; b: number }> = {
    act1: { r: 76, g: 135, b: 68 },    // Forest green
    act2: { r: 45, g: 60, b: 120 },     // Deep cavern blue
    act3: { r: 90, g: 60, b: 110 },     // Twilight purple
};

const CATEGORY_COLORS: Record<string, { r: number; g: number; b: number }> = {
    'shared-sky': { r: 135, g: 180, b: 220 },
    'shared-mid': { r: 90, g: 130, b: 90 },
    item: { r: 180, g: 140, b: 60 },
    npc: { r: 100, g: 160, b: 180 },
    sprite: { r: 140, g: 100, b: 80 },
};

async function generatePlaceholder(entry: GenerationEntry): Promise<void> {
    const fullPath = path.resolve(PROJECT_ROOT, entry.output);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });

    let color: { r: number; g: number; b: number };

    if (entry.category === 'room') {
        color = ACT_COLORS[entry.act ?? 'act1'] ?? ACT_COLORS.act1;
        // Vary slightly per room using seed
        color = {
            r: Math.min(255, color.r + (entry.seed % 30) - 15),
            g: Math.min(255, color.g + (entry.seed % 20) - 10),
            b: Math.min(255, color.b + (entry.seed % 25) - 12),
        };
    } else if (entry.category === 'shared') {
        const isSky = entry.id.includes('sky');
        const actKey = entry.id.replace('-sky', '').replace('-mid', '');
        const actBase = ACT_COLORS[actKey] ?? ACT_COLORS.act1;
        color = isSky
            ? { r: Math.min(255, actBase.r + 80), g: Math.min(255, actBase.g + 60), b: Math.min(255, actBase.b + 100) }
            : { r: actBase.r, g: Math.min(255, actBase.g + 30), b: actBase.b };
    } else if (entry.category === 'item') {
        color = CATEGORY_COLORS.item;
    } else if (entry.category === 'npc') {
        color = CATEGORY_COLORS.npc;
    } else {
        color = CATEGORY_COLORS.sprite;
    }

    const { width, height } = entry.dimensions;

    // For sprite-type assets, create with alpha channel
    if (entry.category === 'item' || entry.category === 'npc' || entry.category === 'sprite') {
        // Create SVG with label text for identification
        const label = entry.id.length > 8 ? entry.id.substring(0, 8) : entry.id;
        const fontSize = Math.max(6, Math.floor(Math.min(width, height) / 5));
        const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="3"
                  fill="rgb(${color.r},${color.g},${color.b})" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
            <text x="${width / 2}" y="${height / 2 + fontSize / 3}" font-family="monospace" font-size="${fontSize}"
                  fill="white" text-anchor="middle">${label}</text>
        </svg>`);

        await sharp(svg)
            .ensureAlpha()
            .png()
            .toFile(fullPath);
    } else {
        // Background: solid color rectangle
        const label = entry.id;
        const fontSize = Math.max(10, Math.floor(height / 15));
        const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <rect width="${width}" height="${height}" fill="rgb(${color.r},${color.g},${color.b})"/>
            <text x="${width / 2}" y="${height / 2 + fontSize / 3}" font-family="monospace" font-size="${fontSize}"
                  fill="rgba(255,255,255,0.4)" text-anchor="middle">${label}</text>
        </svg>`);

        await sharp(svg)
            .png({ compressionLevel: 9 })
            .toFile(fullPath);
    }
}

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

interface CLIArgs {
    type: 'backgrounds' | 'shared' | 'sprites' | 'items' | 'npcs' | 'player' | 'all';
    room?: string;
    dryRun: boolean;
    force: boolean;
    placeholder: boolean;
}

function parseArgs(): CLIArgs {
    const args = process.argv.slice(2);
    const result: CLIArgs = {
        type: 'all',
        dryRun: false,
        force: false,
        placeholder: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--type':
                result.type = args[++i] as CLIArgs['type'];
                if (!['backgrounds', 'shared', 'sprites', 'items', 'npcs', 'player', 'all'].includes(result.type)) {
                    console.error(`Invalid --type: ${result.type}. Must be: backgrounds, shared, sprites, items, npcs, player, all`);
                    process.exit(1);
                }
                break;
            case '--room':
                result.room = args[++i];
                break;
            case '--dry-run':
                result.dryRun = true;
                break;
            case '--force':
                result.force = true;
                break;
            case '--placeholder':
                result.placeholder = true;
                break;
            case '--help':
                printHelp();
                process.exit(0);
                break;
            default:
                console.error(`Unknown argument: ${args[i]}`);
                printHelp();
                process.exit(1);
        }
    }

    return result;
}

function printHelp(): void {
    console.log(`
Art Generation Script for Uncrowned
==================================

Usage: npx tsx scripts/generate-art.ts [options]

Options:
  --type <type>    Asset type: backgrounds, shared, sprites, items, npcs, player, all (default: all)
  --room <id>      Generate only a specific room (e.g., forest_clearing)
  --dry-run        Print prompts without generating images
  --force          Regenerate even if output file already exists
  --placeholder    Create colored placeholder PNGs instead of using ComfyUI
  --help           Show this help message

Examples:
  npx tsx scripts/generate-art.ts --dry-run --type all
  npx tsx scripts/generate-art.ts --type backgrounds --room forest_clearing
  npx tsx scripts/generate-art.ts --type shared
  npx tsx scripts/generate-art.ts --type items --placeholder
  npx tsx scripts/generate-art.ts --type all --force

Requires ComfyUI running at ${COMFYUI_URL}
`.trim());
}

// ---------------------------------------------------------------------------
// Entry Collection
// ---------------------------------------------------------------------------

interface GenerationEntry {
    id: string;
    category: 'room' | 'shared' | 'sprite' | 'item' | 'npc';
    prompt: string;
    fullPrompt: string;
    seed: number;
    output: string;
    dimensions: { width: number; height: number };
    act?: string;
}

function collectEntries(
    args: CLIArgs,
    styleGuide: StyleGuide,
    manifest: ArtManifest
): GenerationEntry[] {
    const entries: GenerationEntry[] = [];

    // Shared backgrounds
    if (args.type === 'shared' || args.type === 'all') {
        for (const [id, entry] of Object.entries(manifest.sharedBackgrounds)) {
            entries.push({
                id,
                category: 'shared',
                prompt: entry.prompt,
                fullPrompt: `${styleGuide.promptPrefix} ${entry.prompt}${styleGuide.promptSuffix}`,
                seed: entry.seed,
                output: entry.output,
                dimensions: entry.dimensions,
            });
        }
    }

    // Room backgrounds
    if (args.type === 'backgrounds' || args.type === 'all') {
        for (const [id, entry] of Object.entries(manifest.roomBackgrounds)) {
            if (args.room && id !== args.room) continue;

            // Get act palette for context
            const actInfo = entry.act ? styleGuide.acts[entry.act] : undefined;
            const paletteHint = actInfo ? ` ${actInfo.palette.split('.')[0]}.` : '';

            entries.push({
                id,
                category: 'room',
                prompt: entry.prompt,
                fullPrompt: `${styleGuide.promptPrefix} ${entry.prompt},${paletteHint}${styleGuide.promptSuffix}`,
                seed: entry.seed,
                output: entry.output,
                dimensions: entry.dimensions,
                act: entry.act,
            });
        }
    }

    // Player sprite
    if (args.type === 'sprites' || args.type === 'player' || args.type === 'all') {
        const player = manifest.playerSprite;
        entries.push({
            id: 'player',
            category: 'sprite',
            prompt: player.prompt,
            fullPrompt: `${styleGuide.spritePromptPrefix} ${player.prompt}${styleGuide.spritePromptSuffix}`,
            seed: player.seed,
            output: player.output,
            dimensions: player.dimensions,
        });
    }

    // Item sprites
    if (args.type === 'items' || args.type === 'sprites' || args.type === 'all') {
        for (const [id, entry] of Object.entries(manifest.items)) {
            entries.push({
                id,
                category: 'item',
                prompt: entry.prompt,
                fullPrompt: `${styleGuide.itemPromptPrefix} ${entry.prompt}${styleGuide.itemPromptSuffix}`,
                seed: entry.seed,
                output: entry.output,
                dimensions: entry.dimensions,
            });
        }
    }

    // NPC sprites
    if (args.type === 'npcs' || args.type === 'sprites' || args.type === 'all') {
        for (const [id, entry] of Object.entries(manifest.npcs)) {
            entries.push({
                id,
                category: 'npc',
                prompt: entry.prompt,
                fullPrompt: `${styleGuide.spritePromptPrefix} ${entry.prompt}${styleGuide.spritePromptSuffix}`,
                seed: entry.seed,
                output: entry.output,
                dimensions: entry.dimensions,
            });
        }
    }

    return entries;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const args = parseArgs();
    const { styleGuide, manifest, workflow } = loadConfig();
    const entries = collectEntries(args, styleGuide, manifest);

    if (entries.length === 0) {
        if (args.room) {
            console.error(`Room "${args.room}" not found in art manifest.`);
            console.error(`Available rooms: ${Object.keys(manifest.roomBackgrounds).join(', ')}`);
        } else {
            console.error('No entries to generate for the given filters.');
        }
        process.exit(1);
    }

    console.log(`\nUncrowned Art Generation`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Type: ${args.type}${args.room ? ` (room: ${args.room})` : ''}`);
    console.log(`Entries: ${entries.length}`);
    console.log(`Mode: ${args.dryRun ? 'DRY RUN' : args.placeholder ? 'PLACEHOLDER' : 'GENERATE'}`);
    console.log(`Force: ${args.force ? 'yes' : 'no'}`);
    console.log('');

    // Dry-run mode: just list prompts
    if (args.dryRun) {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            console.log(`[${i + 1}/${entries.length}] ${entry.id} (${entry.category})`);
            console.log(`  Prompt: ${entry.fullPrompt}`);
            console.log(`  Seed:   ${entry.seed}`);
            console.log(`  Output: ${entry.output}`);
            console.log(`  Size:   ${entry.dimensions.width}x${entry.dimensions.height}`);
            console.log('');
        }
        console.log(`DRY RUN complete. ${entries.length} entries listed.`);
        return;
    }

    // Placeholder mode: generate colored rectangles without ComfyUI
    if (args.placeholder) {
        console.log('PLACEHOLDER MODE: Creating colored rectangles at correct dimensions\n');

        let generated = 0;
        let skipped = 0;

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const outputPath = path.resolve(PROJECT_ROOT, entry.output);

            if (!args.force && fs.existsSync(outputPath)) {
                console.log(`[${i + 1}/${entries.length}] SKIP ${entry.id} (already exists)`);
                skipped++;
                continue;
            }

            await generatePlaceholder(entry);
            console.log(`[${i + 1}/${entries.length}] Placeholder ${entry.id} (${entry.dimensions.width}x${entry.dimensions.height})`);
            generated++;
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`Placeholder generation complete:`);
        console.log(`  Created:  ${generated}`);
        console.log(`  Skipped:  ${skipped} (already exist)`);
        console.log(`  Total:    ${entries.length}`);
        return;
    }

    // Check ComfyUI is running
    const comfyAvailable = await checkComfyUI();
    if (!comfyAvailable) {
        console.error('\nERROR: ComfyUI is not running or not reachable.');
        console.error(`Tried: ${COMFYUI_URL}`);
        console.error('\nTo start ComfyUI:');
        console.error('  1. Open ComfyUI Desktop app, OR');
        console.error('  2. Run: python main.py --listen 127.0.0.1 --port 8188');
        console.error('\nFor setup instructions, see:');
        console.error('  .planning/phases/09-art-pipeline-schema-foundation/09-02-PLAN.md (user_setup section)');
        process.exit(1);
    }

    console.log(`ComfyUI: connected at ${COMFYUI_URL}\n`);

    // Generate images
    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const outputPath = path.resolve(PROJECT_ROOT, entry.output);

        // Skip if already exists (unless --force)
        if (!args.force && fs.existsSync(outputPath)) {
            console.log(`[${i + 1}/${entries.length}] SKIP ${entry.id} (already exists)`);
            skipped++;
            continue;
        }

        const startTime = Date.now();
        try {
            console.log(`[${i + 1}/${entries.length}] Generating ${entry.id}...`);

            // Generate via ComfyUI
            const rawImage = await generateImage(entry.fullPrompt, entry.seed, workflow);

            // Post-process based on category
            if (entry.category === 'sprite' || entry.category === 'item' || entry.category === 'npc') {
                await processSprite(rawImage, entry.output, entry.dimensions.width, entry.dimensions.height);
            } else {
                await processBackground(rawImage, entry.output, entry.dimensions.width, entry.dimensions.height);
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[${i + 1}/${entries.length}] Generated ${entry.id} (${elapsed}s)`);
            generated++;
        } catch (err) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.error(`[${i + 1}/${entries.length}] FAILED ${entry.id} (${elapsed}s): ${(err as Error).message}`);

            // Try saving raw image as fallback if we have one
            failed++;
        }
    }

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Generation complete:`);
    console.log(`  Generated: ${generated}`);
    console.log(`  Skipped:   ${skipped} (already exist)`);
    console.log(`  Failed:    ${failed}`);
    console.log(`  Total:     ${entries.length}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
