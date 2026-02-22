# Feature Landscape: Flux Art Generation & Visual Effects

**Domain:** AI art generation pipeline (Flux + ComfyUI) and Phaser 3 runtime visual effects for browser adventure game
**Researched:** 2026-02-21
**Overall confidence:** MEDIUM (no web search/Context7 available; based on training data through early 2025 + thorough codebase analysis of existing pipeline)

> This document covers v3.0 features only. v1.0 (core gameplay) and v2.0 (art pipeline scaffolding, death gallery, hints, mobile, endings) are shipped. The existing `generate-art.ts`, `art-manifest.json`, `style-guide.json`, and `comfyui-workflow.json` are the foundation this milestone builds upon.

---

## Existing Foundation (Already Built)

| Component | Status | File |
|-----------|--------|------|
| Art manifest with prompts for 91 assets | Complete | `scripts/art-manifest.json` |
| ComfyUI workflow (Flux Dev GGUF + LoRA) | Complete | `scripts/comfyui-workflow.json` |
| Style guide (prefixes, palettes, LoRA config) | Complete | `scripts/style-guide.json` |
| Generate-art script with batch + placeholder modes | Complete | `scripts/generate-art.ts` |
| Placeholder PNGs for all 91 assets | Complete | SVG-to-PNG via sharp |
| Lazy loading system for backgrounds | Complete | `RoomScene.loadRoomAssets()` |
| 3-layer parallax per room | Complete | sky(0) + mid(0.3) + ground(1) |
| Scene transitions (fade + slide) | Complete | `SceneTransition.ts` |

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

### Art Generation Pipeline Completion

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Run Flux generation for all 91 assets | The pipeline exists but has never been run against real hardware. Without actual art, the game ships with colored rectangles. This is the core deliverable. | Med | `generate-art.ts` handles batch submission. Needs ComfyUI + GPU hardware. Estimated 8-12 hours of generation time for all assets. |
| Per-asset error recovery and retry | Batch of 91 assets will encounter failures (GPU OOM, ComfyUI timeout). Must skip failures, continue, log which failed, and allow retrying only failed assets. | Low | Partially built: file-existence check skips completed assets. Needs explicit error log (JSON manifest of failures with error messages). |
| Sprite background removal | **Critical gap.** Flux generates sprites on white/colored backgrounds. The 48 sprite assets (37 items + 11 NPCs + 1 player) need transparent backgrounds. `processSprite()` uses `ensureAlpha()` + `contain` resize but does NOT remove generated backgrounds. | Med | Options: (1) ComfyUI RemBG node in workflow -- automatic, stays in pipeline; (2) Post-process with rembg Python CLI; (3) @imgly/background-removal JS/WASM; (4) Manual editing as fallback. Recommend option 1. |
| Prompt tuning after initial generation | First-pass prompts will produce imperfect results. Need to adjust individual prompts, change seeds, and regenerate specific assets without redoing entire batch. | Low | Already supported via `--room` flag and `--force`. Edit `art-manifest.json` prompts and rerun for specific entries. |
| Quality validation pass | Every generated asset must be reviewed for: correct dimensions, appropriate style, readability at game scale (960x540), palette consistency within acts. | Med | Not automated. Needs a visual review tool -- HTML gallery page showing each asset alongside its prompt, seed, and regeneration controls. |
| Player spritesheet frame consistency | Player spritesheet is 16 frames (768x64, 48x64 per frame). Flux generates single images, not consistent multi-frame spritesheets. | High | **Hardest art problem.** Options: (1) Generate single canonical pose, manually create walk/interact frames; (2) Generate each frame separately with careful prompting + same seed; (3) ControlNet with pose skeletons. Recommend option 1 for reliability. |
| Consistent art style across all 91 assets | All assets must look like they belong in the same game, not 91 different AI generations. | High | LoRA trigger word (`GRPZA`), prompt prefix/suffix system, per-act palette hints. May need post-process color grading via sharp/ImageMagick if Flux does not respect palette consistently. |

