# Phase 9: Art Pipeline & Schema Foundation - Research

**Researched:** 2026-02-21
**Domain:** Build-time art generation (ComfyUI/Flux), save schema versioning, lazy asset loading, save export/import
**Confidence:** HIGH

## Summary

Phase 9 covers three distinct technical domains that share no runtime dependencies: (1) infrastructure changes to the save system (schema versioning, MetaGameState, export/import), (2) a build-time art generation pipeline (ComfyUI + Flux + sharp), and (3) runtime lazy loading of room-specific art assets. The infrastructure work is pure TypeScript with zero new dependencies. The art pipeline is a standalone Node.js build script with one new devDependency (sharp). The lazy loading modifies the existing Preloader and RoomScene to load room backgrounds on entry rather than upfront.

The current codebase is well-structured for these changes. `GameStateData` is a clean interface with `serialize()`/`deserialize()` -- adding a version field and migration function is straightforward. The Preloader currently loads all 36 room JSONs plus 4 shared placeholder backgrounds eagerly -- this must change to load room-specific backgrounds lazily per room. The art pipeline is entirely offline and produces static PNGs that slot into the existing `public/assets/` structure.

**Primary recommendation:** Start with schema versioning (INFRA-01) as the very first code change since all subsequent saves must include the version field. Then build MetaGameState (INFRA-02) and export/import (INFRA-03). Art pipeline tooling (ART-01, ART-07) and art generation (ART-02 through ART-06) can proceed in parallel. Lazy loading bridges the art pipeline output to runtime.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | GameState save schema includes version field and migration support for v1->v2 saves | Schema versioning pattern with version field + migration chain documented; current `GameStateData` has no version field; `deserialize()` does raw `JSON.parse` with no validation |
| INFRA-02 | MetaGameState persists cross-playthrough data in separate localStorage key | Separate singleton + localStorage key pattern documented; current `SaveManager` uses `kqgame-autosave` and `kqgame-save-{N}` keys; MetaGameState needs `kqgame-meta` key |
| INFRA-03 | Save data export to JSON file and import from JSON file works correctly | Browser File API pattern (Blob + URL.createObjectURL + `<a download>` for export, `<input type="file">` + FileReader for import) documented; no new dependencies needed |
| ART-01 | Build script generates room backgrounds via ComfyUI + Flux with consistent pixel art style | ComfyUI REST API (POST /prompt, GET /history/{id}, GET /view) documented; Flux GGUF workflow node chain verified; sharp post-processing documented |
| ART-02 | All 36 room backgrounds replaced with Flux-generated pixel art at 960x540 | Room-specific background key scheme designed; current 4 shared placeholders replaced with per-room images; lazy loading prevents upfront load bloat |
| ART-03 | Parallax background layers generated per room with consistent style across acts | Layer strategy: shared sky/mountain layers per act (4 acts x 2 layers = 8 shared) + unique ground layer per room (36 unique); reduces generation from 144 to ~44 images |
| ART-04 | Player character sprite replaced with pixel art sprite (idle, walk, interact animations) | Current spritesheet format: 48x64px per frame, 16 frames (idle 0-3, walk 4-11, interact 12-15); Flux + LoRA generates base poses, sharp assembles spritesheet |
| ART-05 | Item sprites replaced with pixel art sprites on transparent/white backgrounds | 37 items need sprites; LoRA trigger "GRPZA" with "white background, game asset" prompt suffix; sharp removes white background / ensures alpha |
| ART-06 | NPC sprites replaced with pixel art sprites positioned correctly in rooms | 11 NPCs need sprites; each NPC has `position` and `zone` in room JSON; sprites must match zone dimensions |
| ART-07 | Art style guide document defines palette, pixel density, and prompt templates for consistency | Style guide defines: color palette (per act), pixel density (2x = 480x270 native upscaled), prompt templates with GRPZA trigger word, seed strategy for reproducibility |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | ^0.34.5 | Image post-processing (resize, crop, alpha, WebP) | Fastest Node.js image processor (libvips), handles PNG alpha correctly, zero system dependencies on macOS |
| ComfyUI | latest (Desktop or manual) | Local Flux image generation server | REST API (POST /prompt, GET /history, GET /view), workflow-as-JSON for reproducibility, native GGUF + LoRA support |
| Flux.1 Dev GGUF (Q5) | latest | Base image model | Higher quality than Schnell for final art; GGUF Q5 runs on Apple Silicon 16GB+; 20-step generation |
| Flux-2D-Game-Assets-LoRA | v1.0 | Pixel art game asset style | Trigger: GRPZA; Apache 2.0; designed for game assets with white backgrounds; from gokaygokay/Flux-2D-Game-Assets-LoRA on HuggingFace |

