# Technology Stack: Flux Art Generation & Visual Effects

**Project:** Uncrowned (v3.0 Art & VFX)
**Researched:** 2026-02-21
**Scope:** Stack additions for Flux art generation tuning (LoRA, prompt engineering, batch generation) and Phaser 3 visual effects (transitions, lighting, weather, particles). Does NOT re-research existing validated stack.

## Existing Stack (Validated, DO NOT Change)

| Technology | Version | Status |
|------------|---------|--------|
| Phaser | 3.90.0 | Locked |
| TypeScript | ~5.7.2 | Locked |
| Vite | ^6.3.1 | Locked |
| sharp | ^0.34.5 | Locked (devDep) |
| ComfyUI | Desktop/latest | Locked |
| Flux.1 Dev GGUF Q5 | latest | Locked |
| Flux-2D-Game-Assets-LoRA | v1.0 | Locked (GRPZA trigger) |
| generate-art.ts | existing | Locked (pipeline script) |

## Recommended Stack

### A. Flux Art Generation Tuning (Build-Time)

No new npm dependencies. All improvements are to the existing `scripts/generate-art.ts` pipeline, `style-guide.json` prompt templates, and ComfyUI workflow configuration.

#### A1. ComfyUI Custom Nodes (Install via ComfyUI Manager)

| Custom Node | Purpose | Why |
|-------------|---------|-----|
| ComfyUI-GGUF (city96) | GGUF model loading | Already installed. Required for Flux Dev Q5 quantized model. |
| ComfyUI-KJNodes | Batch image grid, concatenation, metadata | Useful for generating comparison grids when tuning LoRA strength and prompt variations. Batch preview saves time vs individual image inspection. |
| ComfyUI Impact Pack | Detail enhancement, upscaling hooks | Provides `FaceDetailer`-style refinement nodes that can sharpen pixel art details post-generation. Optional but valuable for sprite cleanup. |

**Confidence:** MEDIUM -- Recommendations based on training data knowledge of ComfyUI ecosystem. Verify availability in ComfyUI Manager before installing.

#### A2. LoRA Strategy

**Recommendation: Use Flux-2D-Game-Assets-LoRA as primary, do NOT train a custom LoRA unless style consistency fails after testing.**

| Parameter | Current Value | Recommended Tuning Range | Why |
|-----------|---------------|--------------------------|-----|
| LoRA strength | 0.8 | 0.6-0.9 | Lower strength (0.6-0.7) for backgrounds where you want more photorealistic detail blended with pixel style. Higher (0.8-0.9) for sprites/items where crisp pixel art is essential. |
| Guidance scale | 3.5 | 3.0-4.5 | Flux Dev performs best at 3.0-4.0. Higher values increase prompt adherence but can introduce artifacts. 3.5 is the sweet spot for most scenes. |
| Steps | 20 | 20-30 | 20 is sufficient for most images. Increase to 25-30 for complex scenes (throne room, crystal chamber) that need more detail convergence. |
| Sampler | euler | euler | Do not change. Euler is the recommended sampler for Flux models. |
| Scheduler | simple | simple | Do not change. Simple scheduler works best with Flux. |
| Generation resolution | 1024x1024 | 1024x576 for backgrounds | Flux supports non-square aspect ratios. Generating at 1024x576 (close to 16:9) avoids the need to aggressively crop a square image to 960x540, preserving more of the composition. For wide rooms, generate at 1024x576 and stitch two generations. |

**LoRA Strength Per Asset Type (Recommended):**

```json
{
  "backgrounds": 0.65,
  "sprites": 0.85,
  "items": 0.90,
  "npcs": 0.80,
  "sharedLayers": 0.60
}
```

Rationale: Backgrounds benefit from some "naturalistic" detail that lower LoRA strength preserves. Sprites and items need crisp, clean pixel art edges that higher LoRA strength enforces.

**Confidence:** MEDIUM -- LoRA strength tuning is subjective and depends on the specific images generated. These are starting points for a tuning grid search. Will need phase-specific testing.