### Visual Effects (Runtime, In-Game)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Ambient particle effects per room | Fireflies in forests, dust motes in caves, falling leaves, dripping water -- standard atmospheric detail in modern 2D adventure games. Without particles, rooms feel static and lifeless even with real art. | Med | Phaser 3.60+ `ParticleEmitter` (unified API). Room JSON needs `effects` field. Each particle type is a reusable preset config. Use 2x2 white pixel texture with tint. |
| Item pickup visual feedback | Items currently vanish silently (`sprite.destroy()`). Players expect pickup flash, sparkle, or float-up animation. Universal in adventure/RPG games. | Low | Tween: scale up + fade out + slight upward drift over 300-500ms. Optional 5-10 sparkle particles from pickup point. Wire into `item-picked-up` EventBus handler. |
| Hotspot hover indication | In point-and-click games, players must find clickable objects. Without visual feedback on hover, players miss interactive hotspots. Playability requirement, not just polish. | Low-Med | Options: (1) Cursor change on hover (CSS swap); (2) Subtle tint on hover; (3) `Tab` key "highlight all" mode showing all hotspots briefly. Recommend cursor change (lowest effort) + highlight mode. |
| Camera effects on key events | Screen shake on danger, flash on magic/curse, tint shifts in cursed areas. Without these, dramatic moments feel flat. | Low | Phaser camera API: `camera.shake()`, `camera.flash()`, `camera.fadeIn/fadeOut`. Wire to EventBus events: death (shake + red flash), puzzle-solve (brief flash), act transitions (longer fade). |
| Scene transition polish | Current transitions are plain black. Adventure games match transition style to context -- colored fades, themed transitions per biome. | Low | Enhance `SceneTransition.ts` with color parameter. Cave exits fade to dark blue, forest to green, death to red. Minor change, big atmospheric improvement. |

---

## Differentiators

Features that set the product apart. Not expected, but valued.

### Art Generation Enhancements

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Art review gallery (HTML tool) | Side-by-side placeholder vs generated art. Accept/reject per asset. One-click regenerate with prompt editor. Saves hours across 91 assets. | Med | Static HTML page reading art-manifest.json. Display each asset with prompt/seed, form to edit prompt, trigger regeneration. Simple Vite page in `scripts/art-review/`. |
| Workflow variants per asset type | Backgrounds need landscape composition. Sprites need centered subject. Items need icon framing. One workflow is a compromise. | Med | 3 ComfyUI workflows: `workflow-background.json`, `workflow-sprite.json`, `workflow-item.json`. `generate-art.ts` selects by category. |
| Negative prompt support | Flux Dev supports negative prompts via conditioning. Currently only positive prompts used. "avoid blurry, avoid text, avoid watermark" improves consistency. | Low | Add negative conditioning node to workflow. Add `negativePrompt` to style-guide.json. Low effort, meaningful quality boost. |
| Seed variation mode | Generate 3-5 variations per asset with different seeds, pick best. Currently locked to single seed per asset. | Low | `--variations N` flag. Generate N images with seeds `seed, seed+1, seed+2...`. Save as `forest_clearing_v1.png`, etc. Select best, update manifest. |
| LoRA strength per category | Backgrounds at 0.7, sprites at 0.9, items at 0.6. Currently all use 0.8. | Low | Add `loraStrength` override per category in style-guide.json. Inject into workflow node 3 `strength_model`. |

