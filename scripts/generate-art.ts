/**
 * Art Generation Build Script
 *
 * Generates pixel art assets for KQ Game via ComfyUI REST API.
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

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

interface CLIArgs {
    type: 'backgrounds' | 'shared' | 'sprites' | 'all';
    room?: string;
    dryRun: boolean;
    force: boolean;
}

function parseArgs(): CLIArgs {
    const args = process.argv.slice(2);
    const result: CLIArgs = {
        type: 'all',
        dryRun: false,
        force: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--type':
                result.type = args[++i] as CLIArgs['type'];
                if (!['backgrounds', 'shared', 'sprites', 'all'].includes(result.type)) {
                    console.error(`Invalid --type: ${result.type}. Must be: backgrounds, shared, sprites, all`);
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
Art Generation Script for KQ Game
==================================

Usage: npx tsx scripts/generate-art.ts [options]

Options:
  --type <type>    Asset type to generate: backgrounds, shared, sprites, all (default: all)
  --room <id>      Generate only a specific room (e.g., forest_clearing)
  --dry-run        Print prompts without generating images
  --force          Regenerate even if output file already exists
  --help           Show this help message

Examples:
  npx tsx scripts/generate-art.ts --dry-run --type all
  npx tsx scripts/generate-art.ts --type backgrounds --room forest_clearing
  npx tsx scripts/generate-art.ts --type shared
  npx tsx scripts/generate-art.ts --type all --force

Requires ComfyUI running at ${COMFYUI_URL}
`.trim());
}

// ---------------------------------------------------------------------------
// Entry Collection
// ---------------------------------------------------------------------------

interface GenerationEntry {
    id: string;
    category: 'room' | 'shared' | 'sprite';
    prompt: string;
    fullPrompt: string;
    seed: number;
    output: string;
    dimensions: { width: number; height: number };
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
            });
        }
    }

    // Player sprite
    if (args.type === 'sprites' || args.type === 'all') {
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

    console.log(`\nKQ Game Art Generation`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Type: ${args.type}${args.room ? ` (room: ${args.room})` : ''}`);
    console.log(`Entries: ${entries.length}`);
    console.log(`Mode: ${args.dryRun ? 'DRY RUN' : 'GENERATE'}`);
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

            // Post-process
            if (entry.category === 'sprite') {
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