#### A3. Prompt Engineering Improvements

The existing `style-guide.json` prompt templates are a solid foundation. Recommended additions:

| Improvement | What | Why |
|-------------|------|-----|
| Negative prompt via node | Add a second CLIPTextEncode for negative conditioning | Flux Dev supports negative prompts via a separate conditioning input to the guider. Use to suppress "blurry, photographic, 3D render, realistic" which helps maintain pixel art consistency. |
| Per-act color tokens | Add explicit color hex codes to act palette prompts | "Warm greens" is ambiguous. "#4c8744 forest green, #c8a030 amber gold" gives Flux more precise color guidance. Test both approaches. |
| Resolution-aware prompts | Adjust prompt detail based on output dimensions | Wide backgrounds (1920x540) need "panoramic, wide landscape" in prompt. Small items (64x64) need "icon, centered, minimal detail" to avoid overcomplication. |
| Composition keywords | Add "side-scrolling perspective, ground level camera, flat horizon" | Prevents Flux from generating top-down or 3/4 perspective views that don't match the game's side-scrolling layout. |

**Updated Prompt Template Structure:**

```json
{
  "promptPrefix": "GRPZA, pixel art game background, 2D side-scrolling adventure game, ground level perspective, flat horizon,",
  "promptSuffix": ", detailed pixel art, retro game aesthetic, clean lines, vibrant colors",
  "negativePrompt": "blurry, photographic, 3D render, realistic, photograph, depth of field, modern, UI elements, text, watermark",
  "spritePromptPrefix": "GRPZA, pixel art game sprite, 2D character, front-facing,",
  "spritePromptSuffix": ", white background, game asset, clean pixel art, transparent background ready, centered"
}
```

**Workflow Change Required for Negative Prompt:**

Add a second `CLIPTextEncode` node connected to a `FluxGuidance` node with negative conditioning. The existing workflow uses a `BasicGuider` which only takes positive conditioning. To add negative prompts with Flux:

1. Keep the existing `CLIPTextEncode` (node 6) for positive prompt
2. Add a new `CLIPTextEncode` for negative prompt
3. Use `CFGGuider` instead of `BasicGuider` to accept both positive and negative conditioning

**Important caveat:** Flux Dev's architecture handles negative prompts differently than SD1.5/SDXL. The effect is subtler. Some community reports suggest negative prompts have minimal effect on Flux. Test before relying on this.

**Confidence:** LOW for negative prompts with Flux -- community consensus is mixed. Test empirically.

#### A4. Batch Generation Improvements

Enhancements to the existing `generate-art.ts` script:

| Feature | Implementation | Why |
|---------|---------------|-----|
| Per-asset-type LoRA strength | Read from `style-guide.json`, inject into workflow node 3 `strength_model` per entry | Backgrounds and sprites need different LoRA strengths for best results. |
| Aspect-ratio-aware generation | Set `EmptySD3LatentImage` width/height based on target aspect ratio | Generate 1024x576 for 16:9 backgrounds instead of cropping from 1024x1024. Less wasted composition. |
| Comparison grid mode | `--grid` flag: generate 4 variants (different LoRA strengths) side by side | Enables rapid visual comparison during tuning. Use sharp to composite 4 images into a 2x2 grid PNG. |
| Resume on failure | Track completed entries in a `.art-progress.json` file | If generation fails mid-batch (ComfyUI crash, timeout), resume from last completed entry instead of re-generating everything. |
| Parallel generation | Queue multiple prompts to ComfyUI (it handles internal queueing) | ComfyUI accepts multiple prompt submissions and queues them. Submit all at once, poll all in parallel. Can reduce wall-clock time for batch runs. |
| WebP output | `--webp` flag for smaller file sizes in production | sharp converts PNG to WebP at quality 85. Can reduce background file sizes by 40-60%. Room JSONs stay referencing PNG keys; Preloader can check for WebP availability. |

**New script flags:**