### Visual Effects Enhancements

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-room weather system | Rain on rooftop, drips in caves, dust in archives, ash in Act 3. Data-driven via room JSON. Major atmosphere boost across 36 rooms. | Med | 8-10 particle presets: `rain`, `snow`, `drips`, `dust`, `fireflies`, `embers`, `leaves`, `sparkles`, `ash`, `fog`. Room JSON `effects.particles` references presets. |
| Petrification curse visual | Act 3 narrative core is spreading stone curse. Progressive desaturation creates visceral storytelling through visuals. | Med | PostFX `ColorMatrix.desaturate()` on camera, configurable per room. Act 3 rooms progressively desaturated. `rooftop` and `throne_room_act3` at max. Requires WebGL (already default). |
| Item/hotspot idle animations | Subtle bob, glow pulse, sparkle on interactive objects. Bioluminescent mushrooms pulse, crystals shimmer, torches flicker. Brings static scenes alive. | Low | Phaser tweens: `scene.tweens.add({ targets: sprite, y: '-=2', yoyo: true, repeat: -1, ease: 'Sine.easeInOut', duration: 1500 })`. Define per item in room JSON. |
| Room-enter cinematic for act transitions | Letterbox bars + text crawl when entering Act 2 and Act 3. Only 2-3 transitions but creates memorable narrative pacing. | Med | Black bar rectangles with tween, centered text with typewriter, auto-dismiss. Triggered on first visit to act-opening rooms. |
| Death scene visual enhancements | Screen shake, red tint flash, vignette when dying. 43 death scenarios benefit from visual drama. | Low | In `trigger-death` handler: `camera.shake(200, 0.01)` + `camera.flash(300, 180, 0, 0)`. In DeathScene: vignette overlay sprite. Cheap, enhances all 43 deaths. |
| Dynamic torch/crystal lighting | Point lights in torch-lit castle rooms and crystal-glowing caverns. Adds depth without normal maps. | Med | Phaser Lights2D: `this.lights.enable()`, `PointLight` at positions in room JSON. Without normal maps, effect is subtle ambient glow. Flicker via tween on intensity. |
| Parallax foreground layer | 4th parallax layer with scrollFactor 1.3-1.5 for foreground elements (overhanging leaves, stalactites, pillars). Creates depth perception. | Med | Additional art asset per room or per act. Room JSON already supports arbitrary layer count. |
| Inventory item sprites in panel | Show generated 32x32 item art in inventory panel alongside text names. Currently text-only list. | Low | InventoryPanel renders text. Load item sprites as `<img>` tags in the HTML panel. |
| Cursor context changes | Cursor changes based on what is underneath: arrow in empty space, magnifying glass on hotspots, door on exits, speech bubble on NPCs. | Low | CSS cursor classes changed on `pointermove` based on zone detection. Needs 4-5 small cursor art assets. |

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time AI art during gameplay | 30-120s latency per image, requires GPU, unpredictable quality, destroys pacing | Pre-generate all art offline with fixed seeds. Ship PNGs as static assets. |
| Normal-mapped 3D-style lighting | Pixel art should look flat. Per-pixel normals create "Dead Cells" 3D-lit-2D that contradicts classic adventure aesthetic. | Use Lights2D without normal maps for flat ambient/point light gradients. |
| CRT/scanline shader | Retro filter adds visual noise that makes pixel art harder to read. Text-heavy game needs readability. | Keep `pixelArt: true` rendering clean and crisp. |
| Dynamic time-of-day system | Fixed room states per act. Real-time day/night requires 2-3x art variants. | Use per-act ambient tint (warm Act 1, dark Act 2, twilight Act 3). |
| Custom WebGL shaders | Browser compatibility issues, maintenance burden, breaks Canvas fallback | Use Phaser built-in PostFX (ColorMatrix, Glow, Vignette) -- already WebGL-safe. |
| AI upscaling (Real-ESRGAN) | Destroys pixel art by smoothing intentional pixel boundaries. We downscale from 1024 to 960, not upscale. | Sharp resize with `cover` mode. Pixel art stays pixelated. |
| Custom LoRA training (initially) | Requires curated datasets, ML expertise, GPU time. Existing LoRA works for game assets. | Start with existing LoRA. Only train custom if style fails after prompt tuning. |
| Animated spritesheets from Flux | Flux generates single images. Separate calls for walk cycle frames produce inconsistent characters. | Generate key poses. Manual touch-up for animation frames. Use tween animation (bob, scale) where possible. |
| Complex weather simulation | Full wind/rain/cloud simulation is way beyond point-and-click needs. | Preset particle configs per room in JSON. Simple and deterministic. |
| Physics-based particles | Phaser Arcade/Matter on particles is expensive and unnecessary for ambient atmosphere | ParticleEmitter gravity settings simulate physics without engine overhead. |
| Video cutscenes | Large files, loading latency, aesthetic mismatch with pixel art | In-engine cinematics with camera pans, text overlays, tween sequences. |
| ControlNet for every asset | 91 control images is massive prep overhead for marginal gain on backgrounds/items | ControlNet only for player spritesheet. LoRA + prompt handles everything else. |

---

## Feature Dependencies

```
Art Generation Pipeline
  |
  +-- Background Art (6 shared + 36 rooms = 42 images)
  |     |
  |     +-> Per-room Weather Particles (overlay on real backgrounds)
  |     +-> Petrification Desaturation (needs real art to see effect)
  |     +-> Dynamic Lighting (needs real art for context)
  |     +-> Parallax Foreground Layer (additional art per room)
  |
  +-- Sprite Art (37 items + 11 NPCs + 1 player = 49 images)
  |     |
  |     +-> Background Removal (MUST happen before sprites are usable)
  |           |
  |           +-> Inventory Item Sprites in Panel
  |           +-> Item Pickup Animation (animate real sprites)
  |           +-> Item/Hotspot Idle Animations
  |
  +-- Player Spritesheet (special: 16 consistent frames)
        |
        +-> Walk animation quality

Visual Effects (prototype on placeholders, finalize on real art)
  |
  +-- Room JSON "effects" Schema Extension
  |     |
  |     +-> Particle Preset System
  |     +-> Per-room Lighting Config
  |     +-> Idle Animation Config
  |
  +-- Camera Effects Wiring (independent of art)
  |     |
  |     +-> Death Scene Visual Enhancements
  |     +-> Scene Transition Color Matching
  |     +-> Room-enter Cinematics (act transitions)
  |
  +-- Hotspot Hover Indication (independent of art)
  +-- Cursor Context Changes (needs small cursor art)
```

