# Architecture: Flux Art Generation & Phaser 3 Visual Effects

**Domain:** AI art pipeline integration + runtime visual effects for existing adventure game
**Researched:** 2026-02-21
**Confidence:** HIGH for Phaser 3 FX APIs (verified from type definitions), MEDIUM for Flux/LoRA batch pipeline patterns (training data, no live verification)

## Executive Summary

This milestone adds two distinct architectural concerns to Uncrowned: (1) upgrading the existing build-time art pipeline with LoRA integration, batch orchestration, and quality validation, and (2) adding runtime visual effects to RoomScene (scene transitions, lighting, weather particles, ambient animations). These concerns are intentionally decoupled -- the art pipeline produces static PNGs consumed by the existing asset loader, while visual effects are a new runtime system that layers on top of the existing parallax rendering.

The existing architecture provides clean integration points: `generate-art.ts` already talks to ComfyUI and handles sharp post-processing; `RoomScene.create()` already has a layered rendering pipeline with depths; Phaser 3.90 ships with a full FX pipeline (`preFX`/`postFX`) and modern `ParticleEmitter` API. The primary architectural work is designing the **data-driven effects configuration** that ties visual effects to room JSON, and upgrading the art pipeline from single-image generation to batch orchestration with quality gates.

---

## Current Architecture Baseline

### Art Pipeline (Build-Time)

```
scripts/art-manifest.json    scripts/style-guide.json    scripts/comfyui-workflow.json
         |                           |                            |
         +---------------------------+----------------------------+
                                     |
                          scripts/generate-art.ts
                          (TypeScript, runs via tsx)
                                     |
                          +----------+----------+
                          |                     |
                   ComfyUI REST API      --placeholder mode
                   (127.0.0.1:8188)      (sharp SVG->PNG)
                          |
                   Poll /history/{id}
                          |
                   Download /view?filename=
                          |
                   sharp post-process
                   (resize to target dims)
                          |
                   public/assets/backgrounds/
                   public/assets/sprites/
```

**Key facts from codebase inspection:**
- Workflow: Flux GGUF (Q5_0) + DualCLIP + LoRA (Flux-2D-Game-Assets-LoRA) at strength 0.8
- Generation resolution: 1024x1024, post-processed to 960x540 (rooms) or 1920x540 (shared)
- Style guide defines per-act palettes, prompt prefixes/suffixes for backgrounds, sprites, items
- 91 total assets: 6 shared backgrounds, 36 room backgrounds, 1 player sprite, ~30 items, ~18 NPCs
- Placeholder mode generates labeled colored rectangles at correct dimensions
- Manifest stores fixed seeds for reproducibility

### RoomScene Rendering (Runtime)

```
RoomScene.create()
    |
    +-- loadRoomAssets() [async, lazy]
    |       |
    |       +-- Background layers (depth 0,1,2) with scrollFactor parallax
    |       +-- Item sprites (depth 5)
    |       +-- NPC sprites (depth 5)
    |
    +-- Player (depth via Player class)
    +-- Exit zones, hotspot zones (depth 100 for debug)
    +-- Camera: setBounds(0, 0, worldWidth, 540), follow player
    +-- Transition-in: fade (camera.fadeIn) or slide (tween scrollX)
```

**Current rendering depths:**
- 0, 1, 2: Parallax background layers (sky, mid, ground)
- 5: Item and NPC sprites
- 100: Debug overlays
- 999: Loading text

**Current transitions (SceneTransition.ts):**
- `fade`: camera.fadeOut -> scene.start -> camera.fadeIn (500ms)
- `slide-left`/`slide-right`: tween camera.scrollX -> scene.start with transitionFrom

---

## Recommended Architecture

### Part 1: Art Pipeline Upgrades

#### 1A. Batch Orchestration

The current `generate-art.ts` processes assets sequentially. For 91 assets at ~30s each, that is 45+ minutes. Batch orchestration runs multiple generations in parallel (ComfyUI can queue prompts) and tracks progress across interrupted sessions.

**New component: `scripts/generate-art-batch.ts`**

```
art-manifest.json
       |
       v
+------------------+     +-----------------------+
| Batch Controller |---->| Progress Tracker      |
| (reads manifest, |     | (.art-progress.json)  |
| filters pending) |     | tracks: generated,    |
+--------+---------+     | failed, pending       |
         |               +-----------------------+
         v
+------------------+
| Queue Manager    |  Submit N prompts concurrently
| (concurrent:2-4) |  to ComfyUI queue
+--------+---------+
         |
    +----+----+
    |         |
    v         v
 ComfyUI   ComfyUI
 prompt 1  prompt 2  ...
    |         |
    v         v
 Poll & Download
    |         |
    v         v
 Post-process (sharp)
    |         |
    v         v
 Quality Validation
    |         |
    v         v
 Output to public/assets/
```