### Supporting (already in project)
| Library | Version | Purpose | Role in Phase 9 |
|---------|---------|---------|-----------------|
| Phaser | ^3.90.0 | Game engine | LoaderPlugin for dynamic asset loading; textures.exists() for cache checking |
| TypeScript | ~5.7.2 | Type system | GameStateData interface extension; type-safe migrations |
| Vitest | ^4.0.18 | Testing | Migration tests, MetaGameState tests, export/import tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sharp | ImageMagick CLI | sharp is 3-5x faster, clean Node.js API, no shell-out; ImageMagick is more powerful but harder to integrate |
| ComfyUI REST (plain fetch) | @stable-canvas/comfyui-client | Only 3 endpoints needed; plain fetch has zero deps; client lib adds coupling to rapidly-changing API |
| Flux.1 Dev GGUF Q5 | Flux.1 Dev FP16 | FP16 needs 24GB+ VRAM; GGUF Q5 runs on 16GB Apple Silicon with minimal quality loss |
| Flux.1 Dev | Flux.1 Schnell | Schnell is faster (4 steps) but lower quality; build-time speed doesn't matter |

**Installation:**
```bash
# Only new npm dependency (dev dependency for build scripts)
npm install -D sharp@^0.34.5

# External tools (NOT npm -- installed separately)
# ComfyUI Desktop: https://docs.comfy.org/installation/desktop/macos
# ComfyUI-GGUF custom node: install via ComfyUI Manager
# Models downloaded to ComfyUI model directories (see Architecture section)
```

## Architecture Patterns

### Recommended Project Structure
```
scripts/
  generate-art.ts          # Build script: ComfyUI API + sharp post-processing
  art-manifest.json        # Maps room IDs to prompts, dimensions, seeds
  comfyui-workflow.json    # Template workflow exported from ComfyUI (API format)
  style-guide.json         # Palette, pixel density, prompt templates per act

src/game/
  state/
    GameStateTypes.ts      # MODIFIED: add version field, v2 fields
    GameState.ts           # MODIFIED: add migration logic to deserialize()
    MetaGameState.ts       # NEW: cross-playthrough persistence singleton
    SaveManager.ts         # MODIFIED: add export/import, call migration on load
    migrations/
      index.ts             # Migration registry: version -> migration function
      v1-to-v2.ts          # Migrate v1.0 saves to v2.0 schema
  scenes/
    Preloader.ts           # MODIFIED: remove room background loads (lazy now)
    RoomScene.ts           # MODIFIED: lazy-load room backgrounds on entry

public/assets/
  backgrounds/
    shared/                # Shared parallax layers per act
      act1-sky.png         # Shared across Act 1 rooms
      act1-mountains.png
      act2-sky.png
      ...
    rooms/                 # Per-room unique background layers
      forest_clearing.png  # 960x540 (or wider for wide rooms)
      cave_entrance.png
      ...
  sprites/
    player.png             # Pixel art spritesheet (48x64 x 16 frames)
    items/                 # Per-item sprites
      rusty-key.png
      glowing-mushroom.png
      ...
    npcs/                  # Per-NPC sprites
      old_man.png
      bridge_troll.png
      ...
```

### Pattern 1: Save Schema Versioning with Migration Chain
**What:** Every serialized GameStateData includes a `version` number. On deserialize, if version < current, run migration functions in sequence.
**When to use:** Any time the serialized data shape changes between releases.
**Example:**
```typescript
// GameStateTypes.ts
export interface GameStateData {
    version: number;  // NEW: schema version (current = 2)
    currentRoom: string;
    inventory: string[];
    flags: Record<string, boolean | string>;
    visitedRooms: string[];
    removedItems: Record<string, string[]>;
    playTimeMs: number;
    deathCount: number;
    dialogueStates: Record<string, string>;
}

// Migration chain
type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, MigrationFn> = {
    // v1 (no version field) -> v2
    1: (data) => ({
        ...data,
        version: 2,
        // Add any new v2 fields with defaults
    }),
};

function migrate(raw: Record<string, unknown>): GameStateData {
    let version = (raw.version as number) ?? 1; // No version field = v1
    let data = { ...raw };

    while (version < CURRENT_VERSION) {
        const fn = migrations[version];
        if (!fn) throw new Error(`No migration for version ${version}`);
        data = fn(data);
        version = (data.version as number);
    }

    return data as GameStateData;
}
```

