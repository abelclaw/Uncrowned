/**
 * Generate the 3 remaining LoRA test images one at a time.
 * Adds a unique noise suffix to the prompt to bust ComfyUI's cache.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const PROMPT_NODE_ID = '6';
const SEED_NODE_ID = '10';
const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 20 * 60 * 1000;

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '..');

const styleGuide = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, 'style-guide.json'), 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, 'art-manifest.json'), 'utf-8'));
const workflow = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, 'comfyui-workflow.json'), 'utf-8'));

const MISSING = [
    { act: 'act3', roomId: 'petrified_forest', strength: 0.8 },
    { act: 'act3', roomId: 'wizard_tower', strength: 0.8 },
    { act: 'act3', roomId: 'rooftop', strength: 0.8 },
];

function injectConfig(wf: Record<string, any>, loraStrength: number): void {
    for (const node of Object.values(wf) as any[]) {
        if (node.class_type === 'LoraLoader' || node.class_type === 'LoRALoader') {
            node.inputs.strength_model = loraStrength;
            node.inputs.strength_clip = loraStrength;
        }
        if (node.class_type === 'EmptyLatentImage' || node.class_type === 'EmptySD3LatentImage') {
            node.inputs.width = styleGuide.generationResolution.background.width;
            node.inputs.height = styleGuide.generationResolution.background.height;
        }
    }
}

async function generate(roomId: string, act: string, strength: number): Promise<void> {
    const entry = manifest.roomBackgrounds[roomId];
    const actInfo = styleGuide.acts[act];
    const paletteHint = actInfo ? ` ${actInfo.palette.split('.')[0]}.` : '';
    // Add unique cache-buster token so ComfyUI doesn't serve cached result
    const cacheBuster = ` [strength:${strength}:0.0]`;
    const prompt = `${styleGuide.promptPrefix} ${entry.prompt},${paletteHint}${styleGuide.promptSuffix}${cacheBuster}`;

    const wf = JSON.parse(JSON.stringify(workflow));
    delete wf['_comment'];
    wf[PROMPT_NODE_ID].inputs.text = prompt;
    wf[SEED_NODE_ID].inputs.noise_seed = entry.seed;
    injectConfig(wf, strength);

    console.log(`  Submitting ${roomId} @ LoRA ${strength}...`);
    const res = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: wf }),
    });
    if (!res.ok) throw new Error(`Submit failed: ${await res.text()}`);
    const { prompt_id } = (await res.json()) as { prompt_id: string };

    // Poll until complete
    const start = Date.now();
    while (true) {
        if (Date.now() - start > TIMEOUT_MS) throw new Error(`Timeout for ${roomId}`);
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const hres = await fetch(`${COMFYUI_URL}/history/${prompt_id}`);
        if (!hres.ok) continue;
        const data = (await hres.json()) as Record<string, any>;
        const outputs = data[prompt_id]?.outputs;
        if (!outputs) continue;

        const nodeKey = Object.keys(outputs).find(k => outputs[k]?.images?.length > 0);
        if (!nodeKey) continue; // cached, keep waiting

        const filename = outputs[nodeKey].images[0].filename;
        const imgRes = await fetch(`${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&type=output`);
        if (!imgRes.ok) throw new Error(`Download failed: ${filename}`);
        const raw = Buffer.from(await imgRes.arrayBuffer());

        const outPath = path.join(PROJECT_ROOT, 'test-output', 'lora-comparison', act, `${roomId}-lora-${strength}.png`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        await sharp(raw).resize(960, 540, { fit: 'cover' }).png().toFile(outPath);
        console.log(`  ✓ ${roomId} @ LoRA ${strength} (${((Date.now() - start) / 1000 / 60).toFixed(1)}m)`);
        return;
    }
}

async function main() {
    console.log(`Generating ${MISSING.length} remaining LoRA test images (sequential, one at a time)\n`);
    for (const { act, roomId, strength } of MISSING) {
        const outPath = path.join(PROJECT_ROOT, 'test-output', 'lora-comparison', act, `${roomId}-lora-${strength}.png`);
        if (fs.existsSync(outPath)) { console.log(`  Skip ${roomId} @ ${strength} (exists)`); continue; }
        await generate(roomId, act, strength);
    }
    const total = fs.readdirSync(path.join(PROJECT_ROOT, 'test-output', 'lora-comparison', 'act1')).length
        + fs.readdirSync(path.join(PROJECT_ROOT, 'test-output', 'lora-comparison', 'act2')).length
        + fs.readdirSync(path.join(PROJECT_ROOT, 'test-output', 'lora-comparison', 'act3')).length;
    console.log(`\nDone! Total LoRA test images: ${total}/27`);
}

main().catch(err => { console.error(err); process.exit(1); });