```bash
npx tsx scripts/generate-art.ts --type backgrounds --room forest_clearing  # Existing
npx tsx scripts/generate-art.ts --type all --force                         # Existing
npx tsx scripts/generate-art.ts --grid --room forest_clearing              # NEW: 4-variant grid
npx tsx scripts/generate-art.ts --type all --resume                        # NEW: resume from progress
npx tsx scripts/generate-art.ts --type all --webp                          # NEW: also output WebP
npx tsx scripts/generate-art.ts --type backgrounds --aspect 16:9           # NEW: non-square generation
```

**Confidence:** HIGH -- These are straightforward script improvements using existing sharp and ComfyUI APIs.

### B. Phaser 3 Visual Effects (Runtime)

**Critical constraint:** The game uses `render: { pixelArt: true }` which sets `antialias: false` and `roundPixels: true`. This is compatible with Phaser's FX pipeline (added in 3.60, mature in 3.90) but FX effects will render with nearest-neighbor sampling. This is actually desirable for a pixel art game -- effects like Glow and Bloom will have a chunky, retro appearance that fits the aesthetic.

**No new npm dependencies.** All visual effects use Phaser 3.90's built-in systems.

#### B1. Scene Transitions (Enhanced)

The existing `SceneTransition.ts` has fade and slide transitions. Enhance with Phaser's camera effects and FX pipeline.

| Effect | Phaser API | Usage |
|--------|-----------|-------|
| Fade to black | `camera.fadeOut()` / `camera.fadeIn()` | Already implemented. Keep as default. |
| Slide pan | `tweens.add({ targets: camera, scrollX })` | Already implemented. Keep for horizontal exits. |
| Wipe transition | `camera.postFX.addWipe()` | Cinematic wipe for act transitions (Act 1->2, 2->3). The Wipe FX does a directional reveal. Apply to the camera's postFX. |
| Flash | `camera.flash(duration, r, g, b)` | Use for dramatic moments (death, magic events). Built-in camera effect. |
| Shake | `camera.shake(duration, intensity)` | Use for impact moments (cave-in, explosion, troll stomp). Built-in camera effect. |
| Zoom | `camera.zoomTo(zoom, duration)` | Use for dramatic reveals (entering throne room, seeing the curse for first time). Built-in camera effect. |

**Implementation pattern for Wipe transition:**

```typescript
// In SceneTransition.ts -- add new method
static wipeToRoom(
    scene: Phaser.Scene,
    roomId: string,
    spawnPoint: { x: number; y: number },
    direction: 'left' | 'right' | 'up' | 'down' = 'left',
    duration: number = 1000
): void {
    scene.input.enabled = false;
    const wipe = scene.cameras.main.postFX.addWipe(0, 0, 0);

    scene.tweens.add({
        targets: wipe,
        progress: 1,
        duration,
        onComplete: () => {
            scene.scene.start('RoomScene', { roomId, spawnPoint });
        },
    });
}
```

**Confidence:** HIGH -- Camera effects (fade, flash, shake, zoom) are core Phaser features verified in source. PostFX.addWipe() verified in Phaser 3.90 FX source code (Wipe.js, since 3.60.0).

#### B2. Lighting System

Phaser 3.90 includes a built-in `Light2D` WebGL pipeline and `LightsPlugin` (verified in source: `src/gameobjects/lights/`).

| Component | Phaser API | Usage |
|-----------|-----------|-------|
| LightsPlugin | `this.lights.enable()` | Scene-level lights manager. Enable per-scene. |
| Point light | `this.lights.addLight(x, y, radius, color, intensity)` | Torches, crystals, magic effects. Each light has position, radius, color, intensity. |
| Ambient light | `this.lights.setAmbientColor(color)` | Controls overall scene brightness/tint. Use dark ambient (0x333355) for caves, warm (0xffeedd) for forest. |
| Light2D pipeline | `sprite.setPipeline('Light2D')` | Game objects must opt-in to light interaction. Apply to background layers and player sprite. |
| Dynamic lights | Tween light properties | Animate light intensity/radius for flickering torches, pulsing crystals. |