**Key insight:** v1.0 saves have NO `version` field. Absence of version field === version 1. The migration adds `version: 2` and any new default fields. Existing fields pass through unchanged.

### Pattern 2: MetaGameState Separate Persistence
**What:** A singleton that stores cross-playthrough data (death gallery, ending discoveries) in its own localStorage key, independent of save slots.
**When to use:** Data that should survive "New Game" resets and save slot loads.
**Example:**
```typescript
// MetaGameState.ts
const META_KEY = 'kqgame-meta';

export interface MetaGameStateData {
    version: number;
    deathsDiscovered: string[];    // Death IDs seen across all playthroughs
    endingsDiscovered: string[];   // Ending IDs reached across all playthroughs
}

export class MetaGameState {
    private static instance: MetaGameState;
    private data: MetaGameStateData;

    private constructor() {
        this.data = this.load();
    }

    static getInstance(): MetaGameState {
        if (!MetaGameState.instance) {
            MetaGameState.instance = new MetaGameState();
        }
        return MetaGameState.instance;
    }

    private load(): MetaGameStateData {
        try {
            const raw = localStorage.getItem(META_KEY);
            if (!raw) return this.getDefault();
            return JSON.parse(raw) as MetaGameStateData;
        } catch {
            return this.getDefault();
        }
    }

    save(): void {
        localStorage.setItem(META_KEY, JSON.stringify(this.data));
    }

    private getDefault(): MetaGameStateData {
        return { version: 1, deathsDiscovered: [], endingsDiscovered: [] };
    }

    recordDeath(deathId: string): boolean {
        if (this.data.deathsDiscovered.includes(deathId)) return false;
        this.data.deathsDiscovered.push(deathId);
        this.save();
        return true; // true = new discovery
    }

    // ... similar for endings
}
```

**Key insight:** MetaGameState auto-saves on every mutation. It does NOT participate in GameState.serialize()/deserialize(). New Game and Load Game leave it untouched.

### Pattern 3: Lazy Asset Loading Per Room
**What:** Room-specific background images load when the room is entered, not during initial Preloader. A loading indicator shows during the brief load.
**When to use:** When total asset size exceeds acceptable initial load time (36 rooms x ~200KB each = ~7MB of backgrounds alone).
**Example:**
```typescript
// In RoomScene.create(), before rendering backgrounds:
private async loadRoomAssets(): Promise<void> {
    const keysToLoad: Array<{ key: string; path: string }> = [];

    for (const layer of this.roomData.background.layers) {
        if (!this.textures.exists(layer.key)) {
            keysToLoad.push({
                key: layer.key,
                path: `assets/backgrounds/${layer.key}.png`
            });
        }
    }

    if (keysToLoad.length === 0) return; // All cached

    return new Promise<void>((resolve) => {
        for (const { key, path } of keysToLoad) {
            this.load.image(key, path);
        }
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
        this.load.start();
    });
}
```

**Key insight:** Phaser caches loaded textures globally. Once a room's background is loaded, revisiting that room has zero load time. The initial Preloader only loads the starting room's assets + shared assets (player sprite, UI, audio, JSON data files).

### Pattern 4: Save Export/Import via Browser File API
**What:** Export serializes GameState + MetaGameState to a JSON file download. Import reads a JSON file and restores both.
**When to use:** Cross-browser save transfer, backup.
**Example:**
```typescript
// Export
static exportSave(state: GameState, meta: MetaGameState): void {
    const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        gameState: JSON.parse(state.serialize()),
        metaState: meta.getData(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kqgame-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import
static async importSave(file: File): Promise<{ gameState: string; metaState: MetaGameStateData }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result as string);
                // Validate structure before accepting
                if (!data.gameState || !data.metaState) {
                    throw new Error('Invalid save file format');
                }
                resolve({
                    gameState: JSON.stringify(data.gameState),
                    metaState: data.metaState,
                });
            } catch (e) {
                reject(new Error('Failed to parse save file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
```