**Modification to existing `generate-art.ts`:** Refactor core functions (`generateImage`, `processBackground`, `processSprite`) into a shared module `scripts/art-pipeline/core.ts` that both the existing single-mode script and the new batch script consume. Do NOT rewrite the working script; extract and reuse.

| Component | Location | Status | Purpose |
|-----------|----------|--------|---------|
| `scripts/art-pipeline/core.ts` | New | Extract from generate-art.ts | Shared generation, post-processing, manifest parsing |
| `scripts/art-pipeline/batch.ts` | New | New file | Concurrent queue management, progress tracking, resume |
| `scripts/art-pipeline/validate.ts` | New | New file | Quality checks on generated images |
| `scripts/art-pipeline/progress.json` | New (gitignored) | Generated at runtime | Tracks batch progress for resume |
| `scripts/generate-art.ts` | Existing | Refactor to import core | Keeps working as single-image CLI |

#### 1B. LoRA Integration Improvements

The current workflow hardcodes `Flux-2D-Game-Assets-LoRA.safetensors` at strength 0.8 in the ComfyUI workflow JSON. To support LoRA experimentation (different LoRAs for different asset types, strength tuning per room), the workflow injection needs to become parameterized.

**Modification to `comfyui-workflow.json` usage:**

```typescript
// In core.ts, before submitting to ComfyUI:
function injectWorkflowParams(
    workflow: ComfyUIWorkflow,
    params: {
        prompt: string;
        seed: number;
        loraName?: string;      // Override style-guide default
        loraStrength?: number;  // Override style-guide default
        width?: number;         // Override generation resolution
        height?: number;        // Override generation resolution
    }
): ComfyUIWorkflow {
    const copy = JSON.parse(JSON.stringify(workflow));
    copy[PROMPT_NODE_ID].inputs.text = params.prompt;
    copy[SEED_NODE_ID].inputs.noise_seed = params.seed;

    if (params.loraName) {
        copy['3'].inputs.lora_name = params.loraName;
    }
    if (params.loraStrength !== undefined) {
        copy['3'].inputs.strength_model = params.loraStrength;
    }
    // Width/height affect EmptySD3LatentImage and ModelSamplingFlux
    if (params.width && params.height) {
        copy['4'].inputs.width = params.width;
        copy['4'].inputs.height = params.height;
        copy['11'].inputs.width = params.width;
        copy['11'].inputs.height = params.height;
    }
    return copy;
}
```

**Manifest extension for per-asset LoRA overrides:**

```json
{
    "roomBackgrounds": {
        "crystal_chamber": {
            "prompt": "...",
            "seed": 200029,
            "output": "public/assets/backgrounds/rooms/crystal_chamber.png",
            "dimensions": { "width": 960, "height": 540 },
            "act": "act2",
            "loraOverride": {
                "name": "pixel-art-crystal-style.safetensors",
                "strength": 0.6
            }
        }
    }
}
```

#### 1C. Quality Validation

A new validation step runs after each image is generated and post-processed, BEFORE writing to the final output path.

**New component: `scripts/art-pipeline/validate.ts`**

| Check | Method | Action on Failure |
|-------|--------|-------------------|
| Dimensions correct | sharp metadata | Reject + log |
| Not solid color | Pixel variance check (sharp stats) | Flag for review |
| Not predominantly black/white | Histogram analysis | Flag for review |
| File size reasonable | fs.stat (>1KB for sprites, >10KB for backgrounds) | Flag for review |
| Alpha channel present (sprites) | sharp metadata hasAlpha | Reject + log |
| Matches act palette (optional) | Sample dominant colors vs style-guide palette | Flag for review (soft check) |

```typescript
interface ValidationResult {
    passed: boolean;
    checks: Array<{
        name: string;
        passed: boolean;
        message: string;
    }>;
}

async function validateAsset(
    imagePath: string,
    entry: GenerationEntry,
    styleGuide: StyleGuide
): Promise<ValidationResult> {
    const metadata = await sharp(imagePath).metadata();
    const stats = await sharp(imagePath).stats();
    // ... run checks
}
```

**Integration:** Validation runs automatically in the generation pipeline. Failures are logged to `scripts/art-pipeline/validation-report.json`. The `--strict` flag makes validation failures halt the pipeline; default behavior flags and continues.