**Important limitations:**
- Light2D pipeline only works with **WebGL renderer** (not Canvas). Phaser.AUTO will use WebGL when available, which covers 98%+ of browsers. Fall back gracefully to no lighting on Canvas.
- Light2D does NOT work with `Graphics` or `Shape` game objects -- only sprites/images/tilemaps.
- Each scene has a max of **10 lights** by default (configurable via `maxLights` in LightsManager). This is sufficient for our room-based approach.
- Light2D requires normal maps for realistic lighting. Without normal maps, lights create a flat brightness gradient. For pixel art, flat gradients are acceptable and even desirable -- they create a mood without implying 3D depth.

**Per-Act Ambient Lighting:**

```typescript
const ACT_AMBIENT: Record<string, number> = {
    act1: 0xddccaa,  // Warm forest daylight
    act2: 0x334466,  // Dark cave with blue tint
    act3: 0x553366,  // Twilight purple
};
```

**Data-driven approach:** Add optional `lighting` field to room JSON:

```typescript
// Extend RoomData interface
interface RoomLighting {
    ambient?: number;          // Hex color for ambient light
    lights?: Array<{
        x: number;
        y: number;
        radius: number;
        color: number;
        intensity: number;
        flicker?: boolean;     // Enable intensity tween
    }>;
}
```

**Confidence:** HIGH -- LightsPlugin verified in Phaser 3.90 source code. API usage pattern confirmed from source comments. Normal map requirement is a known Phaser characteristic.

#### B3. Particle System (Weather & Atmospheric Effects)

Phaser 3.90's `ParticleEmitter` (verified in source) is a full-featured GPU-accelerated particle system. Use for weather, ambient atmosphere, and magic effects.

| Effect | Configuration | Rooms |
|--------|---------------|-------|
| Rain | Vertical particles from top edge, gray-blue tint, fast speed, high quantity | petrified_forest, castle_courtyard_act3 |
| Snow / Ash | Slow-falling particles with horizontal drift, white/gray | rooftop, wizard_tower |
| Dust motes | Slow-drifting particles with alpha fade, warm tint | forest rooms, castle rooms |
| Fireflies | Small yellow particles with sine-wave movement, glow | forest_clearing, forest_bridge |
| Crystal sparkle | Random spawn within crystal zones, blue-teal tint, short lifespan | crystal_chamber, cavern rooms |
| Waterfall spray | Emission from edge zone, upward then falling arc | underground_river, underground_pool |
| Magical aurora | Large slow particles with color interpolation, high alpha | throne_room_act3, mirror_hall |
| Petrification mist | Ground-hugging particles with gray tint, slow drift | petrified_forest, act3 rooms |
| Torch embers | Upward-drifting particles near light sources, orange-red | cave rooms, dungeon |

**Particle creation pattern:**

```typescript
// Weather system factory
class WeatherSystem {
    static createRain(scene: Phaser.Scene): Phaser.GameObjects.Particles.ParticleEmitter {
        // Use a small white pixel as particle texture (1x1 or 2x1)
        return scene.add.particles(0, 0, 'particle-pixel', {
            x: { min: 0, max: 960 },
            y: -10,
            speedY: { min: 300, max: 500 },
            speedX: { min: -20, max: -40 },  // Slight wind
            lifespan: 1500,
            quantity: 3,
            frequency: 50,
            alpha: { start: 0.6, end: 0.2 },
            scaleX: 0.5,
            scaleY: 2,                        // Elongated for rain streaks
            tint: 0x8888cc,
            blendMode: Phaser.BlendModes.ADD,
        }).setDepth(50);                      // Above backgrounds, below UI
    }

    static createDustMotes(scene: Phaser.Scene): Phaser.GameObjects.Particles.ParticleEmitter {
        return scene.add.particles(0, 0, 'particle-pixel', {
            x: { min: 0, max: 960 },
            y: { min: 100, max: 400 },
            speedX: { min: -5, max: 5 },
            speedY: { min: -3, max: 3 },
            lifespan: 5000,
            quantity: 1,
            frequency: 500,
            alpha: { start: 0, end: 0.3, ease: 'Sine.easeInOut' },
            scale: { min: 0.5, max: 1.5 },
            tint: 0xffffdd,
            blendMode: Phaser.BlendModes.ADD,
        }).setDepth(10);
    }
}
```