### Pattern 5: ComfyUI Build Script (Offline Art Generation)
**What:** A Node.js script that reads an art manifest, submits prompts to ComfyUI REST API, downloads results, and post-processes with sharp.
**When to use:** Build-time only. Run manually when generating or regenerating art.
**Example:**
```typescript
// scripts/generate-art.ts
const COMFYUI_URL = 'http://127.0.0.1:8188';

async function generateImage(prompt: string, seed: number): Promise<Buffer> {
    // 1. Load workflow template and inject prompt + seed
    const workflow = JSON.parse(fs.readFileSync('scripts/comfyui-workflow.json', 'utf-8'));
    // Modify the CLIPTextEncode node's text input
    workflow['6'].inputs.text = prompt;
    // Modify the RandomNoise node's seed
    workflow['25'].inputs.noise_seed = seed;

    // 2. Submit to ComfyUI
    const res = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
    });
    const { prompt_id } = await res.json();

    // 3. Poll until complete
    let output: any;
    while (!output) {
        await new Promise(r => setTimeout(r, 2000));
        const history = await fetch(`${COMFYUI_URL}/history/${prompt_id}`);
        const data = await history.json();
        if (data[prompt_id]?.outputs) {
            output = data[prompt_id].outputs;
        }
    }

    // 4. Download the generated image
    const imageInfo = Object.values(output)[0] as any;
    const filename = imageInfo.images[0].filename;
    const imgRes = await fetch(
        `${COMFYUI_URL}/view?filename=${filename}&type=output`
    );
    return Buffer.from(await imgRes.arrayBuffer());
}

async function processRoomBackground(name: string, rawPng: Buffer): Promise<void> {
    await sharp(rawPng)
        .resize(960, 540, { fit: 'cover' })
        .png()
        .toFile(`public/assets/backgrounds/rooms/${name}.png`);
}
```

### Anti-Patterns to Avoid
- **Deserializing without migration:** Never `JSON.parse(json) as GameStateData` on loaded saves. Always run through the migration chain first. A v1 save missing the `version` field will crash if type-asserted directly.
- **MetaGameState inside save slots:** Death gallery and ending discoveries MUST NOT be stored in `GameStateData`. Loading an old save would erase gallery progress.
- **Eager loading all room backgrounds:** With 36 real PNG backgrounds (~200KB each), loading everything upfront would push initial load to 10+ seconds. Lazy load per room.
- **Runtime image generation:** ComfyUI generates images in 1-5 minutes each. This is a build-time tool, never runtime.
- **Modifying room JSON `background.layers` keys for placeholders AND real art simultaneously:** Use the same key scheme. Rooms should reference their specific asset keys (e.g., `bg-forest_clearing-ground`), and the Preloader/RoomScene decides whether to load from shared placeholders or room-specific files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize/crop/format | Custom canvas manipulation | sharp | Handles PNG alpha, ICC profiles, WebP conversion; 10x faster than canvas |
| ComfyUI API client | Full HTTP client wrapper | Plain fetch() with 3 endpoints | Only POST /prompt, GET /history/{id}, GET /view needed; avoid library churn |
| Save file download | Custom download mechanism | Blob + URL.createObjectURL + `<a download>` | Browser-standard pattern; works cross-browser; 5 lines of code |
| Save file upload | Custom file reading | `<input type="file">` + FileReader API | Browser-standard pattern; handles all edge cases; no library needed |
| Schema migration framework | Custom migration registry | Simple version + while loop pattern | Only 1 migration needed now (v1->v2); keep it simple; expand pattern later if more versions |

**Key insight:** This phase has zero new runtime npm dependencies. sharp is devDependency only. All browser features (File API, Blob, FileReader) are built-in.

## Common Pitfalls

### Pitfall 1: v1.0 Saves Missing Version Field
**What goes wrong:** Code assumes `data.version` exists and crashes on `undefined`.
**Why it happens:** All existing v1.0 saves in localStorage have no `version` field because it was never part of `GameStateData`.
**How to avoid:** Treat `version === undefined` or `version === null` as version 1. The migration chain starts from version 1 for these saves.
**Warning signs:** Any `data.version` access without fallback; any strict equality check against version numbers without handling undefined.

### Pitfall 2: GameState.reset() Clobbering New Fields
**What goes wrong:** `getDefaultState()` returns a fresh object, but if new v2 fields are forgotten in the default, deserialized v2 saves can lose data on reset.
**Why it happens:** `getDefaultState()` must be updated in sync with `GameStateData` interface changes.
**How to avoid:** Update `getDefaultState()` every time `GameStateData` is extended. TypeScript will catch missing required fields if the interface is properly typed.
**Warning signs:** Tests that call `state.reset()` followed by assertions on new fields failing.