---

### Part 2: Runtime Visual Effects System

#### 2A. Effects Manager (New System)

A new `EffectsManager` system manages all visual effects for the current room. It follows the singleton-per-scene pattern established by `AudioManager` -- initialized in `RoomScene.create()`, cleaned up on shutdown.

**New component: `src/game/systems/EffectsManager.ts`**

```
RoomScene.create()
    |
    +-- EffectsManager.init(scene, roomData)
            |
            +-- Read roomData.effects config
            |
            +-- Create weather particles (if configured)
            |       rain, snow, falling leaves, dust motes, fireflies
            |
            +-- Apply lighting overlay (if configured)
            |       time-of-day tint, torch flicker, crystal glow
            |
            +-- Start ambient animations (if configured)
                    water shimmer, candle flicker, wind sway
```

| Component | Location | Status | Purpose |
|-----------|----------|--------|---------|
| `src/game/systems/EffectsManager.ts` | New | Core effects orchestrator | Creates/manages all per-room effects |
| `src/game/effects/WeatherEmitter.ts` | New | Weather particle presets | Rain, snow, leaves, dust, fireflies |
| `src/game/effects/LightingOverlay.ts` | New | Lighting/tint system | Gradient overlays, vignette, day/night tint |
| `src/game/effects/AmbientAnimation.ts` | New | Looping ambient FX | Water shimmer, torch flicker, wind |
| `src/game/effects/TransitionEffect.ts` | New | Enhanced transitions | Wipe, pixelate, iris, dissolve |

#### 2B. Room JSON Effects Schema Extension

Effects are configured per-room in the existing room JSON files, following the same optional-field pattern used by `audio`, `puzzleHints`, and `dynamicDescriptions`.

```typescript
// Addition to RoomData interface
export interface RoomEffectsData {
    /** Weather particle effects active in this room */
    weather?: {
        type: 'rain' | 'snow' | 'leaves' | 'dust' | 'fireflies' | 'embers' | 'none';
        intensity?: number;  // 0.0-1.0, default 0.5
        wind?: number;       // Horizontal drift, pixels/sec, default 0
    };

    /** Ambient lighting configuration */
    lighting?: {
        /** Overall scene tint as hex color */
        tint?: string;       // e.g., "#2a1a4a" for purple cave tint
        /** Vignette darkness at screen edges */
        vignette?: number;   // 0.0-1.0 strength, default 0
        /** Ambient light level affecting brightness */
        ambientLevel?: number; // 0.0-1.0, default 1.0
        /** Flickering light sources */
        flicker?: {
            color: string;
            x: number;
            y: number;
            radius: number;
            intensity?: number;
        }[];
    };

    /** Ambient looping animations */
    ambient?: {
        type: 'water-shimmer' | 'torch-flicker' | 'wind-sway' | 'crystal-pulse';
        /** Region where the effect applies */
        zone?: { x: number; y: number; width: number; height: number };
    }[];
}
```

**Example room JSON with effects:**

```json
{
    "id": "crystal_chamber",
    "effects": {
        "weather": {
            "type": "dust",
            "intensity": 0.3,
            "wind": -5
        },
        "lighting": {
            "tint": "#1a2a4a",
            "vignette": 0.4,
            "ambientLevel": 0.6,
            "flicker": [
                { "color": "#4488ff", "x": 480, "y": 200, "radius": 150, "intensity": 0.7 }
            ]
        },
        "ambient": [
            { "type": "crystal-pulse", "zone": { "x": 400, "y": 150, "width": 200, "height": 200 } }
        ]
    }
}
```

#### 2C. Weather Particle System

Uses Phaser 3.90's `ParticleEmitter` API (verified from type definitions: `scene.add.particles(x, y, texture, config)`).

**Key design decisions:**

1. **Single particle texture atlas:** Create a small atlas (`effects-particles.png`) with frames for raindrop, snowflake, leaf, dust mote, firefly, ember. Loaded in Preloader as spritesheet. This is ONE additional asset load, not per-effect.

2. **Depth placement:** Weather particles render at depth 50 (above backgrounds at 0-2, above items/NPCs at 5, below debug at 100, below UI). Rain/snow should appear in front of the scene but behind UI.

3. **ScrollFactor for parallax consistency:** Weather particles use `setScrollFactor(1)` so they move with the camera, giving a natural parallax feel. For effects like distant rain, use lower scrollFactor (0.5).

