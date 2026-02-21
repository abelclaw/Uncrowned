# Technology Stack: v2.0 Art & Polish

**Project:** KQGame v2.0
**Researched:** 2026-02-21
**Scope:** Stack ADDITIONS for v2.0 features only. Existing v1.0 stack (Phaser 3, TypeScript, Vite, inkjs, Ollama, navmesh) is validated and unchanged.

## Existing Stack (Validated, DO NOT Change)

| Technology | Version | Status |
|------------|---------|--------|
| Phaser | 3.90.0 | Locked |
| TypeScript | ~5.7.2 | Locked |
| Vite | ^6.3.1 | Locked |
| inkjs | ^2.4.0 | Locked |
| navmesh | ^2.3.1 | Locked |
| Vitest | ^4.0.18 | Locked |

## New Stack Additions for v2.0

### 1. Flux Art Generation Pipeline (Build-Time Tooling)

The art pipeline is a build-time tool, NOT runtime. Generated images ship as static PNG assets.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ComfyUI | latest (Desktop or manual) | Local image generation server | Node-based workflow engine that exposes REST API (`POST /prompt`, `GET /history/{id}`, `GET /view`) and WebSocket progress tracking. Workflows export as JSON for repeatable batch generation. Runs on macOS Apple Silicon via Metal Performance Shaders (MPS). |
| Flux.1 Dev (GGUF Q5) | latest | Base image model | Higher quality than Schnell for final art assets. GGUF quantization (Q5) runs on 10-12GB unified memory on Apple Silicon. 20-30 step generation. Use for all 36 room backgrounds and character sprites. |
| Flux-2D-Game-Assets-LoRA | v1.0 | Pixel art game asset style | Trigger word: `GRPZA`. Prompt format: `GRPZA, <<description>>, white background, game asset, pixel art`. Built on FLUX.1-dev base. Apache 2.0 license. Source: `gokaygokay/Flux-2D-Game-Assets-LoRA` on HuggingFace. |
| sharp | ^0.34.5 | Post-processing pipeline | Batch resize, crop, format conversion of generated images. Fastest Node.js image processor (libvips). Use to: (1) resize 1024x1024 Flux output to 960x540 room backgrounds, (2) extract sprites from white backgrounds, (3) generate WebP variants for smaller bundles. |
| ComfyUI-GGUF custom node | latest | GGUF model loader | Required to load quantized Flux models in ComfyUI. Install via ComfyUI Manager. Source: `city96/ComfyUI-GGUF` on GitHub. |

**Art Pipeline Architecture:**

```
[Node.js script] --> POST /prompt --> [ComfyUI server]
                                           |
                                    [Flux.1 Dev GGUF + LoRA]
                                           |
                                    [Generated PNG 1024x1024]
                                           |
                              [sharp: resize to 960x540, optimize]
                                           |
                              [public/assets/backgrounds/room_name.png]
```

**ComfyUI API Integration (build script, NOT npm dependency):**

The ComfyUI REST API is simple enough that a build script using plain `fetch()` is sufficient. No need for `@stable-canvas/comfyui-client` or other npm wrappers because:
- Only 3 endpoints needed: `POST /prompt`, `GET /history/{id}`, `GET /view`
- Build script runs infrequently (art generation, not per-build)
- Fewer dependencies = less maintenance burden

```typescript
// scripts/generate-art.ts (standalone build script, NOT part of game bundle)
async function generateRoomArt(roomName: string, prompt: string): Promise<Buffer> {
    // 1. Load workflow JSON template
    // 2. Inject prompt text and LoRA settings
    // 3. POST to http://127.0.0.1:8188/prompt
    // 4. Poll /history/{prompt_id} until complete
    // 5. GET /view?filename=... to download PNG
    // 6. sharp(png).resize(960, 540).toFile(`public/assets/backgrounds/${roomName}.png`)
}
```

**Model File Placement:**

```
comfyui/models/unet/     -> flux1-dev-Q5_K_S.gguf
comfyui/models/clip/     -> t5-v1_1-xxl-encoder-Q5_K_M.gguf, clip_l.safetensors
comfyui/models/vae/      -> flux_ae.safetensors
comfyui/models/loras/    -> Flux-2D-Game-Assets-LoRA.safetensors
```