### Pitfall 3: Lazy Loading Race Condition in RoomScene
**What goes wrong:** RoomScene.create() starts rendering backgrounds before the lazy load completes, showing missing texture errors.
**Why it happens:** `this.load.start()` is async but `create()` continues synchronously.
**How to avoid:** Gate background rendering behind the load completion callback. Show a brief loading indicator (even a simple black screen with "Loading..." text) during the 100-500ms room asset load.
**Warning signs:** "Texture missing" console warnings when entering a room for the first time.

### Pitfall 4: ComfyUI Workflow Node IDs Changing
**What goes wrong:** Build script references node "6" for the text prompt, but after re-exporting the workflow from ComfyUI, node IDs change.
**Why it happens:** ComfyUI assigns node IDs sequentially. Re-arranging nodes in the UI changes IDs.
**How to avoid:** Use a stable workflow template JSON committed to the repo. When modifying the workflow, re-export and update the node ID references in the build script. Add a comment mapping: `// Node 6 = CLIPTextEncode (prompt text)`.
**Warning signs:** Build script sends correct prompt text but generated image doesn't match (wrong node was modified).

### Pitfall 5: sharp Alpha Channel Loss on Resize
**What goes wrong:** Transparent PNG sprites get black backgrounds after sharp processing.
**Why it happens:** sharp defaults to opaque black background when resizing with `contain` fit. PNG alpha channel is preserved only if explicitly configured.
**How to avoid:** For sprites with transparency, always use: `sharp(input).ensureAlpha().resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(output)`.
**Warning signs:** Item sprites or parallax layers showing black rectangles instead of transparency.

### Pitfall 6: MetaGameState Not Initialized Before GameState Load
**What goes wrong:** A death that occurs before MetaGameState is initialized gets lost.
**Why it happens:** MetaGameState is a new singleton that must be initialized early in the boot process.
**How to avoid:** Initialize MetaGameState in the Boot scene, before any gameplay begins. It should load from localStorage in its constructor.
**Warning signs:** First death after a fresh page load not appearing in the gallery.

### Pitfall 7: Room JSON Background Key Mismatch
**What goes wrong:** Room JSON references `bg-forest_clearing-ground` but the file is at `backgrounds/rooms/forest_clearing.png`.
**Why it happens:** The key in the JSON must match what Phaser's loader registers, and the path must match the file location.
**How to avoid:** Establish a clear naming convention: key = `bg-rooms-{roomId}` for ground layers, `bg-shared-{actId}-{layer}` for shared layers. Document the convention in the style guide.
**Warning signs:** Invisible backgrounds in specific rooms; "Texture not found" warnings.

### Pitfall 8: Export File Missing MetaGameState
**What goes wrong:** User exports save, imports on different browser, death gallery is empty.
**Why it happens:** Export only serialized GameState but forgot MetaGameState.
**How to avoid:** The export bundle must include BOTH GameState and MetaGameState. On import, restore both. Validate the import file contains both sections.
**Warning signs:** Import succeeds (game loads) but gallery/achievements are empty.

## Code Examples

### Current GameStateData (v1.0 -- no version field)
```typescript
// Source: src/game/state/GameStateTypes.ts (current)
export interface GameStateData {
    currentRoom: string;
    inventory: string[];
    flags: Record<string, boolean | string>;
    visitedRooms: string[];
    removedItems: Record<string, string[]>;
    playTimeMs: number;
    deathCount: number;
    dialogueStates: Record<string, string>;
}
```

### v2.0 GameStateData (with version + migration support)
```typescript
// Source: designed for this phase
export const CURRENT_SAVE_VERSION = 2;

export interface GameStateData {
    version: number;                    // NEW: schema version
    currentRoom: string;
    inventory: string[];
    flags: Record<string, boolean | string>;
    visitedRooms: string[];
    removedItems: Record<string, string[]>;
    playTimeMs: number;
    deathCount: number;
    dialogueStates: Record<string, string>;
}

export function getDefaultState(): GameStateData {
    return {
        version: CURRENT_SAVE_VERSION,  // NEW
        currentRoom: 'forest_clearing',
        inventory: [],
        flags: {},
        visitedRooms: [],
        removedItems: {},
        playTimeMs: 0,
        deathCount: 0,
        dialogueStates: {},
    };
}
```