**Particle texture:** Create a 2x2 white pixel PNG (`particle-pixel.png`) and load it in the Preloader. All particles use this single texture with tint/scale/alpha variations. This avoids loading separate particle textures and keeps the pixel art aesthetic.

**Data-driven approach:** Add optional `effects` field to room JSON:

```typescript
interface RoomEffects {
    particles?: Array<{
        type: 'rain' | 'snow' | 'dust' | 'fireflies' | 'sparkle' | 'spray' | 'mist' | 'embers';
        config?: Partial<Phaser.Types.GameObjects.Particles.ParticleEmitterConfig>;
    }>;
    weather?: 'clear' | 'rain' | 'storm' | 'snow' | 'mist';
}
```

**Confidence:** HIGH -- ParticleEmitter API verified in Phaser 3.90 source code. Configuration properties confirmed from `configFastMap` and `configOpMap` arrays in source.

#### B4. PostFX Effects (Per-Game-Object and Per-Camera)

Phaser 3.90 includes 15 built-in FX effects (verified from `src/fx/`). Available on any game object via `gameObject.preFX` / `gameObject.postFX` and on cameras via `camera.postFX`.

**Useful effects for this game:**

| Effect | API | Usage | When |
|--------|-----|-------|------|
| Vignette | `camera.postFX.addVignette(0.5, 0.5, 0.3)` | Darken screen edges for mood | Cave rooms, dungeon, dramatic moments |
| Glow | `sprite.postFX.addGlow(color, distance, quality)` | Magic items, crystal highlights | Magic objects, puzzle solution feedback |
| ColorMatrix | `camera.postFX.addColorMatrix().desaturate()` | Desaturation for petrification effect | Act 3 rooms (progressive stone curse) |
| Bloom | `camera.postFX.addBloom()` | Ethereal glow for magic scenes | Crystal chamber, wizard tower, ending scenes |
| Shine | `sprite.postFX.addShine()` | Animated shimmer on treasures/items | Treasury room, magic items |
| Pixelate | `camera.postFX.addPixelate(amount)` | Dramatic zoom-in/transition effect | Animate from high pixelation to low on room entry |
| Gradient | `camera.postFX.addGradient()` | Color overlay for time-of-day mood | Dawn/dusk tint on outdoor rooms |
| Wipe | `camera.postFX.addWipe()` | Scene transition reveal | Act transitions |
| Displacement | `sprite.postFX.addDisplacement()` | Water reflection distortion | Underground river, underground pool |

**Critical note on FX pipeline and pixelArt mode:**

The FX pipeline (added in Phaser 3.60) works through WebGL framebuffer operations. With `pixelArt: true`, textures use `NEAREST` filtering. The FX shader operations (blur, bloom, glow) render into framebuffers that also use `NEAREST` filtering. This means:

- Blur/Bloom effects will have a blocky, stepped appearance rather than smooth gradients
- This is actually **desirable** for pixel art -- it maintains the aesthetic
- If smooth FX are needed for specific elements, those elements can set `texture.setFilter(Phaser.Textures.LINEAR)` individually
- Camera-level PostFX applies to the entire rendered frame, so it respects the pixel art rendering

**Confidence:** HIGH -- FX effects verified in Phaser 3.90 source code (all since 3.60.0). preFX/postFX API confirmed from source comments.

#### B5. Tween-Based Visual Effects

Many visual effects are best achieved with Phaser's tween system rather than dedicated FX, keeping things simple and performant.