### 2. Mobile-Responsive Layout (Runtime)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Phaser ScaleManager (built-in) | (in Phaser 3.90) | Canvas scaling + orientation | Already configured as `Scale.FIT` with `CENTER_BOTH`. Handles canvas resize and aspect ratio preservation. Provides `orientationchange` and `resize` events. No library needed. |
| CSS media queries | (native CSS) | Layout adaptation | Rearrange `#game-container`, `#text-parser-ui`, and potential touch controls based on viewport width. CSS is the right tool -- not a library. |
| Phaser DOM element (built-in) | (in Phaser 3.90) | Mobile text input | Requires `dom: { createContainer: true }` in game config. Allows HTML input elements over the canvas. The existing `TextInputBar` already uses HTML DOM elements outside the canvas, which is actually BETTER for mobile -- native `<input>` triggers the OS keyboard automatically. |

**What is NOT needed for mobile:**

| Avoid | Why Not |
|-------|---------|
| phaser3-rex-plugins VirtualJoystick | This is a point-and-click adventure game, not a platformer. Players tap to move, not joystick. The existing click-to-move handler already works with touch via Phaser's unified pointer system. |
| phaser3-rex-plugins InputText | The existing `TextInputBar` uses a native HTML `<input>` element below the canvas. This is superior on mobile because it naturally triggers the OS virtual keyboard. A canvas-rendered input would NOT trigger the virtual keyboard. |
| Hammer.js / touch gesture library | Phaser's built-in pointer system handles tap, drag, and multi-touch. No pinch-to-zoom or swipe gestures needed for this genre. |
| Any virtual keyboard library | The native OS keyboard appears automatically when the HTML `<input>` receives focus on mobile. This already works. |

**Mobile Layout Strategy (CSS only):**

```css
/* Portrait phone: stack canvas above text input, reduce canvas height */
@media (max-width: 600px) and (orientation: portrait) {
    #game-container { max-width: 100vw; }
    #text-parser-ui { font-size: 16px; /* prevent iOS zoom on focus */ }
    #parser-input { font-size: 16px; padding: 12px; }
}

/* Landscape phone: text input overlaps bottom of canvas */
@media (max-height: 400px) and (orientation: landscape) {
    #text-parser-ui { position: fixed; bottom: 0; left: 0; right: 0; }
}
```

**Viewport meta tag update needed in index.html:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

The `viewport-fit=cover` handles iOS notch/safe areas. The `user-scalable=no` prevents double-tap zoom interfering with game input.

### 3. Progressive Hint System (Runtime)

**No new library needed.** This is pure game logic built on existing infrastructure.

| Component | Implementation | Why No Library |
|-----------|---------------|----------------|
| Hint data | JSON fields in room/puzzle data files | Follows existing data-driven pattern. Each puzzle gets a `hints: string[]` array, ordered from vague to explicit. |
| Hint timer | Phaser `time.delayedCall()` or frame-counting in GameState | Phaser already provides timing. Track `timeSinceLastAction` in GameState. |
| Hint display | Existing `NarratorDisplay.typewrite()` | The narrator is the natural voice for hints. "Perhaps examining the door more carefully would be wise..." |
| Hint state | GameState `flags` (e.g., `hint_puzzle_x_level: number`) | Existing flag system handles this. Increment per hint request. |
| "HINT" command | Add to existing `VerbTable` + `CommandDispatcher` | Parser already handles text commands. Add "hint" as a recognized verb. |

**Architecture:**

```typescript
// In puzzle JSON data (extends existing PuzzleData)
{
    "id": "bridge_riddle",
    "hints": [
        "The troll seems to value wit over brawn.",          // Level 0: vague
        "Think about what bridges connect...",                // Level 1: medium
        "Try answering the riddle with 'a bridge'.",         // Level 2: explicit
        "Type: tell troll 'a bridge'"                        // Level 3: spoiler
    ],
    "hintDelayMs": 120000  // 2 minutes between auto-hints
}
```

### 4. Death Gallery / Achievements (Runtime)

**No new library needed.** This is a data structure + UI scene.

| Component | Implementation | Why No Library |
|-----------|---------------|----------------|
| Achievement definitions | JSON data file (`assets/data/achievements.json`) | Follows existing data-driven pattern. |
| Achievement state | Extend `GameStateData` with `achievements: Record<string, boolean>` and `deathGallery: DeathGalleryEntry[]` | Existing save/load serialization handles it automatically. |
| Death gallery data | Extend `GameStateData` with death scene records | Each death already has `title` and `narratorText`. Just record them on occurrence. |
| Gallery UI | New Phaser `Scene` (`DeathGalleryScene`) | Same pattern as existing `DeathScene` and `MainMenuScene`. Pure Phaser rendering -- text, images, scroll. |
| Achievement notification | Phaser tween animation (slide-in banner) | Phaser's tween system handles slide/fade animations. No plugin needed. |
| Persistence | Existing `SaveManager` + `localStorage` | Achievements persist in the same save data structure. |