### Migration Function (v1 -> v2)
```typescript
// Source: designed for this phase
export function migrateV1toV2(data: Record<string, unknown>): GameStateData {
    // v1 saves have no version field -- add it
    // All existing v1 fields pass through unchanged
    return {
        version: 2,
        currentRoom: (data.currentRoom as string) ?? 'forest_clearing',
        inventory: (data.inventory as string[]) ?? [],
        flags: (data.flags as Record<string, boolean | string>) ?? {},
        visitedRooms: (data.visitedRooms as string[]) ?? [],
        removedItems: (data.removedItems as Record<string, string[]>) ?? {},
        playTimeMs: (data.playTimeMs as number) ?? 0,
        deathCount: (data.deathCount as number) ?? 0,
        dialogueStates: (data.dialogueStates as Record<string, string>) ?? {},
    };
}
```

### GameState.deserialize() with Migration
```typescript
// Source: designed for this phase (modifying existing GameState.ts)
deserialize(json: string): void {
    const raw = JSON.parse(json) as Record<string, unknown>;
    this.data = migrate(raw); // Always run through migration chain
}
```

### Phaser Dynamic Loading in RoomScene
```typescript
// Source: Phaser 3 LoaderPlugin pattern (verified via official docs + community)
// In RoomScene, load room-specific backgrounds on entry
private loadRoomAssets(): Promise<void> {
    const toLoad: Array<{ key: string; path: string }> = [];

    for (const layer of this.roomData.background.layers) {
        if (!this.textures.exists(layer.key)) {
            // Determine path from key convention
            const path = layer.key.startsWith('bg-shared-')
                ? `assets/backgrounds/shared/${layer.key.replace('bg-shared-', '')}.png`
                : `assets/backgrounds/rooms/${layer.key.replace('bg-rooms-', '')}.png`;
            toLoad.push({ key: layer.key, path });
        }
    }

    if (toLoad.length === 0) return Promise.resolve();

    return new Promise<void>((resolve) => {
        for (const { key, path } of toLoad) {
            this.load.image(key, path);
        }
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
        this.load.start();
    });
}
```

### ComfyUI Flux GGUF + LoRA Workflow Node Chain (API Format)
```typescript
// Source: Verified from HuggingFace gguf-org/flux-dev-gguf workflow + ComfyUI docs
// API format JSON submitted to POST /prompt
// Node chain: LoaderGGUF -> LoraLoaderModelOnly -> ModelSamplingFlux ->
//             BasicGuider -> SamplerCustomAdvanced -> VAEDecode -> SaveImage
// Plus: DualClipLoaderGGUF -> CLIPTextEncode -> FluxGuidance -> BasicGuider
//
// Key node class_types for Flux GGUF + LoRA:
// - "UnetLoaderGGUF" or "LoaderGGUF": loads the GGUF model
// - "DualClipLoaderGGUF": loads CLIP L + T5XXL encoders
// - "LoraLoaderModelOnly": applies LoRA to model (inserted between loader and sampler)
//   inputs: { model: [loader_node, 0], lora_name: "Flux-2D-Game-Assets-LoRA.safetensors",
//             strength_model: 0.8 }
// - "CLIPTextEncode": text prompt encoding
// - "FluxGuidance": guidance scale (3.5 recommended for Flux Dev)
// - "ModelSamplingFlux": sampling configuration
// - "BasicGuider": connects model + conditioning
// - "BasicScheduler": scheduler (simple, 20 steps)
// - "KSamplerSelect": sampler selection (euler)
// - "SamplerCustomAdvanced": the actual sampling step
// - "VAEDecode": latent to image
// - "SaveImage": output
//
// Recommended settings for Flux Dev GGUF:
// - Sampler: euler
// - Scheduler: simple
// - Steps: 20 (Dev quality) or 8 (with Turbo LoRA)
// - Guidance: 3.5
// - Resolution: 1024x1024 (resize to 960x540 with sharp after)
```