| Effect | Implementation | Usage |
|--------|---------------|-------|
| Torch flicker | Tween light intensity between 0.8-1.2 with yoyo | Cave and dungeon rooms |
| Crystal pulse | Tween sprite alpha/scale with sine ease | Crystal chamber, magic items |
| Screen shake | `camera.shake(duration, intensity)` | Death events, cave-in, dramatic moments |
| Color shift | Tween ambient light color | Curse progression, time passage |
| Floating objects | Tween sprite y with sine ease, yoyo | Magic objects, ghosts |
| Breathing NPC | Tween sprite scaleY between 1.0-1.02, yoyo repeat -1 | All NPCs for subtle life |

**Implementation is trivial -- all use existing `scene.tweens.add()`:**

```typescript
// Torch flicker on a light object
scene.tweens.add({
    targets: torchLight,
    intensity: { from: 0.8, to: 1.2 },
    duration: 200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});
```

**Confidence:** HIGH -- Tweens are core Phaser and already used extensively in the codebase (Player movement, SceneTransition, DeathScene).

### C. Room Effects Data Schema Extension

To make visual effects data-driven (consistent with the existing room JSON approach), extend the `RoomData` interface:

```typescript
// Additions to RoomData interface in src/game/types/RoomData.ts
interface RoomData {
    // ... existing fields ...

    /** Visual effects configuration for this room */
    effects?: {
        /** Ambient light color (hex). Defaults to act-specific ambient. */
        ambient?: number;
        /** Point lights in the room */
        lights?: Array<{
            x: number;
            y: number;
            radius: number;
            color: number;
            intensity: number;
            flicker?: boolean;
        }>;
        /** Particle effects active in this room */
        particles?: Array<{
            type: string;  // Maps to WeatherSystem factory method
        }>;
        /** Camera PostFX to apply */
        postFX?: {
            vignette?: { radius?: number; strength?: number };
            colorMatrix?: { effect: 'desaturate' | 'sepia' | 'night' };
            bloom?: { strength?: number };
            gradient?: { color1: number; color2: number; alpha?: number };
        };
    };
}
```

**No new dependencies.** This is a pure TypeScript interface extension with corresponding rendering code in RoomScene.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Pixel art LoRA | Flux-2D-Game-Assets-LoRA (existing) | Training custom LoRA | Custom LoRA requires: 20-50 curated training images, dreambooth/kohya training setup, GPU time, ML expertise. Start with existing LoRA; only train custom if style consistency fails after prompt tuning. Risk of overfitting with small training sets. |
| Pixel art LoRA | Flux-2D-Game-Assets-LoRA (existing) | Retro-Pixel-Flux-LoRA | Retro-Pixel is marked "still in training, not final version" on HuggingFace. The Game-Assets LoRA is a v1.0 release with Apache 2.0 license. |
| Scene transitions | Phaser built-in camera effects + PostFX | phaser3-rex-plugins TransitionImagePack | Rex plugin adds 30+ transition types but it is 150KB+ and most transitions are inappropriate for a pixel art adventure game. The 5-6 built-in effects (fade, wipe, flash, shake, zoom, slide) cover all needed cases. |
| Particle effects | Phaser built-in ParticleEmitter | Third-party particle editor (Particle Storm, etc.) | Phaser 3's built-in particle system is mature (since 3.0, major rewrite in 3.60). Configuration is JSON-serializable. No need for external tools when effects are simple weather/atmosphere particles. |
| Lighting | Phaser built-in Light2D pipeline | Custom WebGL shaders | Light2D provides point lights with color/intensity/radius. This covers all needed effects (torches, crystals, ambient). Custom shaders would be needed for normal-mapped lighting (which pixel art does not need) or volumetric effects (overkill for 2D). |
| Lighting | Phaser built-in Light2D | phaser3-rex-plugins GlowFilter | Rex GlowFilter is a per-object effect. Phaser's built-in `postFX.addGlow()` does the same thing since 3.60 without the plugin dependency. |
| Weather effects | Particle-based (rain drops, snow flakes) | Pre-rendered weather overlay sprites | Particles are more dynamic, respond to camera movement, and use a single 2x2 texture. Pre-rendered overlays would need multiple large PNGs and look static. |
| Color grading | Phaser PostFX ColorMatrix + Gradient | LUT textures | ColorMatrix provides desaturate, sepia, night, brightness, contrast. Combined with Gradient overlay, this covers all mood/atmosphere needs. LUT textures add complexity (loading, applying) without benefit for the simple color shifts needed. |
| Image upscaling | sharp resize (existing) | AI upscaling (ESRGAN, Real-ESRGAN) | Flux generates at 1024x1024 which is higher resolution than the target 960x540. We are downscaling, not upscaling. AI upscaling adds complexity and is unnecessary. |
| Batch workflow | Enhanced generate-art.ts | ComfyUI batch node workflows | Keeping generation logic in the TypeScript script (rather than ComfyUI batch nodes) means the logic is version-controlled, testable, and readable by any developer. ComfyUI batch nodes are visual-only and harder to review. |

