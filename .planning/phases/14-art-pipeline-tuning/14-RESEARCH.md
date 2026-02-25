# Phase 14: Art Pipeline Tuning - Research

**Researched:** 2026-02-21
**Domain:** Flux image generation resolution, LoRA calibration, sprite background removal
**Confidence:** HIGH

## Summary

Phase 14 addresses three critical gaps in the existing art pipeline built in Phase 9: (1) the workflow generates at 1024x1024 but needs 1024x576 for 16:9 backgrounds, requiring changes to both the ComfyUI workflow JSON and the ModelSamplingFlux node; (2) LoRA strength is set to a single value (0.8) but needs per-asset-type calibration with empirical testing; and (3) sprites are generated against white backgrounds with no background removal step, producing unusable assets when placed over game scenes.

The existing pipeline (`scripts/generate-art.ts`) is well-structured and needs surgical modifications rather than rewrites. The ComfyUI workflow (`scripts/comfyui-workflow.json`) has two nodes that specify resolution -- `EmptySD3LatentImage` (node 11) and `ModelSamplingFlux` (node 4) -- both currently set to 1024x1024. The `style-guide.json` already has separate prompt prefixes for backgrounds vs sprites vs items, providing the hook points for per-type LoRA strength values. The `processSprite()` function in the generate script already uses `ensureAlpha()` but does not perform actual background removal -- it only resizes with transparent padding.

**Primary recommendation:** Modify the workflow and generate script to support per-asset-type configurations (resolution, LoRA strength), add a background removal step for sprites using sharp's raw pixel manipulation (with `@imgly/background-removal-node` as a higher-quality alternative), and validate empirically with test generations across 3 rooms per act.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARTX-01 | Art generation workflow produces 16:9 images (1024x576) without composition-destroying crop | Workflow nodes 4 (ModelSamplingFlux) and 11 (EmptySD3LatentImage) must both change from 1024x1024 to 1024x576. Flux Dev supports non-square resolutions natively; 1024x576 is 0.59MP, well within the safe range. The generate script must inject these dimensions per asset type. |
| ARTX-02 | LoRA strength is calibrated per asset type (backgrounds vs sprites) with test generation on 3 rooms per act | style-guide.json currently has single `loraStrength: 0.8`. Must be expanded to per-type values. Starting estimates: backgrounds 0.65-0.8, sprites/items 0.8-1.0. Generate script must inject LoRA strength into workflow node 3 (LoraLoaderModelOnly) per entry. Empirical testing required with 9 test rooms (3 per act). |
| ARTX-04 | Sprite background removal produces clean alpha transparency for all item, NPC, and player sprites | Two approaches available: (1) sharp raw pixel manipulation replacing white/near-white pixels with alpha=0, or (2) ComfyUI RMBG node integrated into workflow. Sharp approach is simpler (no extra ComfyUI dependency) but produces halo artifacts at anti-aliased edges. RMBG/BiRefNet produces cleaner results but requires ComfyUI custom node installation. Recommended: dual approach -- sharp threshold for initial removal + edge defringe pass. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | ^0.34.5 | Post-processing: resize, background removal, alpha cleanup | Already installed as devDependency; raw pixel access for white-to-transparent conversion |
| ComfyUI | latest | Local Flux image generation | Already configured; REST API at http://127.0.0.1:8188 |
| Flux.1 Dev GGUF Q5 | latest | Base image model | Already downloaded per Phase 9 setup |
| Flux-2D-Game-Assets-LoRA | v1.0 | Pixel art style (trigger: GRPZA) | Already downloaded; proven to produce game assets |