### sharp Post-Processing for Room Backgrounds
```typescript
// Source: sharp official docs (sharp.pixelplumbing.com)
import sharp from 'sharp';

// Room background: resize 1024x1024 Flux output to 960x540
async function processRoomBackground(input: Buffer, outputPath: string): Promise<void> {
    await sharp(input)
        .resize(960, 540, { fit: 'cover' })  // Crop to exact dimensions
        .png({ compressionLevel: 9 })
        .toFile(outputPath);
}

// Wide room background: resize to worldWidth x 540
async function processWideRoomBackground(
    input: Buffer, outputPath: string, worldWidth: number
): Promise<void> {
    await sharp(input)
        .resize(worldWidth, 540, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(outputPath);
}

// Item/NPC sprite: preserve transparency
async function processSprite(input: Buffer, outputPath: string, w: number, h: number): Promise<void> {
    await sharp(input)
        .ensureAlpha()
        .resize(w, h, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
}
```

### Save Export/Import (Browser File API)
```typescript
// Source: Standard Web API pattern (Blob, URL.createObjectURL, FileReader)

// Export: download save as JSON file
function exportSaveFile(gameState: GameState, metaState: MetaGameState): void {
    const exportData = {
        format: 'kqgame-save',
        version: 1,
        exportedAt: new Date().toISOString(),
        gameState: JSON.parse(gameState.serialize()),
        metaState: metaState.getData(),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `kqgame-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import: read JSON file and restore state