## What NOT to Add

| Avoid | Why | What to Do Instead |
|-------|-----|-------------------|
| phaser3-rex-plugins (any) | Zero Rex plugins used in v1.0 or v2.0. Every needed effect is available in Phaser 3.90 built-in. Adding Rex would introduce a 200KB+ dependency for features we already have. | Use Phaser built-in: ParticleEmitter, LightsPlugin, PostFX, Camera effects. |
| Custom WebGL shaders | The game uses `Phaser.AUTO` which handles WebGL/Canvas fallback. Custom shaders would only work in WebGL, break Canvas fallback, and require WebGL expertise to maintain. | Use Phaser's PostFX pipeline which abstracts shader management. |
| Spine / DragonBones animation | The game uses static pixel art sprites with tween-based animation. Skeletal animation systems are for complex character animation with many bones. Overkill and wrong aesthetic. | Continue with spritesheet frames + Phaser tweens. |
| GSAP or anime.js | Phaser's built-in tween system handles all animation needs. Adding an external tween library creates conflicts with Phaser's update loop and adds bundle size. | Use `scene.tweens.add()` and `scene.tweens.chain()`. |
| PixiJS plugins | Phaser uses its own renderer (with Pixi roots but diverged since 3.0). PixiJS plugins are incompatible. | Use Phaser-native solutions only. |
| kohya_ss / LoRA training tool | Only needed if Flux-2D-Game-Assets-LoRA proves inadequate. Defer until testing confirms the need. Training a LoRA requires significant setup (Python env, CUDA, training data curation). | Test existing LoRA first. Flag for later if style consistency fails. |
| Normal map generators | Normal maps enable realistic per-pixel lighting in Light2D. For pixel art, flat lighting gradients are preferable -- they create mood without breaking the 2D aesthetic. Normal maps would make the game look like a 3D-lit 2D game (e.g., Dead Cells), which is a different art style. | Use Light2D without normal maps. Accept flat gradient lighting. |

## Installation

```bash
# No new npm dependencies needed.
# All visual effects use Phaser 3.90 built-ins.
# Art generation tuning modifies existing files only.

# ComfyUI custom nodes (install via ComfyUI Manager UI):
# - ComfyUI-GGUF (already installed)
# - ComfyUI-KJNodes (optional, for comparison grids)
```

## Game Config Changes

The current `Phaser.Game` config needs no changes for basic effects. For Light2D support, no config change is needed -- lights are enabled per-scene via `this.lights.enable()`.

However, if Canvas fallback is a concern, effects code should check the renderer:

```typescript
// In RoomScene, check if WebGL is available for effects
const isWebGL = this.sys.game.renderer.type === Phaser.WEBGL;

if (isWebGL) {
    // Apply PostFX, Light2D, etc.
    this.lights.enable();
    this.cameras.main.postFX.addVignette(0.5, 0.5, 0.3);
} else {
    // Canvas renderer: skip PostFX and lighting
    // Game still works, just without visual flourishes
}
```

## Version Compatibility Matrix