### Supporting (new for this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @imgly/background-removal-node | ^1.3.0 | AI-powered background removal | If sharp threshold approach produces unacceptable halos on sprites; runs locally, no API key needed; AGPL license |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sharp raw pixel removal | @imgly/background-removal-node | imgly is higher quality (AI matting) but adds ~200MB model download and AGPL license; sharp is already installed, good enough for pixel art with clean white backgrounds |
| sharp raw pixel removal | ComfyUI RMBG node (BiRefNet) | Better quality but adds ComfyUI dependency to sprite pipeline, requires user to install custom node; keeps complexity in ComfyUI rather than build script |
| Flux-2D-Game-Assets-LoRA v1 | Flux-Game-Assets-LoRA-v2 | v2 uses trigger "wbgmsst" (not GRPZA), produces more 3D/isometric style; v1 is better suited for 2D pixel art which matches the game's aesthetic |

**Installation:**
```bash
# Only if sharp threshold approach is insufficient:
npm install -D @imgly/background-removal-node@^1.3.0
```

## Architecture Patterns

### Current Pipeline Flow (Phase 9)
```
art-manifest.json  -->  generate-art.ts  -->  ComfyUI API  -->  raw PNG
style-guide.json  -->        |                                    |
workflow.json     -->        |                                    v
                             +--------->  sharp resize  -->  final asset
```

### Updated Pipeline Flow (Phase 14)
```
art-manifest.json  -->  generate-art.ts  -->  ComfyUI API  -->  raw PNG
style-guide.json  -->        |                                    |
workflow.json     -->        |               (per-type config     |
                             |                injected here)      v
                             |                              [BACKGROUNDS]
                             |                              sharp resize(1024x576 -> 960x540)
                             |                              fit: cover (minimal crop)
                             |
                             |                              [SPRITES/ITEMS/NPCs]
                             |                              sharp bg removal (threshold)
                             |                              sharp edge defringe
                             |                              sharp resize(fit: contain, alpha bg)
                             +--------->  final asset
```

### Pattern 1: Per-Asset-Type Workflow Configuration
**What:** The generate script dynamically modifies multiple workflow nodes per asset type, not just prompt and seed.
**When to use:** When different asset types need different generation parameters (resolution, LoRA strength).
**Example:**
```typescript
// Source: Designed for this phase based on existing generate-art.ts structure
interface AssetTypeConfig {
    width: number;           // Latent image width
    height: number;          // Latent image height
    loraStrength: number;    // LoRA model strength
    guidance: number;        // FluxGuidance scale
    steps: number;           // BasicScheduler steps
}

const ASSET_CONFIGS: Record<string, AssetTypeConfig> = {
    background: {
        width: 1024, height: 576,    // 16:9 native generation
        loraStrength: 0.7, guidance: 3.5, steps: 20,
    },
    wideBackground: {
        width: 1024, height: 576,    // Same ratio, post-process to 1920x540
        loraStrength: 0.7, guidance: 3.5, steps: 20,
    },
    sprite: {
        width: 1024, height: 1024,   // Square for characters
        loraStrength: 0.85, guidance: 3.5, steps: 20,
    },
    item: {
        width: 512, height: 512,     // Smaller for tiny items
        loraStrength: 0.9, guidance: 3.5, steps: 20,
    },
};

function injectConfig(workflow: ComfyUIWorkflow, config: AssetTypeConfig): void {
    // EmptySD3LatentImage (node 11) - generation resolution
    workflow['11'].inputs.width = config.width;
    workflow['11'].inputs.height = config.height;
    // ModelSamplingFlux (node 4) - must match latent resolution
    workflow['4'].inputs.width = config.width;
    workflow['4'].inputs.height = config.height;
    // LoraLoaderModelOnly (node 3) - per-type LoRA strength
    workflow['3'].inputs.strength_model = config.loraStrength;
    // FluxGuidance (node 5) - guidance scale
    workflow['5'].inputs.guidance = config.guidance;
    // BasicScheduler (node 9) - step count
    workflow['9'].inputs.steps = config.steps;
}
```