4. **Performance budget:** Cap `maxAliveParticles` per weather type:
   - Rain: 200 particles max (fast lifecycle 500ms)
   - Snow: 100 particles max (slow lifecycle 3000ms)
   - Leaves/dust: 30 particles max
   - Fireflies: 15 particles max

```typescript
// WeatherEmitter.ts - preset factory
export class WeatherEmitter {
    static createRain(scene: Phaser.Scene, intensity: number, wind: number): Phaser.GameObjects.Particles.ParticleEmitter {
        return scene.add.particles(0, -10, 'effects-particles', {
            frame: 'raindrop',
            x: { min: -100, max: 1060 },
            y: -10,
            lifespan: { min: 400, max: 600 },
            speedY: { min: 300, max: 500 },
            speedX: wind,
            scale: { start: 0.5, end: 0.2 },
            alpha: { start: 0.6, end: 0.1 },
            quantity: Math.ceil(intensity * 5),
            frequency: 50,
            maxAliveParticles: Math.ceil(intensity * 200),
            blendMode: Phaser.BlendModes.ADD,
        }).setDepth(50).setScrollFactor(1);
    }

    static createSnow(scene: Phaser.Scene, intensity: number, wind: number): Phaser.GameObjects.Particles.ParticleEmitter {
        return scene.add.particles(0, -10, 'effects-particles', {
            frame: 'snowflake',
            x: { min: -100, max: 1060 },
            y: -10,
            lifespan: { min: 2000, max: 4000 },
            speedY: { min: 30, max: 80 },
            speedX: { min: wind - 20, max: wind + 20 },
            scale: { start: 0.3, end: 0.1 },
            alpha: { start: 0.8, end: 0.2 },
            rotate: { min: 0, max: 360 },
            quantity: Math.ceil(intensity * 2),
            frequency: 200,
            maxAliveParticles: Math.ceil(intensity * 100),
        }).setDepth(50).setScrollFactor(1);
    }

    // ... fireflies, dust, leaves, embers follow same pattern
}
```

#### 2D. Lighting System

Phaser 3.90 provides two approaches for lighting effects, both verified from the type definitions:

**Approach 1: PostFX on camera (recommended for global tint/vignette)**
```typescript
// Camera-level vignette + color tint
const camera = scene.cameras.main;
camera.postFX.addVignette(0.5, 0.5, 0.5, vignetteStrength);
camera.postFX.addColorMatrix().tint(tintColor);
```

**Approach 2: Graphics overlay for localized light (recommended for flickering lights)**
```typescript
// Semi-transparent overlay for ambient darkness
const overlay = scene.add.graphics();
overlay.fillStyle(0x000000, 1.0 - ambientLevel);
overlay.fillRect(0, 0, worldWidth, 540);
overlay.setDepth(40); // Below weather (50) but above scene content (0-5)
overlay.setScrollFactor(1);
overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
```

**Flickering light sources** use tweens on a graphics circle with `ADD` blend mode:

```typescript
// LightingOverlay.ts
createFlickerLight(scene: Phaser.Scene, config: FlickerConfig): void {
    const light = scene.add.graphics();
    light.setDepth(41);

    // Create radial gradient circle
    const drawLight = (radius: number, alpha: number) => {
        light.clear();
        light.fillStyle(Phaser.Display.Color.HexStringToColor(config.color).color, alpha);
        light.fillCircle(config.x, config.y, radius);
    };

    drawLight(config.radius, config.intensity);
    light.setBlendMode(Phaser.BlendModes.ADD);

    // Flicker tween
    scene.tweens.add({
        targets: { val: config.intensity },
        val: config.intensity * 0.6,
        duration: { min: 100, max: 300 },
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: (tween, target) => {
            drawLight(config.radius, target.val);
        },
    });
}
```

**Why NOT use Phaser's built-in Light2D pipeline:** The Light2D pipeline requires all sprites to use normalmap textures. Our pixel art backgrounds are flat PNGs without normalmaps. Generating normalmaps for every background adds significant pipeline complexity for marginal visual improvement. The graphics overlay + blend mode approach is simpler, cheaper, and sufficient for 2D adventure game lighting.

#### 2E. Enhanced Scene Transitions

The current `SceneTransition.ts` supports fade and slide. New transitions extend this without modifying the existing transition types -- they are additive options in the `ExitData.transition` union.

**Extended transition type:**
```typescript
// Modify ExitData.transition type
transition: 'fade' | 'slide-left' | 'slide-right' | 'wipe-left' | 'wipe-right' | 'pixelate' | 'iris-out';
```

**Implementation using Phaser FX (verified available):**

