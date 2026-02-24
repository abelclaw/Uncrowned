/**
 * Death Image Generation Script
 *
 * Generates pixel art death scene images for Uncrowned via ComfyUI REST API.
 * Reads prompts from death-image-manifest.json, submits to ComfyUI serially,
 * downloads results, and post-processes with sharp to 320x320 squares.
 *
 * Usage:
 *   npx tsx scripts/generate-death-images.ts              # Generate all missing images
 *   npx tsx scripts/generate-death-images.ts --dry-run     # Preview prompts without generating
 *   npx tsx scripts/generate-death-images.ts --force        # Regenerate all images
 *   npx tsx scripts/generate-death-images.ts --image falling # Generate a specific image
 *
 * Requires ComfyUI running at http://127.0.0.1:8188
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
const GENERATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes per image

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '..');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeathImageEntry {
    prompt: string;
    seed: number;
    output: string;
}

interface DeathImageManifest {
    promptPrefix: string;
    promptSuffix: string;
    generationResolution: { width: number; height: number };
    outputResolution: { width: number; height: number };
    loraStrength: number;
    guidance: number;
    steps: number;
    images: Record<string, DeathImageEntry>;
    deathToImage: Record<string, string>;
}

type ComfyUIWorkflow = Record<string, {
    class_type: string;
    inputs: Record<string, unknown>;
    _meta?: { title: string };
}>;

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

function loadConfig(): { manifest: DeathImageManifest; workflow: ComfyUIWorkflow } {
    const manifest: DeathImageManifest = JSON.parse(
        fs.readFileSync(path.join(SCRIPTS_DIR, 'death-image-manifest.json'), 'utf-8')
    );
    const workflow: ComfyUIWorkflow = JSON.parse(
        fs.readFileSync(path.join(SCRIPTS_DIR, 'comfyui-workflow.json'), 'utf-8')
    );
    return { manifest, workflow };
}

async function checkComfyUI(): Promise<boolean> {
    try {
        const res = await fetch(COMFYUI_URL, { signal: AbortSignal.timeout(5000) });
        return res.ok || res.status === 200;
    } catch {
        return false;
    }
}

function injectConfig(
    workflow: ComfyUIWorkflow,
    manifest: DeathImageManifest
): void {
    const { generationResolution, loraStrength, guidance, steps } = manifest;

    // Node 11: EmptySD3LatentImage - generation resolution
    workflow['11'].inputs.width = generationResolution.width;
    workflow['11'].inputs.height = generationResolution.height;
    // Node 4: ModelSamplingFlux - must match latent resolution
    workflow['4'].inputs.width = generationResolution.width;
    workflow['4'].inputs.height = generationResolution.height;
    // Node 3: LoraLoaderModelOnly - LoRA strength
    workflow['3'].inputs.strength_model = loraStrength;
    // Node 5: FluxGuidance - guidance scale
    workflow['5'].inputs.guidance = guidance;
    // Node 9: BasicScheduler - step count
    workflow['9'].inputs.steps = steps;
}

async function generateImage(
    prompt: string,
    seed: number,
    workflow: ComfyUIWorkflow,
    manifest: DeathImageManifest
): Promise<Buffer> {
    // Deep-clone workflow template
    const workflowCopy = JSON.parse(JSON.stringify(workflow)) as ComfyUIWorkflow;

    // Remove the _comment field (not a real node)
    delete (workflowCopy as Record<string, unknown>)['_comment'];

    // Inject prompt into CLIPTextEncode node
    workflowCopy[PROMPT_NODE_ID].inputs.text = prompt;

    // Inject seed into RandomNoise node
    workflowCopy[SEED_NODE_ID].inputs.noise_seed = seed;

    // Inject per-type configuration (resolution, LoRA, guidance, steps)
    injectConfig(workflowCopy, manifest);

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
    console.log(`    Submitted prompt_id: ${prompt_id}`);

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

async function processImage(
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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(): { dryRun: boolean; force: boolean; imageFilter?: string } {
    const args = process.argv.slice(2);
    let dryRun = false;
    let force = false;
    let imageFilter: string | undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--dry-run') dryRun = true;
        else if (args[i] === '--force') force = true;
        else if (args[i] === '--image' && args[i + 1]) {
            imageFilter = args[++i];
        }
    }

    return { dryRun, force, imageFilter };
}

async function main(): Promise<void> {
    const { dryRun, force, imageFilter } = parseArgs();
    const { manifest, workflow } = loadConfig();

    const imageIds = Object.keys(manifest.images);
    const filteredIds = imageFilter
        ? imageIds.filter(id => id === imageFilter)
        : imageIds;

    if (filteredIds.length === 0) {
        console.error(`No matching image found for: ${imageFilter}`);
        console.log(`Available images: ${imageIds.join(', ')}`);
        process.exit(1);
    }

    const { outputResolution, promptPrefix, promptSuffix } = manifest;

    console.log('=== Death Image Generation ===');
    console.log(`Images to process: ${filteredIds.length} of ${imageIds.length}`);
    console.log(`Generation: ${manifest.generationResolution.width}x${manifest.generationResolution.height}`);
    console.log(`Output: ${outputResolution.width}x${outputResolution.height}`);
    console.log(`LoRA strength: ${manifest.loraStrength}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : force ? 'FORCE REGENERATE' : 'GENERATE MISSING'}`);
    console.log('');

    // Collect entries to generate
    const toGenerate: Array<{ id: string; entry: DeathImageEntry; fullPrompt: string }> = [];

    for (const id of filteredIds) {
        const entry = manifest.images[id];
        const fullPrompt = `${promptPrefix} ${entry.prompt}${promptSuffix}`;
        const outputExists = fs.existsSync(path.resolve(PROJECT_ROOT, entry.output));

        if (dryRun) {
            console.log(`[${id}]`);
            console.log(`  Prompt: ${fullPrompt}`);
            console.log(`  Seed: ${entry.seed}`);
            console.log(`  Output: ${entry.output}`);
            console.log(`  Exists: ${outputExists ? 'YES' : 'no'}`);
            console.log('');
            continue;
        }

        if (outputExists && !force) {
            console.log(`[${id}] SKIP (already exists: ${entry.output})`);
            continue;
        }

        toGenerate.push({ id, entry, fullPrompt });
    }

    if (dryRun) {
        // Show death-to-image mapping summary
        console.log('--- Death-to-Image Mapping ---');
        const deathCount = Object.keys(manifest.deathToImage).length;
        const uniqueImages = new Set(Object.values(manifest.deathToImage)).size;
        console.log(`${deathCount} deaths mapped to ${uniqueImages} unique images`);
        console.log('');

        // Show reuse groups
        const imageToDeaths: Record<string, string[]> = {};
        for (const [deathId, imgId] of Object.entries(manifest.deathToImage)) {
            if (!imageToDeaths[imgId]) imageToDeaths[imgId] = [];
            imageToDeaths[imgId].push(deathId);
        }
        for (const [imgId, deaths] of Object.entries(imageToDeaths)) {
            if (deaths.length > 1) {
                console.log(`  ${imgId}: shared by ${deaths.join(', ')}`);
            }
        }
        return;
    }

    if (toGenerate.length === 0) {
        console.log('\nAll images already exist. Use --force to regenerate.');
        return;
    }

    // Check ComfyUI is running
    const comfyReady = await checkComfyUI();
    if (!comfyReady) {
        console.error('\nERROR: ComfyUI is not running at ' + COMFYUI_URL);
        console.error('Start ComfyUI first, then re-run this script.');
        process.exit(1);
    }
    console.log(`\nComfyUI connected at ${COMFYUI_URL}`);

    // Generate images serially
    let success = 0;
    let failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < toGenerate.length; i++) {
        const { id, entry, fullPrompt } = toGenerate[i];
        const progress = `[${i + 1}/${toGenerate.length}]`;

        console.log(`\n${progress} Generating: ${id}`);
        console.log(`    Seed: ${entry.seed}`);

        const genStart = Date.now();

        try {
            const rawImage = await generateImage(fullPrompt, entry.seed, workflow, manifest);
            const elapsed = ((Date.now() - genStart) / 1000).toFixed(1);
            console.log(`    Generated in ${elapsed}s, post-processing...`);

            await processImage(
                rawImage,
                entry.output,
                outputResolution.width,
                outputResolution.height
            );

            console.log(`    Saved: ${entry.output}`);
            success++;
        } catch (err) {
            const elapsed = ((Date.now() - genStart) / 1000).toFixed(1);
            console.error(`    FAILED after ${elapsed}s: ${(err as Error).message}`);
            failed++;
        }
    }

    // Summary
    const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('\n=== Generation Complete ===');
    console.log(`Success: ${success}/${toGenerate.length}`);
    if (failed > 0) console.log(`Failed: ${failed}`);
    console.log(`Total time: ${totalElapsed} minutes`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