### Pattern 2: White Background Removal via Sharp Raw Pixels
**What:** Convert white/near-white pixels to transparent using sharp's raw pixel buffer access.
**When to use:** For sprites generated against white backgrounds (the LoRA's standard output).
**Example:**
```typescript
// Source: sharp GitHub issue #1648 + sharp docs (sharp.pixelplumbing.com)
async function removeWhiteBackground(
    input: Buffer,
    threshold: number = 240  // RGB channels must ALL exceed this to be "white"
): Promise<Buffer> {
    const image = sharp(input).ensureAlpha();
    const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Iterate over RGBA pixel data
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // If pixel is near-white, make fully transparent
        if (r >= threshold && g >= threshold && b >= threshold) {
            data[i + 3] = 0; // Set alpha to 0
        }
    }

    return sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 }
    }).png().toBuffer();
}
```

### Pattern 3: Edge Defringe to Remove White Halos
**What:** After threshold-based background removal, semi-transparent edge pixels retain white color bleed. Defringing replaces edge pixel colors with nearby opaque pixel colors while preserving their alpha.
**When to use:** After white background removal produces visible white halos/fringe at sprite edges.
**Example:**
```typescript
// Source: Adapted from premultiplied alpha game dev patterns
async function defringeEdges(
    input: Buffer,
    width: number,
    height: number
): Promise<Buffer> {
    const { data } = await sharp(input)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const channels = 4;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * channels;
            const alpha = data[idx + 3];

            // Only process semi-transparent pixels (edge pixels)
            if (alpha > 0 && alpha < 255) {
                // Find nearest fully opaque neighbor
                let nearR = 0, nearG = 0, nearB = 0;
                let found = false;

                for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    const nIdx = (ny * width + nx) * channels;
                    if (data[nIdx + 3] === 255) {
                        nearR = data[nIdx];
                        nearG = data[nIdx + 1];
                        nearB = data[nIdx + 2];
                        found = true;
                        break;
                    }
                }

                if (found) {
                    // Replace color while preserving alpha
                    data[idx] = nearR;
                    data[idx + 1] = nearG;
                    data[idx + 2] = nearB;
                }
            }
        }
    }

    return sharp(data, {
        raw: { width, height, channels: 4 }
    }).png().toBuffer();
}
```

### Pattern 4: Style Guide Per-Type LoRA Configuration
**What:** Extend style-guide.json to hold per-asset-type LoRA strengths instead of a single global value.
**When to use:** When different asset types need different style intensities.
**Example:**
```json
{
    "loraStrength": {
        "background": 0.7,
        "wideBackground": 0.7,
        "sprite": 0.85,
        "item": 0.9,
        "npc": 0.85
    },
    "generationResolution": {
        "background": { "width": 1024, "height": 576 },
        "wideBackground": { "width": 1024, "height": 576 },
        "sprite": { "width": 1024, "height": 1024 },
        "item": { "width": 512, "height": 512 },
        "npc": { "width": 1024, "height": 1024 }
    }
}
```

### Anti-Patterns to Avoid
- **Generating backgrounds at 1024x1024 then cropping to 16:9:** This destroys 44% of vertical composition. The top and bottom of the scene are lost. Instead, generate at 1024x576 natively so Flux composes for the target aspect ratio.
- **Using `unflatten()` alone for background removal:** Sharp's `unflatten()` only converts exact white (255,255,255) pixels. Anti-aliased edges with near-white (e.g., 250,252,248) pixels remain opaque, creating visible halos. Use threshold-based raw pixel manipulation instead.
- **Single LoRA strength for all asset types:** Backgrounds need lower LoRA strength (0.65-0.75) to preserve scene composition while adding pixel art style. Items need higher strength (0.85-1.0) to enforce the clean game asset look against white backgrounds.
- **Modifying the workflow JSON file directly for different asset types:** The workflow JSON must remain a stable template. The generate script should deep-clone and inject per-type values at runtime.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| White background removal | Manual chroma-keying algorithm | Sharp raw pixel threshold + defringe | Pixel art has clean backgrounds; simple threshold works well; defringe handles the remaining edges |
| AI-quality background removal | Custom ML matting model | @imgly/background-removal-node OR ComfyUI RMBG | If threshold approach fails on complex sprites, use proven AI matting rather than building one |
| Resolution presets per aspect ratio | Custom resolution calculator | Hard-coded config per asset type | Only 4-5 asset types; not enough variety to need a calculator |
| LoRA strength sweep | Manual trial-and-error | Structured test matrix: 3 rooms x 3 acts x 3 strengths = 27 generations | Systematic testing is faster than ad-hoc; results go into a comparison grid |

**Key insight:** The pipeline changes are mostly configuration (workflow node values, style-guide.json structure) with one genuinely new capability (background removal). The generate script architecture from Phase 9 is solid and just needs per-type parameterization.

## Common Pitfalls

### Pitfall 1: ModelSamplingFlux Resolution Mismatch
**What goes wrong:** Generated images have distorted composition or artifacts because ModelSamplingFlux width/height doesn't match EmptySD3LatentImage width/height.
**Why it happens:** Both nodes specify resolution independently. ModelSamplingFlux uses it for shift calculations; EmptySD3LatentImage uses it for the actual latent tensor size. If they disagree, the sampling math is wrong.
**How to avoid:** Always update BOTH node 4 (ModelSamplingFlux) AND node 11 (EmptySD3LatentImage) together. The `injectConfig()` function must set both atomically.
**Warning signs:** Generated images look compositionally wrong, stretched, or have unexpected artifacts compared to 1024x1024 generations.

### Pitfall 2: White Halo Artifacts on Sprites
**What goes wrong:** After background removal, sprite edges show a visible white fringe/halo when rendered over dark game backgrounds.
**Why it happens:** Anti-aliasing blends the subject color with the white background during generation. Simple threshold removal makes the pure-white background transparent but leaves semi-transparent edge pixels that still contain white color data.
**How to avoid:** Apply edge defringe after threshold removal. For pixel art specifically, the threshold can be aggressive (240+) because pixel art has sharper edges than photorealistic images. The defringe pass replaces edge pixel RGB values with nearby opaque pixel colors.
**Warning signs:** Sprites look fine on white/light backgrounds but show obvious light outlines on dark backgrounds (cave, twilight scenes).

### Pitfall 3: LoRA Strength Too High for Backgrounds
**What goes wrong:** Background images lose scene composition and detail -- everything looks like generic pixel art tiles rather than a composed scene with depth and narrative elements.
**Why it happens:** High LoRA strength (0.9+) overrides the base model's scene understanding. The pixel art style dominates at the expense of the prompt's descriptive content.
**How to avoid:** Start backgrounds at 0.65 LoRA strength and increase in 0.05 increments. Test with a scene that has complex composition (e.g., throne_room with multiple elements). The sweet spot is where pixel art style is clear but scene elements are still recognizable.
**Warning signs:** All backgrounds look "samey" regardless of prompt content; loss of specific elements mentioned in prompts.

### Pitfall 4: Item Sprites Too Small for Flux to Render Detail
**What goes wrong:** 32x32 items generated at 512x512 or 1024x1024 have most of the canvas as white background with a tiny subject in the center that gets blurry when downscaled.
**Why it happens:** Flux generates at high resolution then the image is downscaled dramatically (1024px -> 32px = 32x reduction). The subject may not fill the frame.
**How to avoid:** Use strong prompt guidance ("centered, large, filling frame, close-up") for item prompts. Consider generating at 512x512 to reduce the downscale ratio. Sharp `resize` with `fit: 'contain'` preserves aspect ratio.
**Warning signs:** Items are tiny dots in the center of the generated image; items are blurry/unrecognizable at 32x32.

### Pitfall 5: Parallax Wide Backgrounds at Wrong Aspect Ratio
**What goes wrong:** Shared parallax layers (1920x540) are generated at 1024x576 and stretched to 1920x540, causing distortion.
**Why it happens:** 1920x540 is an extreme aspect ratio (3.56:1) that doesn't match any native Flux generation resolution well.
**How to avoid:** Generate at 1024x576 (16:9) and use sharp `resize(1920, 540, { fit: 'cover' })` which will crop the height slightly (540/576 = 6% crop) while stretching width. Alternatively, generate at 1024x288 (same 3.56:1 ratio) but this is below Flux's optimal resolution. The cover-crop approach with 16:9 is safer.
**Warning signs:** Parallax layers look horizontally stretched; sky textures are distorted.

### Pitfall 6: Not Validating Across All Three Acts
**What goes wrong:** Tuning works for forest (Act 1) scenes but cave (Act 2) or twilight (Act 3) scenes look bad.
**Why it happens:** Dark scenes (caves, twilight) interact differently with the LoRA -- pixel art style can make dark areas look flat or lose detail. White background removal threshold that works for bright sprites may fail on dark-themed NPCs.
**How to avoid:** Test matrix must include rooms from ALL three acts. Use forest_clearing (Act 1), crystal_chamber (Act 2), and petrified_forest (Act 3) as representative test rooms.
**Warning signs:** Cave scenes look muddy; twilight scenes lack the purple/gold palette; dark NPCs have incomplete background removal.

## Code Examples

### Current Workflow Nodes That Need Modification
```json
// Source: scripts/comfyui-workflow.json (current state)
// Node 4: ModelSamplingFlux -- MUST change width/height
"4": {
    "class_type": "ModelSamplingFlux",
    "inputs": {
        "model": ["3", 0],
        "max_shift": 1.15,
        "base_shift": 0.5,
        "width": 1024,      // CHANGE: per asset type
        "height": 1024       // CHANGE: 576 for backgrounds, 1024 for sprites
    }
}

// Node 11: EmptySD3LatentImage -- MUST change width/height (keep in sync with node 4)
"11": {
    "class_type": "EmptySD3LatentImage",
    "inputs": {
        "width": 1024,       // CHANGE: per asset type
        "height": 1024,      // CHANGE: 576 for backgrounds, 1024 for sprites
        "batch_size": 1
    }
}

// Node 3: LoraLoaderModelOnly -- strength_model varies per asset type
"3": {
    "class_type": "LoraLoaderModelOnly",
    "inputs": {
        "model": ["1", 0],
        "lora_name": "Flux-2D-Game-Assets-LoRA.safetensors",
        "strength_model": 0.8  // CHANGE: per asset type
    }
}
```

### Updated processSprite with Background Removal
```typescript
// Source: Designed for this phase
async function processSprite(
    input: Buffer,
    outputPath: string,
    width: number,
    height: number,
    bgThreshold: number = 240
): Promise<void> {
    const fullPath = path.resolve(PROJECT_ROOT, outputPath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });

    // Step 1: Remove white background via raw pixel threshold
    const withAlpha = sharp(input).ensureAlpha();
    const { data, info } = await withAlpha
        .raw()
        .toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
        if (data[i] >= bgThreshold &&
            data[i+1] >= bgThreshold &&
            data[i+2] >= bgThreshold) {
            data[i+3] = 0; // Transparent
        }
    }

    // Step 2: Defringe edges (replace semi-transparent white with neighbor colors)
    const channels = 4;
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * channels;
            const alpha = data[idx + 3];
            if (alpha > 0 && alpha < 200) {
                // Find nearest opaque neighbor
                for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height) continue;
                    const nIdx = (ny * info.width + nx) * channels;
                    if (data[nIdx + 3] >= 200) {
                        data[idx] = data[nIdx];
                        data[idx + 1] = data[nIdx + 1];
                        data[idx + 2] = data[nIdx + 2];
                        break;
                    }
                }
            }
        }
    }

    // Step 3: Resize to target dimensions
    await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 }
    })
        .resize(width, height, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(fullPath);
}
```

### Updated Style Guide Structure (Per-Type Config)
```json
{
    "loraStrength": {
        "background": 0.7,
        "wideBackground": 0.7,
        "sprite": 0.85,
        "item": 0.9,
        "npc": 0.85,
        "_note": "Starting estimates. Values tuned empirically in Phase 14."
    },
    "generationResolution": {
        "background": { "width": 1024, "height": 576 },
        "wideBackground": { "width": 1024, "height": 576 },
        "sprite": { "width": 1024, "height": 1024 },
        "item": { "width": 512, "height": 512 },
        "npc": { "width": 1024, "height": 1024 }
    },
    "backgroundRemoval": {
        "enabled": true,
        "threshold": 240,
        "defringe": true,
        "_note": "Applied to sprite, item, and npc categories only"
    }
}
```

### Test Matrix for LoRA Calibration
```typescript
// Source: Designed for this phase
// Test 3 rooms per act at 3 LoRA strengths = 27 background generations
const TEST_ROOMS = {
    act1: ['forest_clearing', 'throne_room', 'castle_garden'],
    act2: ['crystal_chamber', 'cavern_library', 'forge_chamber'],
    act3: ['petrified_forest', 'wizard_tower', 'rooftop'],
};

const LORA_STRENGTHS_TO_TEST = [0.6, 0.7, 0.8];

// Generate test grid:
// npx tsx scripts/generate-art.ts --test-lora
// Outputs: test-output/lora-{strength}-{room}.png
// Human reviews grid to pick best strength per act or globally
```

## State of the Art

| Old Approach (Phase 9) | New Approach (Phase 14) | When Changed | Impact |
|------------------------|------------------------|--------------|--------|
| Generate at 1024x1024, crop to 960x540 (44% loss) | Generate at 1024x576, resize to 960x540 (minimal crop) | Phase 14 | Backgrounds compose for 16:9; no subject cut-off |
| Single LoRA strength 0.8 for all assets | Per-type LoRA strength (bg: 0.7, sprites: 0.85, items: 0.9) | Phase 14 | Better balance between style and composition per asset type |
| No background removal (white backgrounds pass through) | Threshold + defringe removes white backgrounds cleanly | Phase 14 | Sprites render correctly over game scenes with no halos |
| Fixed workflow node values | Per-type dynamic injection of resolution, LoRA, guidance | Phase 14 | Single workflow template serves all asset types |

**Key change from Phase 9 assumptions:**
The Phase 9 research noted "Resolution: 1024x1024 (resize to 960x540 with sharp after)" as the approach. This was flagged as a known issue in the Phase 14 roadmap context: "Critical: Must generate at 1024x576 (not 1024x1024) to avoid 44% vertical crop." This is the most impactful fix in this phase.

## Open Questions

1. **Optimal Background Threshold for Pixel Art Sprites**
   - What we know: Pixel art generated by the GRPZA LoRA against white backgrounds should have cleaner edges than photorealistic content. The threshold for "white" can likely be aggressive (240+).
   - What's unclear: Whether the LoRA produces perfectly clean white backgrounds or introduces subtle gradients/noise near edges. Only empirical testing can confirm.
   - Recommendation: Start at threshold 240, test on 3 representative sprites (one bright, one dark, one with fine detail). Adjust down if halos persist, up if too much subject is removed.

2. **LoRA Strength Sweet Spot per Asset Type**
   - What we know: The HuggingFace page for GRPZA doesn't specify recommended strength. Community consensus for style LoRAs on Flux is 0.7-1.0. Lower = more base model influence (better composition), higher = more style influence (more pixel-art-like).
   - What's unclear: The exact values that balance composition vs style for this specific LoRA with these specific prompts.
   - Recommendation: Generate a 3x9 test grid (3 strengths x 9 rooms). Visual comparison will reveal the sweet spot. Values should be documented in style-guide.json for Phase 15 batch generation.

3. **Player Spritesheet Generation Strategy**
   - What we know: The player sprite is a 768x64 spritesheet (16 frames of 48x64). Flux cannot generate a multi-frame spritesheet with precise frame alignment.
   - What's unclear: Whether to generate individual frames and assemble, or generate a single image and hope for alignment, or hand-edit after generation.
   - Recommendation: Generate individual character poses (idle, walk frames, interact) as separate 1024x1024 images, then assemble into a spritesheet with sharp. This gives the most control and is the established approach for AI-generated spritesheets. This is complex enough to defer to Phase 15 if Phase 14 scope is tight.

4. **Whether to Generate Items at 512x512 or 1024x1024**
   - What we know: Items are tiny (32x32 final). Generating at 1024x1024 wastes compute and the subject may not fill the frame. 512x512 is half the compute and may produce better-centered items.
   - What's unclear: Whether Flux Dev GGUF at 512x512 produces acceptable quality, or whether it's below the model's optimal resolution range.
   - Recommendation: Test both 512x512 and 1024x1024 for a few items. If 512x512 quality is acceptable, use it for all items to halve generation time.

## Sources

### Primary (HIGH confidence)
- [Flux Dev resolution support](https://blog.segmind.com/image-resolutions-with-flux-1-dev-model-compared/) - 1024x576 confirmed as valid 16:9 resolution within safe range (0.59MP)
- [EmptySD3LatentImage node docs](https://comfyui.dev/docs/guides/Nodes/emptysd3latentimage/) - Width/height range 16-16384, supports non-square
- [ModelSamplingFlux node docs](https://comfyui.dev/docs/guides/nodes/modelsamplingflux/) - Width/height must match latent image resolution for correct shift calculations
- [Sharp raw pixel manipulation](https://github.com/lovell/sharp/issues/1648) - Official recommendation for white-to-transparent: use raw() + loop + selective alpha
- [Sharp unflatten() docs](https://sharp.pixelplumbing.com/api-operation/) - Converts white pixels to transparent; experimental; no threshold parameter
- [Sharp operations API](https://sharp.pixelplumbing.com/api-operation/) - threshold(), unflatten(), boolean() documented
- [Flux-2D-Game-Assets-LoRA](https://huggingface.co/gokaygokay/Flux-2D-Game-Assets-LoRA) - Trigger: GRPZA; prompt format: "GRPZA, <prompt>, white background, game asset"
- Existing codebase: `scripts/generate-art.ts`, `scripts/comfyui-workflow.json`, `scripts/style-guide.json`, `scripts/art-manifest.json` (all read directly)

### Secondary (MEDIUM confidence)
- [ComfyUI-RMBG](https://github.com/1038lab/ComfyUI-RMBG) - Background removal node supporting RMBG-2.0, BiRefNet, BEN2; alternative to sharp-based removal
- [@imgly/background-removal-node](https://www.npmjs.com/package/@imgly/background-removal-node) - AI background removal for Node.js; local processing; AGPL license
- [Premultiplied alpha and white halos](https://www.adriancourreges.com/blog/2017/05/09/beware-of-transparent-pixels/) - Explains why white halo artifacts occur and defringe as solution
- [Flux resolution quality](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/32) - Flux handles non-square resolutions at same quality level
- [LoRA strength recommendations](https://blog.segmind.com/flux1-fine-tuning-best-practices/) - Style LoRAs: 0.7-1.0; lower blends with base model

### Tertiary (LOW confidence)
- [Flux-Game-Assets-LoRA-v2](https://huggingface.co/gokaygokay/Flux-Game-Assets-LoRA-v2) - Different trigger ("wbgmsst"), more 3D/isometric style; NOT recommended for this project's 2D pixel art aesthetic; documented for reference only
- Starting LoRA strength estimates (bg: 0.7, sprites: 0.85) are educated guesses needing empirical validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools already installed and proven from Phase 9; no new major dependencies
- Architecture (workflow modification): HIGH - node IDs verified from existing workflow JSON; parameter injection pattern proven in generate-art.ts
- Architecture (background removal): MEDIUM - sharp threshold approach is well-documented but defringe quality on actual Flux output needs empirical validation
- LoRA calibration values: LOW - no authoritative source for optimal values; must be empirically determined
- Pitfalls: HIGH - identified from direct codebase analysis, documentation, and established game dev patterns

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain; sharp API and ComfyUI workflow format unlikely to change)