**GameState Extension:**

```typescript
// Additions to GameStateData interface
interface GameStateData {
    // ... existing fields ...
    achievements: Record<string, boolean>;  // achievement_id -> unlocked
    deathGallery: Array<{
        deathId: string;
        roomId: string;
        title: string;
        narratorText: string;
        timestamp: number;
    }>;
}
```

### 5. Multiple Endings (Runtime)

**No new library needed.** inkjs already supports this perfectly.

| Component | Implementation | Why No Library |
|-----------|---------------|----------------|
| Ending conditions | GameState flags evaluated at story climax | Existing flag system. Endings determined by accumulated player choices/actions. |
| Ending content | ink story files with conditional diverts | inkjs already supports `{ flag_name: -> ending_a }` conditional branching. This is what ink was designed for. |
| Ending scene | New Phaser `Scene` (`EndingScene`) | Displays ending-specific text, art, and credits. Same pattern as `DeathScene`. |
| Ending tracking | GameState flag: `ending_seen_x: true` | Track which endings the player has seen for replayability. |

**ink Pattern for Multiple Endings:**

```ink
=== climax ===
{ saved_the_kingdom and befriended_troll:
    -> ending_hero
}
{ betrayed_ghost_king:
    -> ending_villain
}
-> ending_neutral

=== ending_hero ===
# ending: hero
The kingdom rejoices as you emerge from the caverns...
-> END

=== ending_villain ===
# ending: villain
The crown feels heavy on your treacherous head...
-> END
```

### 6. Export/Import Save Files (Runtime)

**No new library needed.**

| Component | Implementation | Why No Library |
|-----------|---------------|----------------|
| Export | `JSON.stringify(gameState)` + `Blob` + `URL.createObjectURL()` + `<a download>` | Standard Web API. Creates a downloadable JSON file. |
| Import | `<input type="file">` + `FileReader` + `JSON.parse()` + `gameState.deserialize()` | Standard Web API. Read JSON file and restore state. |

## Recommended Stack Summary

### New npm Dependencies

```bash
# Build-time only (dev dependency for art pipeline post-processing)
npm install -D sharp@^0.34.5
```

That is the ONLY new npm dependency. Everything else uses existing libraries or built-in Phaser/browser APIs.

### External Tools (installed separately, NOT npm)

```bash
# ComfyUI Desktop for macOS (or manual Python install)
# Download from: https://docs.comfy.org/installation/desktop/macos

# Install ComfyUI-GGUF custom node (via ComfyUI Manager UI)

# Download models to ComfyUI directories:
# - Flux.1 Dev GGUF (Q5): city96/FLUX.1-dev-gguf on HuggingFace
# - T5XXL GGUF encoder: city96/t5-v1_1-xxl-encoder-gguf on HuggingFace
# - CLIP L: comfyanonymous/flux_text_encoders/clip_l.safetensors
# - VAE: black-forest-labs/FLUX.1-dev/ae.safetensors
# - LoRA: gokaygokay/Flux-2D-Game-Assets-LoRA on HuggingFace
```

### What Stays the Same