```typescript
// In SceneTransition.ts - new methods

static wipeToRoom(
    scene: Phaser.Scene,
    roomId: string,
    spawnPoint: { x: number; y: number },
    direction: 'wipe-left' | 'wipe-right',
    duration: number = 800
): void {
    scene.input.enabled = false;
    const camera = scene.cameras.main;

    // addWipe returns Phaser.FX.Wipe (verified from types)
    const wipe = camera.postFX.addWipe(0, direction === 'wipe-left' ? 0 : 1, 0);

    scene.tweens.add({
        targets: wipe,
        progress: 1,
        duration,
        ease: 'Linear',
        onComplete: () => {
            scene.scene.start('RoomScene', { roomId, spawnPoint, transitionFrom: direction });
        },
    });
}

static pixelateToRoom(
    scene: Phaser.Scene,
    roomId: string,
    spawnPoint: { x: number; y: number },
    duration: number = 600
): void {
    scene.input.enabled = false;
    const camera = scene.cameras.main;

    // addPixelate returns Phaser.FX.Pixelate (verified from types)
    const pixelate = camera.postFX.addPixelate(1);

    scene.tweens.add({
        targets: pixelate,
        amount: 40,  // Large pixel blocks
        duration: duration / 2,
        ease: 'Power2',
        onComplete: () => {
            scene.scene.start('RoomScene', { roomId, spawnPoint, transitionFrom: 'fade' });
        },
    });
}

static irisOutToRoom(
    scene: Phaser.Scene,
    roomId: string,
    spawnPoint: { x: number; y: number },
    duration: number = 800
): void {
    scene.input.enabled = false;
    const camera = scene.cameras.main;

    // addCircle returns Phaser.FX.Circle (verified from types)
    const circle = camera.postFX.addCircle(1, 0x000000, 2.0);

    scene.tweens.add({
        targets: circle,
        thickness: 0.01,
        duration,
        ease: 'Power2',
        onComplete: () => {
            scene.scene.start('RoomScene', { roomId, spawnPoint, transitionFrom: 'fade' });
        },
    });
}
```

**Transition-in counterparts:** The incoming scene reads `transitionFrom` and applies the reverse effect (e.g., wipe-in, de-pixelate, iris-open).

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `scripts/art-pipeline/core.ts` | ComfyUI API, sharp processing, manifest parsing | ComfyUI server, filesystem |
| `scripts/art-pipeline/batch.ts` | Concurrent generation, progress tracking, resume | core.ts, progress.json |
| `scripts/art-pipeline/validate.ts` | Image quality checks post-generation | sharp, core.ts |
| `EffectsManager.ts` | Orchestrates all room effects, lifecycle | RoomScene, WeatherEmitter, LightingOverlay |
| `WeatherEmitter.ts` | Particle preset factory | Phaser ParticleEmitter API |
| `LightingOverlay.ts` | Scene tint, vignette, flicker lights | Phaser postFX, Graphics, Tweens |
| `AmbientAnimation.ts` | Looping visual animations | Phaser Tweens, Graphics |
| `TransitionEffect.ts` | Enhanced scene transition effects | Phaser camera postFX, SceneTransition.ts |
| `RoomData.effects` (JSON) | Per-room effects configuration | Read by EffectsManager |

### Depth Map (Final)

```
Depth  |  Contents
-------|------------------------------------------
  0    |  Sky parallax layer (scrollFactor 0)
  1    |  Mid parallax layer (scrollFactor 0.3)
  2    |  Ground layer (scrollFactor 1)
  5    |  Item sprites, NPC sprites
 10    |  Player sprite
 40    |  Lighting overlay (MULTIPLY blend)
 41    |  Flicker lights (ADD blend)
 50    |  Weather particles
100    |  Debug overlays
999    |  Loading text
```

Note: Player is currently not explicitly depth-set. The `Player` class creates a sprite that defaults to depth 0, which visually works because it is added after backgrounds. Recommend explicitly setting player depth to 10 for predictable layering with the new effects system.

---

## Data Flow

### Art Pipeline Data Flow

```
style-guide.json + art-manifest.json
           |
           v
    batch.ts reads manifest, filters by --type/--room/--act
           |
           v
    For each pending asset (check progress.json):
           |
           +-- core.ts: injectWorkflowParams(workflow, { prompt, seed, lora?, dims? })
           |
           +-- core.ts: submitToComfyUI(workflow) -> prompt_id
           |
           +-- core.ts: pollForCompletion(prompt_id) -> raw PNG buffer
           |
           +-- core.ts: postProcess(buffer, dims, category) -> processed PNG
           |
           +-- validate.ts: validateAsset(processedPath, entry, styleGuide)
           |       |
           |       +-- PASS: write to final output, update progress.json
           |       +-- FAIL: write to quarantine/, log to validation-report.json
           |
           +-- Update progress.json (generated/failed/pending counts)
```