function importSaveFile(): Promise<{ gameState: string; metaState: object }> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) { reject(new Error('No file selected')); return; }

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string);
                    if (data.format !== 'kqgame-save') {
                        throw new Error('Not a KQGame save file');
                    }
                    resolve({
                        gameState: JSON.stringify(data.gameState),
                        metaState: data.metaState,
                    });
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        };

        input.click();
    });
}
```

## State of the Art

| Old Approach (v1.0) | Current Approach (v2.0) | When Changed | Impact |
|---------------------|------------------------|--------------|--------|
| No schema version on saves | Version field + migration chain | Phase 9 | All future schema changes are safe; v1 saves auto-migrate |
| All backgrounds shared (4 placeholders) | Per-room unique backgrounds | Phase 9 | Each room has distinct pixel art; visual identity |
| All assets loaded in Preloader | Room backgrounds lazy-loaded on entry | Phase 9 | Initial load drops from ~10s to <5s |
| No MetaGameState | Separate localStorage singleton | Phase 9 | Cross-playthrough data (death gallery, endings) persists |
| No save export/import | JSON file download/upload | Phase 9 | Players can backup and transfer saves |

**Key changes to existing code:**
- `GameStateData`: add `version` field (BREAKING for v1 saves without migration)
- `GameState.deserialize()`: wrap in migration before assignment
- `getDefaultState()`: include `version: 2`
- `SaveManager`: add `exportSave()` and `importSave()` static methods; run migration on all load paths
- `Preloader.ts`: remove individual room background load calls; keep player sprite, JSON data, audio, dialogue loads
- `RoomScene.ts`: add lazy-load call in create() before background rendering
- Room JSON files: update `background.layers[].key` from shared placeholders to room-specific keys

## Open Questions

1. **Room Background Key Naming Convention**
   - What we know: Currently all 36 rooms share 4 keys (bg-sky, bg-mountains, bg-trees, bg-ground). With real art, each room needs unique ground-layer keys.
   - What's unclear: Whether to change the key scheme in room JSONs (requires updating all 36 files) or add a key-mapping layer in the loader.
   - Recommendation: Update room JSONs with new key names. It's a one-time bulk change and keeps the data files as the source of truth. Convention: `bg-rooms-{roomId}` for unique layers, `bg-shared-{actN}-{layerName}` for shared parallax layers.

2. **Parallax Layer Strategy for Real Art**
   - What we know: Currently 4 shared layers with scroll factors 0, 0.1, 0.4, 1.0. Real art needs per-room ground layers but sky/mountains can stay shared per act.
   - What's unclear: How many parallax layers per room -- keep 4, reduce to 2-3, or vary per room?
   - Recommendation: Standardize on 3 layers per room: (1) shared sky (scrollFactor 0), (2) shared mid-ground per act (scrollFactor 0.3), (3) unique room ground layer (scrollFactor 1). This reduces total image generation from 144 to ~44 images while keeping parallax effect.

3. **Loading Indicator During Lazy Load**
   - What we know: Phaser dynamic loading takes 100-500ms per image on broadband. During this time, the scene has no background.
   - What's unclear: Whether a loading spinner or the transition fade-in is enough to mask the load time.
   - Recommendation: Use the existing fade-in transition (500ms) as the loading mask. Start the lazy load in `init()` before `create()` renders, so by the time the fade completes, assets are ready. If not ready, show a simple "Loading..." text that clears when complete.

4. **LoRA Prompt Template for Wide Rooms**
   - What we know: Some rooms have worldWidth of 1920 (double the viewport). Flux generates at 1024x1024.
   - What's unclear: Best approach for generating panoramic/wide backgrounds.
   - Recommendation: Generate at 2048x1024 (Flux supports non-square) or generate two 1024x1024 halves and stitch with sharp. The stitching approach may have seam artifacts. Test both.

## Sources

### Primary (HIGH confidence)
- [ComfyUI REST API Routes](https://docs.comfy.org/development/comfyui-server/comms_routes) -- POST /prompt, GET /history/{id}, GET /view endpoints confirmed
- [ComfyUI API & Programmatic Usage (DeepWiki)](https://deepwiki.com/Comfy-Org/ComfyUI/7-api-and-programmatic-usage) -- Workflow JSON format, node ID structure
- [ComfyUI Workflow JSON Format (DeepWiki)](https://deepwiki.com/Comfy-Org/ComfyUI/7.3-workflow-json-format) -- API format: class_type, inputs, [node_id, output_index] references
- [Flux Dev GGUF Workflow (HuggingFace)](https://huggingface.co/gguf-org/flux-dev-gguf/blob/main/workflow-flux-dev.json) -- Verified node chain: LoaderGGUF -> ModelSamplingFlux -> BasicGuider -> SamplerCustomAdvanced -> VAEDecode -> SaveImage
- [Flux-2D-Game-Assets-LoRA (HuggingFace)](https://huggingface.co/gokaygokay/Flux-2D-Game-Assets-LoRA) -- Trigger: GRPZA, Apache 2.0, white background game assets
- [sharp API - Resize](https://sharp.pixelplumbing.com/api-resize/) -- resize() with fit options (cover, contain, fill), background for alpha
- [sharp npm](https://www.npmjs.com/package/sharp) -- v0.34.5, libvips, Node 18.17+
- [Phaser 3 LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) -- Dynamic loading outside preload()
- [Phaser 3 Loader Concepts](https://docs.phaser.io/phaser/concepts/loader) -- "You can add assets to the Loader at any point in your game"
- Existing codebase: GameStateTypes.ts, GameState.ts, SaveManager.ts, Preloader.ts, RoomScene.ts (all verified by reading)

### Secondary (MEDIUM confidence)
- [Phaser 3 Dynamic Image Loading (Ourcade)](https://blog.ourcade.co/posts/2020/phaser3-load-images-dynamically/) -- textures.exists() + load.image() + load.once('complete') + load.start() pattern
- [Phaser 3 Optimization 2025 (Medium)](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b) -- Lazy loading as key optimization
- [LoraLoaderModelOnly (ComfyUI)](https://comfyui-wiki.com/en/comfyui-nodes/loaders/lora-loader-model-only) -- LoRA node inserted between model loader and sampler
- [Flux GGUF + LoRA in ComfyUI (kombitz)](https://www.kombitz.com/2026/01/01/how-to-use-flux-2-dev-turbo-lora-in-comfyui-with-gguf-models/) -- Turbo LoRA reduces steps to 8
- [9elements ComfyUI API Hosting](https://9elements.com/blog/hosting-a-comfyui-workflow-via-api/) -- Workflow export (API format), programmatic submission
- [Versioning TypeScript Types (Saleae)](https://blog.saleae.com/versioning-typescript-types/) -- Type versioning + upgrade functions pattern
- [migrate-local-storage npm](https://www.npmjs.com/package/migrate-local-storage) -- Migration pattern for localStorage (pattern reference, NOT used as dependency)

### Tertiary (LOW confidence)
- [sharp transparent PNG resize issue #1956](https://github.com/lovell/sharp/issues/1956) -- Black background on resize; requires explicit alpha background -- needs validation with actual sprite images

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- sharp is well-documented, ComfyUI API verified from official docs, Flux GGUF workflow verified from HuggingFace
- Architecture (save schema/migration): HIGH -- pattern is simple and well-established; current codebase structure is clean
- Architecture (lazy loading): HIGH -- Phaser dynamic loading is documented and widely used; pattern verified
- Architecture (art pipeline): MEDIUM -- ComfyUI workflow specifics depend on actual model/LoRA behavior; node IDs may vary
- Pitfalls: HIGH -- identified from direct codebase analysis and known patterns

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain; sharp and Phaser APIs unlikely to change)