| Feature Area | Existing Tech Used | New Tech Needed |
|--------------|-------------------|-----------------|
| Hint system | VerbTable, CommandDispatcher, NarratorDisplay, GameState flags | None |
| Death gallery | DeathScene pattern, GameState, SaveManager, localStorage | None |
| Achievements | GameState flags, EventBus, Phaser tweens | None |
| Multiple endings | inkjs conditional branching, GameState flags | None |
| Mobile layout | Phaser Scale.FIT, HTML DOM TextInputBar, CSS | CSS media queries only |
| Save export/import | GameState.serialize(), Web File API | None |
| Art generation | (new pipeline) | ComfyUI + Flux + LoRA + sharp |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Art generation backend | ComfyUI (REST API) | Automatic1111 / SD WebUI | ComfyUI's workflow-as-JSON is superior for batch scripting. A1111 is simpler for one-off manual generation but harder to automate. ComfyUI also has better Flux support. |
| Art generation backend | ComfyUI (REST API) | `@stable-canvas/comfyui-client` npm | Only 3 API endpoints needed for the build script. Plain `fetch()` is simpler, has zero dependencies, and avoids coupling to a rapidly-changing client library (v1.5.7, 22 days old). |
| Base model | Flux.1 Dev GGUF | Flux.1 Schnell | Schnell is faster (4 steps vs 20-30) but lower quality. Room backgrounds are generated once at build time -- speed does not matter, quality does. Dev produces more detailed, coherent scenes. |
| Base model | Flux.1 Dev GGUF (Q5) | Flux.1 Dev FP16/BF16 | Full-precision Dev requires 24GB+ VRAM. GGUF Q5 runs on Apple Silicon unified memory (16GB+) with minimal quality loss. |
| Pixel art LoRA | Flux-2D-Game-Assets-LoRA | Retro-Pixel-Flux-LoRA | Retro-Pixel is "still in training, not final version, may contain artifacts". Game-Assets-LoRA is v1.0 release, Apache 2.0 licensed, specifically designed for game assets with white backgrounds (easy to extract sprites). |
| Pixel art LoRA | Flux-2D-Game-Assets-LoRA | Training custom LoRA | Custom LoRA could match exact art style but requires: training data curation, GPU time, ML expertise. Start with existing LoRA, train custom only if style consistency is insufficient. |
| Image post-processing | sharp | ImageMagick CLI | sharp is 3-5x faster, has a clean Node.js API, integrates into the build script naturally. ImageMagick requires shelling out to a CLI tool. |
| Image post-processing | sharp | canvas (npm) | canvas requires native Cairo bindings, complex installation. sharp uses libvips which is faster and easier to install on macOS. |
| Mobile touch | Built-in Phaser pointer | phaser3-rex-plugins VirtualJoystick | Adventure games use tap-to-move, not analog sticks. Adding a virtual joystick would be fighting the genre. Phaser's pointer system already converts touch to click coordinates. |
| Mobile text input | Native HTML `<input>` (existing TextInputBar) | Canvas-rendered input (RexUI InputText) | Canvas inputs do NOT trigger the native OS virtual keyboard on mobile. The existing HTML `<input>` element is the correct approach -- it naturally gets focus and keyboard. |
| Hint system | Custom logic in existing systems | Third-party hint engine | No "hint engine" library exists for this specific use case. The implementation is <100 lines of TypeScript using existing systems. |
| Achievement system | Custom GameState + Phaser tweens | steamworks-js or gamejolt-api | This is a browser game, not on Steam or GameJolt. No platform achievement API applies. |
| Multiple endings | inkjs conditional branching | Custom ending state machine | ink was literally designed for branching narratives with state-dependent outcomes. Writing a custom system would be reimplementing ink badly. |

## What NOT to Add

| Avoid | Why | What to Do Instead |
|-------|-----|-------------------|
| phaser3-rex-plugins (for v2.0) | Not used in v1.0 and not needed for v2.0 features. The existing HTML DOM approach for text input is superior on mobile. RexUI adds ~200KB to bundle for features we do not use. | Continue with HTML DOM overlay for UI elements. |
| Any CSS framework (Tailwind, Bootstrap) | The game has exactly 3 styled elements: canvas, response text, input field. A CSS framework would be 10x more code than the 71-line `style.css`. | Hand-written CSS with media queries. |
| Capacitor / Cordova | Wrapping in a native shell adds complexity without benefit. The game works in mobile Safari/Chrome. PWA is the lighter path if offline support is needed. | Serve as a web app. Add PWA manifest later if offline play is desired. |
| Any state management library (Zustand, Jotai, Redux) | GameState singleton with localStorage serialization handles all state. Achievements and death gallery are just new fields on the same data structure. | Extend existing `GameStateData` interface. |
| WebGL shaders / post-processing | Pixel art should look crisp, not filtered. Phaser's `pixelArt: true` config already disables interpolation. CRT/scanline effects would fight the art style. | Keep `render: { pixelArt: true }` as-is. |
| AI/ML runtime in browser (ONNX, TensorFlow.js) | Image generation must happen at build time, not runtime. Running Flux in the browser is not feasible (model is 6-12GB). Ollama already handles LLM parsing. | ComfyUI as build-time tool. Ollama as runtime LLM. |

## Hardware Requirements for Art Pipeline

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| GPU/Unified Memory | 12GB (GGUF Q4) | 16GB+ (GGUF Q5/Q8) |
| System RAM | 16GB | 32GB |
| Disk (models) | ~15GB | ~20GB |
| macOS | 12.3+ (Monterey, for MPS) | 14+ (Sonoma) |
| Generation time per image | ~3-5 min (M1, Q5, 20 steps) | ~1-2 min (M2/M3 Pro/Max) |