### Runtime Effects Data Flow

```
Room JSON loaded by RoomScene.init()
    |
    +-- roomData.effects parsed
    |
    v
RoomScene.create()
    |
    +-- EffectsManager.init(scene, roomData)
           |
           +-- if (roomData.effects?.weather)
           |       WeatherEmitter.create(type, intensity, wind)
           |       -> Phaser ParticleEmitter added to scene at depth 50
           |
           +-- if (roomData.effects?.lighting)
           |       LightingOverlay.apply(tint, vignette, ambientLevel, flickers)
           |       -> camera.postFX.addVignette() for vignette
           |       -> Graphics overlay at depth 40 for tint
           |       -> Graphics circles at depth 41 for flicker lights
           |
           +-- if (roomData.effects?.ambient)
                   AmbientAnimation.create(type, zone)
                   -> Tweens on scene graphics objects

RoomScene.update()
    |
    +-- EffectsManager.update(delta)  [only if effects need per-frame updates]
           |
           +-- Update flicker light random offsets
           +-- Update ambient animation phases

RoomScene SHUTDOWN event
    |
    +-- EffectsManager.destroy()
           |
           +-- Destroy all particle emitters
           +-- Remove all postFX from camera
           +-- Destroy all graphics objects
           +-- Cancel all effect tweens
```

---

## Modifications to Existing Components

### Changes Required

| File | Change | Impact | Risk |
|------|--------|--------|------|
| `src/game/types/RoomData.ts` | Add `effects?: RoomEffectsData` to `RoomData` interface | LOW | NONE -- optional field, all existing rooms work without it |
| `src/game/scenes/RoomScene.ts` | Add EffectsManager init/destroy in create/shutdown | LOW | Same pattern as AudioManager wiring (lines 428-430, 696) |
| `src/game/systems/SceneTransition.ts` | Add wipe/pixelate/iris methods, extend switch in `transitionToRoom` | LOW | New cases in switch, existing cases unchanged |
| `src/game/scenes/Preloader.ts` | Load `effects-particles` spritesheet | LOW | One `this.load.spritesheet()` call |
| `scripts/generate-art.ts` | Refactor core functions to importable module | MEDIUM | Must not break existing CLI interface |
| `scripts/art-manifest.json` | Add optional `loraOverride` fields | LOW | Existing entries unaffected |
| `scripts/comfyui-workflow.json` | No change (params injected at runtime) | NONE | -- |
| Room JSON files (36) | Add optional `effects` block | LOW per room | Incremental -- add effects room by room |
| `src/game/main.ts` | Add `type: Phaser.WEBGL` for postFX support | MEDIUM | Must verify Phaser.AUTO already picks WebGL; if not, this forces it |

### Critical: WebGL Requirement for PostFX

Phaser's `preFX` and `postFX` only work with the WebGL renderer. The current config uses `Phaser.AUTO`, which selects WebGL when available and falls back to Canvas. If we use `camera.postFX.addVignette()`, this will fail silently on Canvas renderer.

**Mitigation:**
1. Check `scene.sys.renderer.type === Phaser.WEBGL` before applying PostFX effects
2. In EffectsManager, gracefully skip FX that require WebGL when running in Canvas mode
3. Consider forcing `type: Phaser.WEBGL` in game config (all modern browsers support it)

```typescript
// EffectsManager.ts -- safe PostFX application
private canUsePostFX(): boolean {
    return this.scene.sys.renderer.type === Phaser.WEBGL;
}
```

---

## New vs Modified Component Summary

### New Components (6 files)

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `src/game/systems/EffectsManager.ts` | 150 | Room effects orchestrator |
| `src/game/effects/WeatherEmitter.ts` | 120 | Particle preset factory |
| `src/game/effects/LightingOverlay.ts` | 100 | Tint, vignette, flicker lights |
| `src/game/effects/AmbientAnimation.ts` | 80 | Looping ambient effects |
| `scripts/art-pipeline/batch.ts` | 200 | Batch generation orchestrator |
| `scripts/art-pipeline/validate.ts` | 100 | Quality validation checks |

### Modified Components (7 files)