| Feature | Minimum Phaser Version | Current (3.90) | Notes |
|---------|----------------------|----------------|-------|
| ParticleEmitter (new API) | 3.60.0 | Yes | Rewritten in 3.60. Old `ParticleEmitterManager` removed. |
| PostFX pipeline | 3.60.0 | Yes | All 15 FX available since 3.60. |
| Light2D pipeline | 3.0.0 | Yes | Available since initial Phaser 3 release. |
| Camera effects (fade, flash, shake, zoom) | 3.0.0 | Yes | Core feature since Phaser 3 launch. |
| Wipe FX | 3.60.0 | Yes | Part of PostFX pipeline addition. |
| preFX / postFX per-object | 3.60.0 | Yes | Added with PostFX pipeline. |

## Hardware Notes (Art Generation Only)

| Optimization | Impact | Implementation |
|-------------|--------|----------------|
| Generate at 1024x576 instead of 1024x1024 | ~35% faster per image (fewer pixels to denoise) | Update EmptySD3LatentImage node dimensions in workflow |
| Queue batch prompts | ComfyUI processes queue sequentially but avoids per-prompt REST overhead | Submit all prompts, then poll all at once |
| Use Q4 for test runs, Q5 for final | Q4 is ~20% faster with slightly lower quality | Swap GGUF model filename in workflow for test vs final runs |
| Separate test and final seeds | Faster iteration on prompt wording | Use seed offset (e.g., seed + 900000) for test variants |

## Sources

### Primary (HIGH confidence -- verified from source code)
- Phaser 3.90.0 source: `node_modules/phaser/src/fx/` -- 15 FX effects confirmed (Barrel, Bloom, Blur, Bokeh, Circle, ColorMatrix, Displacement, Glow, Gradient, Pixelate, Shadow, Shine, Vignette, Wipe)
- Phaser 3.90.0 source: `node_modules/phaser/src/gameobjects/particles/ParticleEmitter.js` -- Full particle configuration API confirmed
- Phaser 3.90.0 source: `node_modules/phaser/src/gameobjects/lights/LightsPlugin.js` -- Light2D pipeline with `addLight()`, `setAmbientColor()`, max 10 lights
- Phaser 3.90.0 source: `node_modules/phaser/src/cameras/2d/effects/` -- Fade, Flash, Pan, RotateTo, Shake, Zoom camera effects
- Existing codebase: `src/game/main.ts` -- `render: { pixelArt: true }`, `Phaser.AUTO` renderer
- Existing codebase: `src/game/systems/SceneTransition.ts` -- Current fade/slide implementation
- Existing codebase: `scripts/comfyui-workflow.json` -- Current Flux GGUF + LoRA workflow
- Existing codebase: `scripts/style-guide.json` -- Current prompt templates and LoRA settings

### Secondary (MEDIUM confidence -- training data)
- Flux Dev guidance scale: 3.0-4.5 optimal range is well-established in community practice
- LoRA strength tuning: 0.6-0.9 range standard for style LoRAs on Flux
- Flux negative prompts via CFGGuider: reported working but with subtle effect compared to SD1.5
- ComfyUI-KJNodes: known custom node pack for batch comparison workflows
- Phaser Light2D without normal maps: produces flat gradient lighting (confirmed by source reading of LightsPlugin which mentions normal maps as optional)

### Needs Validation (LOW confidence)
- Optimal LoRA strength per asset type (0.65 backgrounds, 0.85 sprites) -- needs empirical testing
- Flux Dev 1024x576 non-square generation quality -- Flux supports it but quality at non-square ratios should be verified
- Negative prompt effectiveness on Flux Dev -- community reports are mixed
- ComfyUI Impact Pack utility for pixel art detail enhancement -- may be designed for photorealistic content

---
*Stack research for: Uncrowned v3.0 Flux Art Generation & Visual Effects*
*Researched: 2026-02-21*
*Key insight: ZERO new npm dependencies. All visual effects use Phaser 3.90 built-ins (ParticleEmitter, LightsPlugin, PostFX, Camera effects). Art generation improvements are tuning of existing pipeline (LoRA strength, prompt templates, workflow nodes).*