Note: These requirements are for the developer running the art pipeline, NOT for end users playing the game. End users just load pre-generated PNG/WebP files.

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| sharp@0.34.5 | Node 18.17+ | libvips bundled, no system dependency needed on macOS |
| ComfyUI Desktop | macOS 12.3+ Apple Silicon | Beta but stable for our use case. MPS acceleration. |
| Flux.1 Dev GGUF | ComfyUI-GGUF node | Must install custom node via ComfyUI Manager |
| Flux-2D-Game-Assets-LoRA | Flux.1 Dev base model | Will NOT work with Schnell (different architecture for LoRA) |
| Existing Phaser 3.90 | `dom: { createContainer: true }` | Required config addition for potential DOM overlays on mobile |

## Build Script Dependencies (separate from game)

```bash
# For the art generation build script (scripts/generate-art.ts)
# Runs with tsx or ts-node, NOT bundled into the game

# sharp is already added as devDependency above
# fetch() is built into Node 18+ (no node-fetch needed)
# fs/path are Node built-ins
```

## Sources

- [ComfyUI API Routes Documentation](https://docs.comfy.org/development/comfyui-server/comms_routes) -- REST endpoints: /prompt, /history, /view, /ws (HIGH confidence, official docs)
- [ComfyUI macOS Desktop Installation](https://docs.comfy.org/installation/desktop/macos) -- Apple Silicon setup, MPS support (HIGH confidence, official docs)
- [ComfyUI on Apple Silicon 2025 Guide](https://medium.com/@tchpnk/comfyui-on-apple-silicon-from-scratch-2025-9facb41c842f) -- Installation walkthrough for M-series Macs (MEDIUM confidence)
- [ComfyUI-GGUF GitHub](https://github.com/city96/ComfyUI-GGUF) -- GGUF quantization support custom node (HIGH confidence, GitHub source)
- [Flux Dev vs Schnell Comparison](https://pxz.ai/blog/flux-dev-vs-schnell) -- Speed, quality, VRAM compared (MEDIUM confidence)
- [Running Flux on 6-8GB VRAM](https://civitai.com/articles/6846/running-flux-on-68-gb-vram-using-comfyui) -- GGUF quantization levels and VRAM mapping (MEDIUM confidence)
- [Flux Dev GGUF on HuggingFace](https://huggingface.co/city96/FLUX.1-dev-gguf) -- Model download, quantization variants (HIGH confidence)
- [Flux-2D-Game-Assets-LoRA on HuggingFace](https://huggingface.co/gokaygokay/Flux-2D-Game-Assets-LoRA) -- Trigger word GRPZA, Apache 2.0, example prompts (HIGH confidence)
- [Retro-Pixel-Flux-LoRA on HuggingFace](https://huggingface.co/prithivMLmods/Retro-Pixel-Flux-LoRA) -- "Still in training, not final" (MEDIUM confidence)
- [Pixel Art ComfyUI Workflow Guide](https://inzaniak.github.io/blog/articles/the-pixel-art-comfyui-workflow-guide.html) -- Resolution, LoRA, sampler settings (MEDIUM confidence)
- [sharp npm](https://www.npmjs.com/package/sharp) -- v0.34.5, image processing (HIGH confidence)
- [Phaser ScaleManager Docs](https://docs.phaser.io/api-documentation/class/scale-scalemanager) -- FIT mode, orientation events, resize events (HIGH confidence, official docs)
- [Phaser Scale.Events](https://docs.phaser.io/api-documentation/event/scale-events) -- ORIENTATION_CHANGE, RESIZE events (HIGH confidence, official docs)
- [Phaser 3 Mobile Text Input Discussion](https://phaser.discourse.group/t/how-to-force-mobile-keyboard-to-appear/11477) -- HTML input vs canvas input for virtual keyboard (MEDIUM confidence, community)
- [RexUI Virtual Joystick](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/) -- Plugin documentation (HIGH confidence)
- [phaser3-rex-plugins npm](https://www.npmjs.com/package/phaser3-rex-plugins) -- v1.80.x, feature list (HIGH confidence)
- [@stable-canvas/comfyui-client](https://github.com/StableCanvas/comfyui-client) -- TypeScript ComfyUI client, v1.5.7 (MEDIUM confidence)
- [inkjs GitHub](https://github.com/y-lohse/inkjs) -- Conditional branching, variable support for multiple endings (HIGH confidence)
- [ink Writing Documentation](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) -- Conditional diverts, variables, knots (HIGH confidence)
- [Adventure Game Hint System Pattern](https://docs.textadventures.co.uk/quest/guides/a_hint_system.html) -- Stage-gate progressive hints (MEDIUM confidence)

---
*Stack research for: KQGame v2.0 Art & Polish features*
*Researched: 2026-02-21*
*Key insight: Only ONE new npm dependency needed (sharp). Everything else is built on existing stack or external build tools.*