| File | Nature of Change | Lines Changed (est.) |
|------|-----------------|---------------------|
| `RoomData.ts` | Add `RoomEffectsData` interface + field | +30 |
| `RoomScene.ts` | Wire EffectsManager (same pattern as AudioManager) | +15 |
| `SceneTransition.ts` | Add 3 new transition methods + switch cases | +80 |
| `Preloader.ts` | Load particle spritesheet | +3 |
| `generate-art.ts` | Extract core to shared module, import back | ~refactor, net 0 |
| `art-manifest.json` | Add loraOverride to select entries | +20 |
| Room JSONs | Add effects blocks incrementally | +10-20 per room |

### New Assets (1 file)

| Asset | Location | Size (est.) | Purpose |
|-------|----------|-------------|---------|
| `effects-particles.png` | `public/assets/sprites/effects-particles.png` | ~5KB | Spritesheet: raindrop, snowflake, leaf, dust, firefly, ember (6 frames, ~16x16 each) |

---

## Patterns to Follow

### Pattern 1: Data-Driven Effects (like Audio)

**What:** Effects configured in room JSON, not hardcoded per room.
**Why:** Consistent with how audio, puzzles, hints, and exits already work.
**Example:** The `audio` field in room JSON directly maps to this pattern:

```json
// Existing audio pattern (room JSON):
"audio": { "music": "music-forest", "ambient": [{ "key": "amb-wind", "volume": 0.3 }] }

// New effects pattern (same room JSON):
"effects": { "weather": { "type": "leaves", "intensity": 0.4 }, "lighting": { "tint": "#2a3a1a" } }
```

### Pattern 2: Singleton Manager per Scene (like AudioManager)

**What:** EffectsManager follows `getInstance()` + `init(scene)` + `cleanup()` lifecycle.
**Why:** Proven pattern in the codebase. AudioManager.ts (line 37-42) establishes this.

```typescript
// EffectsManager lifecycle mirrors AudioManager exactly:
create(): void {
    this.effectsManager = EffectsManager.getInstance();
    this.effectsManager.init(this, this.roomData);
}

// Shutdown:
this.effectsManager.cleanup();
```

### Pattern 3: Graceful Degradation

**What:** All effects are optional and skip silently when unsupported.
**Why:** WebGL may not be available. Older devices may be slow. The game must be playable without any effects.

