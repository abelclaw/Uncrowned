/**
 * Parallel LoRA test matrix runner.
 *
 * Submits ALL remaining test jobs to ComfyUI's queue at once,
 * then polls and post-processes them concurrently across CPU cores.
 * GPU still processes one at a time, but we eliminate inter-job overhead
 * and parallelize the sharp post-processing.
 *
 * Usage: npx tsx scripts/generate-lora-parallel.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const PROMPT_NODE_ID = '6';
const SEED_NODE_ID = '10';
const POLL_INTERVAL_MS = 3000;
const GENERATION_TIMEOUT_MS = 120 * 60 * 1000; // 2 hours total (10 images × ~9 min each, queued sequentially)

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '..');

const TEST_ROOMS: Record<string, string[]> = {
    act1: ['forest_clearing', 'throne_room', 'castle_garden'],
    act2: ['crystal_chamber', 'cavern_library', 'forge_chamber'],
    act3: ['petrified_forest', 'wizard_tower', 'rooftop'],
};
const LORA_STRENGTHS = [0.6, 0.7, 0.8];

// Load configs
const styleGuide = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, 'style-guide.json'), 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, 'art-manifest.json'), 'utf-8'));
const workflow = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, 'comfyui-workflow.json'), 'utf-8'));

// Asset type config for backgrounds
const BG_CONFIG = {
    generationWidth: styleGuide.generationResolution.background.width,
    generationHeight: styleGuide.generationResolution.background.height,
    loraStrength: 0.7, // overridden per job
    guidanceScale: styleGuide.guidanceScale?.background ?? 3.5,
    steps: styleGuide.steps?.background ?? 20,
};

interface Job {
    act: string;
    roomId: string;
    strength: number;
    prompt: string;
    seed: number;
    outputPath: string;
}

function buildJobs(): Job[] {
    const outputBase = path.join(PROJECT_ROOT, 'test-output', 'lora-comparison');
    const jobs: Job[] = [];

    for (const [act, rooms] of Object.entries(TEST_ROOMS)) {
        for (const roomId of rooms) {
            const entry = manifest.roomBackgrounds[roomId];
            if (!entry) continue;

            const actInfo = styleGuide.acts[act];
            const paletteHint = actInfo ? ` ${actInfo.palette.split('.')[0]}.` : '';
            const fullPrompt = `${styleGuide.promptPrefix} ${entry.prompt},${paletteHint}${styleGuide.promptSuffix}`;

            for (const strength of LORA_STRENGTHS) {
                const outPath = path.join(outputBase, act, `${roomId}-lora-${strength}.png`);
                // Skip if already exists
                if (fs.existsSync(outPath)) continue;
                jobs.push({ act, roomId, strength, prompt: fullPrompt, seed: entry.seed, outputPath: outPath });
            }
        }
    }
    return jobs;
}

function injectConfig(wf: Record<string, any>, config: typeof BG_CONFIG): void {
    // LoRA loader node
    for (const node of Object.values(wf) as any[]) {
        if (node.class_type === 'LoraLoader' || node.class_type === 'LoRALoader') {
            node.inputs.strength_model = config.loraStrength;
            node.inputs.strength_clip = config.loraStrength;
        }
        if (node.class_type === 'KSampler' || node.class_type === 'SamplerCustomAdvanced') {
            if ('steps' in node.inputs) node.inputs.steps = config.steps;
            if ('cfg' in node.inputs) node.inputs.cfg = config.guidanceScale;
        }
        if (node.class_type === 'EmptyLatentImage' || node.class_type === 'EmptySD3LatentImage') {
            node.inputs.width = config.generationWidth;
            node.inputs.height = config.generationHeight;
        }
    }
}

async function submitJob(job: Job): Promise<{ job: Job; promptId: string }> {
    const wf = JSON.parse(JSON.stringify(workflow));
    delete wf['_comment'];

    wf[PROMPT_NODE_ID].inputs.text = job.prompt;
    wf[SEED_NODE_ID].inputs.noise_seed = job.seed;
    injectConfig(wf, { ...BG_CONFIG, loraStrength: job.strength });

    const res = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: wf }),
    });

    if (!res.ok) throw new Error(`Submit failed (${res.status}): ${await res.text()}`);
    const { prompt_id } = (await res.json()) as { prompt_id: string };
    return { job, promptId: prompt_id };
}

async function pollAndDownload(promptId: string): Promise<Buffer> {
    const start = Date.now();
    while (true) {
        if (Date.now() - start > GENERATION_TIMEOUT_MS) {
            throw new Error(`Timeout after ${GENERATION_TIMEOUT_MS / 1000}s for ${promptId}`);
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
        if (!res.ok) continue;

        const data = (await res.json()) as Record<string, { outputs?: Record<string, { images: Array<{ filename: string; type: string }> }> }>;
        const outputs = data[promptId]?.outputs;
        if (!outputs) continue;

        const nodeKey = Object.keys(outputs).find(k => outputs[k].images?.length > 0);
        if (!nodeKey) throw new Error(`No output image for ${promptId}`);

        const filename = outputs[nodeKey].images[0].filename;
        const imgRes = await fetch(`${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&type=output`);
        if (!imgRes.ok) throw new Error(`Download failed: ${filename}`);
        return Buffer.from(await imgRes.arrayBuffer());
    }
}

async function postProcess(raw: Buffer, outPath: string): Promise<void> {
    const dir = path.dirname(outPath);
    fs.mkdirSync(dir, { recursive: true });
    await sharp(raw).resize(960, 540, { fit: 'cover' }).png().toFile(outPath);
}

async function main() {
    // Check ComfyUI
    try {
        const r = await fetch(`${COMFYUI_URL}/system_stats`);
        if (!r.ok) throw new Error();
    } catch {
        console.error('ComfyUI not running at', COMFYUI_URL);
        process.exit(1);
    }

    const jobs = buildJobs();
    if (jobs.length === 0) {
        console.log('All 27 LoRA test images already exist. Nothing to do.');
        return;
    }

    console.log(`\nParallel LoRA Test Matrix`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Remaining: ${jobs.length} images to generate`);
    console.log(`Strategy: Submit all to ComfyUI queue, poll concurrently\n`);

    // Submit ALL jobs to ComfyUI queue at once
    console.log(`Submitting ${jobs.length} jobs to ComfyUI queue...`);
    const submitted: { job: Job; promptId: string }[] = [];
    for (const job of jobs) {
        const s = await submitJob(job);
        console.log(`  Queued: ${job.roomId} (${job.act}) @ LoRA ${job.strength} → ${s.promptId.slice(0, 8)}`);
        submitted.push(s);
    }
    console.log(`\nAll ${submitted.length} jobs queued. Polling concurrently...\n`);

    // Poll ALL concurrently — ComfyUI processes sequentially on GPU,
    // but we poll in parallel so each result is caught immediately
    let completed = 0;
    const startTime = Date.now();

    const results = await Promise.allSettled(
        submitted.map(async ({ job, promptId }) => {
            const raw = await pollAndDownload(promptId);
            await postProcess(raw, job.outputPath);
            completed++;
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            console.log(`✓ [${completed}/${submitted.length}] ${job.roomId} @ LoRA ${job.strength} (${elapsed}m total)`);
        })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected');

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Complete: ${succeeded}/${submitted.length}`);
    if (failed.length > 0) {
        console.log(`Failed: ${failed.length}`);
        failed.forEach((f, i) => console.log(`  ${i + 1}. ${(f as PromiseRejectedResult).reason}`));
    }

    // Final count
    const totalExisting = 27 - buildJobs().length;
    console.log(`\nTotal LoRA test images: ${totalExisting}/27`);
    console.log(`Output: test-output/lora-comparison/`);
}

main().catch(err => { console.error(err); process.exit(1); });