**Key ordering insight:** Art generation is the critical path (hours of GPU time). Visual effects can be prototyped in parallel on placeholder art, then validated once real art arrives. Design and code the effects system first, then tune after art is generated.

---

## Technical Details

### Phaser 3.60+ Particle API (confidence: HIGH)

Phaser 3.60 unified the particle system into `ParticleEmitter`. Old `ParticleEmitterManager` was removed. Create emitters directly:

```typescript
// Rain preset
const rain = scene.add.particles(0, 0, 'particle-white', {
    x: { min: 0, max: 960 },
    y: -10,
    speedY: { min: 200, max: 400 },
    speedX: { min: -20, max: -40 },
    lifespan: 2000,
    quantity: 2,
    frequency: 50,
    scale: { start: 0.5, end: 0.3 },
    alpha: { start: 0.6, end: 0.1 },
    tint: 0x8888cc,
});
rain.setDepth(50).setScrollFactor(0); // Fixed to camera for weather
```

For pixel art, use a 2x2 white pixel texture. Apply `tint` for color. Keeps pixel art aesthetic.

### Phaser PostFX Pipeline (confidence: MEDIUM -- verify on v3.90)

```typescript
// Desaturation for Act 3 petrification
const colorMatrix = camera.postFX.addColorMatrix();
colorMatrix.saturate(-0.5); // Partial desaturation

// Vignette for death scenes
camera.postFX.addVignette(0.5, 0.5, 0.3, 0.8);
```

**Caveat:** PostFX requires WebGL. Game uses `Phaser.AUTO` which prefers WebGL. Add graceful degradation: `if (game.renderer.type === Phaser.WEBGL)` before PostFX.

### Room JSON Effects Schema (confidence: HIGH -- design decision)

Extend `RoomData` interface:

```typescript
effects?: {
    particles?: Array<{
        preset: string;     // 'rain' | 'snow' | 'fireflies' | 'dust' | 'drips' | 'embers' | 'leaves' | 'sparkles' | 'ash' | 'fog'
        zone?: { x: number; y: number; width: number; height: number };
        intensity?: number; // 0-1
        depth?: number;
    }>;
    lighting?: {
        ambientTint?: string;   // hex color for entire room
        desaturation?: number;  // 0-1, for petrification
        lights?: Array<{
            x: number; y: number;
            radius: number;
            color: string;
            intensity: number;
            flicker?: boolean;
        }>;
    };
    transition?: { fadeColor?: string; };
    cinematic?: { onFirstVisit?: boolean; text: string; duration?: number; };
};
```

### Background Removal Gap (confidence: HIGH)

`processSprite()` uses `sharp.ensureAlpha()` which adds an alpha channel but does NOT remove the white/colored background Flux generates. This is the **critical gap** for 48 sprite assets.

**Recommended: ComfyUI RemBG node** -- add to sprite workflow, runs background removal before output. Keeps everything automated in the pipeline.

**Fallback:** Post-process with rembg CLI: `rembg i input.png output.png`

### Performance Budget (confidence: MEDIUM)

Target: 60fps on mobile Safari.
- **Particles:** Cap 100-200 active. Phaser handles easily.
- **Tweens:** 10-20 idle animations. Negligible.
- **PostFX:** One ColorMatrix is cheap. Multiple stacked PostFX (glow + vignette + colormatrix) may impact mobile. Profile.
- **Lights2D:** 3-5 point lights fine. 10+ may impact mobile GPU.

Rule: test on lowest target device with max effects before shipping.

---

## Room-by-Room Effect Suggestions

High-impact rooms where effects add the most atmosphere:

| Room | Act | Suggested Effects |
|------|-----|-------------------|
| forest_clearing | 1 | Fireflies, dappled light particles, leaf drift |
| cave_entrance | 1 | Dust motes, cold fog wisps at cave mouth |
| underground_pool | 1 | Water ripple particles, crystal sparkles |
| forest_bridge | 1 | Wind particles, bridge creak camera micro-shake |
| cavern_west_wing | 2 | Bioluminescent pulse (glow tween), fireflies |
| crystal_chamber | 2 | Crystal sparkles, energy barrier shimmer |
| underground_river | 2 | Water spray particles, flowing water mist |
| forge_chamber | 2 | Embers, heat shimmer, orange ambient light |
| petrified_forest | 3 | Ash/dust, 0.4 desaturation, grey fog |
| throne_room_act3 | 3 | Rune glow particles, 0.7 desaturation |
| rooftop | 3 | Wind particles, 0.8 desaturation, cold tint |
| wizard_tower | 3 | Magical sparkles, potion bubbles, arcane glow |
| mirror_hall | 3 | Subtle light shimmer, blue glow from central mirror |

---

## MVP Recommendation

### Phase 1 -- Art Pipeline Execution (critical path)

1. **Background removal automation** -- Fix the critical sprite transparency gap. Add RemBG to workflow or post-process pipeline. Without this, no sprite is usable.
2. **Run batch generation** -- Execute against real hardware. Start with 3 test rooms (one per act) to validate style/palette. Then run full batch.
3. **Seed variation mode** -- Generate 3-5 variants per asset, pick best. Essential for quality.
4. **Art review gallery** -- HTML tool for reviewing 91 assets. Without this, review is painful.
5. **Player spritesheet** -- Most complex art problem. Generate canonical pose, manually iterate frames.

### Phase 2 -- Core Visual Effects (biggest atmosphere-per-effort)

6. **Room JSON effects schema** -- Add `effects` field to `RoomData` interface, populate for all 36 rooms.
7. **Particle preset system** -- 8-10 presets with shared 2x2 white pixel base texture.
8. **Item pickup animation** -- Tween + particle burst on take. Low effort, universal improvement.
9. **Camera effects wiring** -- Shake on death, flash on puzzle solve, colored fades.
10. **Hotspot hover indication** -- Cursor change + highlight mode. Playability requirement.

### Phase 3 -- Atmospheric Polish (differentiators)

11. **Petrification desaturation** -- Act 3 PostFX. Narrative-driven visual storytelling.
12. **Item/hotspot idle animations** -- Bob, pulse, flicker per interactive object.
13. **Death scene enhancements** -- Shake + flash + vignette on all 43 deaths.
14. **Room-enter cinematics** -- Letterbox + text crawl for 2-3 act transitions.
15. **Inventory item sprites** -- Show art in inventory panel.

### Defer

- **Dynamic torch/crystal lighting** -- Lights2D without normal maps is too subtle for effort; fake with overlay sprites instead
- **Parallax foreground layer** -- Requires 36+ additional art assets; nice-to-have after core art ships
- **Cursor context changes** -- Needs custom cursor art; lower priority than hotspot hover
- **Workflow variants per asset type** -- Only pursue if single workflow produces poor results for specific categories
- **Custom LoRA training** -- Only if existing LoRA is inadequate after testing

---

## Sources

### Codebase Analysis (HIGH confidence)
- `scripts/generate-art.ts` -- batch generation pipeline, ComfyUI REST API
- `scripts/art-manifest.json` -- 91 asset prompts, seeds, dimensions
- `scripts/style-guide.json` -- LoRA config, palettes, prefix/suffix
- `scripts/comfyui-workflow.json` -- 15-node Flux Dev GGUF + LoRA workflow
- `src/game/scenes/RoomScene.ts` -- lazy loading, parallax, event wiring
- `src/game/systems/SceneTransition.ts` -- fade and slide transitions
- `src/game/types/RoomData.ts` -- room JSON type definitions
- `src/game/main.ts` -- Phaser config (AUTO renderer, pixelArt: true, 960x540)

### Training Data (MEDIUM confidence -- verify during implementation)
- Phaser 3.60+ ParticleEmitter unified API
- Phaser 3.60+ PostFX pipeline (preFX/postFX on cameras)
- Phaser Lights2D pipeline
- Flux Dev LoRA integration via ComfyUI
- ComfyUI RemBG custom nodes
- rembg Python library
- sharp image processing

### Needs Verification Against Current Phaser v3.90
- PostFX API exact method signatures
- ParticleEmitter config properties in latest version
- Lights2D compatibility with `pixelArt: true`
- Mobile Safari WebGL PostFX support