```typescript
// Every effect method checks before applying:
if (!this.canUsePostFX()) return;  // No PostFX on Canvas renderer
if (!this.roomData.effects) return;  // No effects configured
if (this.isMobile() && this.isLowEnd()) return;  // Performance guard
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Hardcoded Per-Room Effects
**What:** Writing `if (roomId === 'crystal_chamber') { addBlueGlow(); }` in RoomScene.
**Why bad:** 36 rooms means 36 conditionals. Unmaintainable. Not data-driven.
**Instead:** All effects in room JSON. EffectsManager reads config and applies generically.

### Anti-Pattern 2: Modifying Background Images for Effects
**What:** Baking lighting/weather into the Flux-generated background PNGs.
**Why bad:** Static -- cannot react to game state. Cannot disable for performance. Increases asset generation time.
**Instead:** Clean backgrounds from Flux. Layer runtime effects on top. Same background works for any lighting state.

### Anti-Pattern 3: Global Particle System
**What:** One persistent particle emitter that carries across room transitions.
**Why bad:** Different rooms have different weather. Memory leak if not cleaned up. Particles from old room visible during transition.
**Instead:** EffectsManager creates fresh emitters per room, destroys them on shutdown.

### Anti-Pattern 4: Complex Shader Programs for Lighting
**What:** Writing custom GLSL shaders for the lighting system.
**Why bad:** Maintenance burden. Phaser's built-in PostFX (vignette, colorMatrix, glow) cover 95% of needs. Custom shaders are fragile across GPU vendors.
**Instead:** Use Phaser's built-in FX pipeline. It handles shader compilation, uniform binding, and cleanup.

### Anti-Pattern 5: Synchronous Batch Generation
**What:** Awaiting each ComfyUI generation sequentially in the batch pipeline.
**Why bad:** 91 assets at 30s each = 45+ minutes. ComfyUI can queue multiple prompts.
**Instead:** Submit 2-4 prompts concurrently, poll all in parallel. Cuts batch time to 15-20 minutes.

---

## Build Order Recommendation

Based on dependency analysis:

### Phase A: Art Pipeline Batch + LoRA (build-time, independent)
1. Refactor `generate-art.ts` core functions into `scripts/art-pipeline/core.ts`
2. Build `scripts/art-pipeline/batch.ts` with concurrent queue + progress tracking
3. Add LoRA override support to manifest + workflow injection
4. Build `scripts/art-pipeline/validate.ts` quality checks
5. Run batch generation for all 91 assets

**Rationale:** Zero runtime dependencies. Can run in parallel with all other work. Produces the real art assets that make every other visual feature look better.

### Phase B: Effects Infrastructure (runtime foundation)
1. Add `RoomEffectsData` to `RoomData.ts` type
2. Create particle spritesheet asset
3. Build `EffectsManager.ts` skeleton with init/destroy lifecycle
4. Wire into `RoomScene.ts` (create + shutdown)
5. Build `WeatherEmitter.ts` with rain preset as proof-of-concept
6. Add effects to 2-3 test rooms

**Rationale:** Establishes the runtime effects architecture. Weather particles are the most visually impactful and simplest to implement -- good proof that the system works.

### Phase C: Lighting + Ambient Effects
1. Build `LightingOverlay.ts` (tint, vignette, flicker)
2. Build `AmbientAnimation.ts` (water shimmer, torch flicker)
3. Verify WebGL fallback behavior
4. Add lighting configs to cave/dungeon rooms, ambient to water rooms

**Rationale:** Depends on EffectsManager from Phase B. Lighting is more nuanced than particles and benefits from having the foundation tested first.

### Phase D: Enhanced Transitions
1. Add new transition methods to `SceneTransition.ts`
2. Add transition-in counterparts in `RoomScene.create()`
3. Update select exit definitions in room JSONs to use new transitions
4. Extend ExitData transition type union

**Rationale:** Can be done in parallel with Phase C. Modifies an existing system (SceneTransition) rather than creating a new one -- lower risk, clear integration point.

### Phase E: Effects Polish + Room-by-Room Rollout
1. Add effects configurations to all 36 room JSONs
2. Tune particle counts and lighting values per room
3. Performance testing on mobile (particle budget)
4. Validate act-consistent palettes (Act 1 warm, Act 2 cool, Act 3 twilight)

**Rationale:** Content work that depends on all systems being built. This is the integration/polish phase.

---

## Scalability Considerations

| Concern | At 36 rooms | At 100+ rooms | Mitigation |
|---------|-------------|---------------|------------|
| Particle memory | ~200 particles max per room, trivial | Same per-room budget | maxAliveParticles cap |
| PostFX performance | 1-3 effects per camera, ~0.5ms/frame | Same per-room | Disable on low-end |
| Art generation time | 91 assets, ~45min batch | 300+ assets, ~3hr batch | Concurrent queue + resume |
| Effects JSON size | ~500 bytes per room | Same per room | Embedded in room JSON, no separate file |
| Particle texture memory | 1 spritesheet, ~5KB | Same spritesheet | Single atlas for all weather |
| Transition complexity | 6 transition types | Same types, more exit combos | No per-transition assets needed |

---

## Sources

- Phaser 3.90 type definitions (`node_modules/phaser/types/phaser.d.ts`) -- Verified PostFX API (addVignette, addPixelate, addWipe, addCircle, addColorMatrix, addGlow, addBlur, addShine), ParticleEmitter constructor and config, camera effects (fadeIn/fadeOut, flash, shake, pan) [HIGH confidence]
- Existing codebase: `RoomScene.ts` (892 lines), `SceneTransition.ts` (112 lines), `generate-art.ts` (639 lines), `art-manifest.json` (91 assets), `comfyui-workflow.json` (Flux GGUF + LoRA pipeline), `style-guide.json` (act palettes, generation params) [HIGH confidence]
- ComfyUI REST API: `/prompt` POST, `/history/{id}` GET, `/view?filename=` GET -- verified from existing generate-art.ts implementation [HIGH confidence]
- Flux GGUF + LoRA workflow nodes: UnetLoaderGGUF, DualCLIPLoaderGGUF, LoraLoaderModelOnly, ModelSamplingFlux, FluxGuidance, SamplerCustomAdvanced -- verified from comfyui-workflow.json [HIGH confidence]
- sharp image processing API (resize, metadata, stats, ensureAlpha) -- verified from existing generate-art.ts usage and package.json (^0.34.5) [HIGH confidence]
- Phaser Light2D pipeline normalmap requirement -- training data knowledge [MEDIUM confidence, noted as "not recommended" in architecture]
- ComfyUI concurrent prompt queuing capability -- training data knowledge [MEDIUM confidence, should verify with live testing]

---
*Architecture research for: Uncrowned - Flux Art Generation & Visual Effects*
*Researched: 2026-02-21*
