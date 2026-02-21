# Architecture Research: v2.0 Art & Polish Integration

**Domain:** Feature integration into existing Phaser 3 adventure game
**Researched:** 2026-02-21
**Confidence:** HIGH for existing architecture analysis, MEDIUM for Flux pipeline specifics

## Executive Summary

The v2.0 features -- Flux art pipeline, progressive hints, death gallery, mobile layout, and multiple endings -- integrate into the existing architecture through well-defined extension points. The codebase already follows data-driven patterns (JSON room files, EventBus decoupling, singleton state) that make most features additive rather than invasive. The critical architectural insight is that **none of these features require rewriting existing systems**; they extend them through new components that hook into existing EventBus events, GameState data, and the JSON room data schema.

The Flux art pipeline is the only feature that operates outside runtime -- it is a build-time/offline tool that produces assets consumed by the existing Preloader. All other features are runtime additions that integrate through the established patterns.

---

## Current Architecture Map

### System Topology (As-Built)

```
                    +-----------------------+
                    |      index.html       |
                    |   #app > #game-container
                    +----------+------------+
                               |
              +----------------+----------------+
              |                                 |
   +----------v-----------+          +----------v-----------+
   |    Phaser Canvas      |          |    HTML Overlays      |
   |    (960x540, FIT)     |          |  TextInputBar         |
   |                       |          |  NarratorDisplay       |
   |  Scenes:              |          |  InventoryPanel        |
   |   Boot -> Preloader   |          |  DialogueUI            |
   |   -> MainMenuScene    |          +----------+-------------+
   |   -> RoomScene        |                     |
   |   -> DeathScene       |                     |
   +----------+------------+                     |
              |                                  |
   +----------v----------------------------------v-----------+
   |                    EventBus (Phaser.Events)              |
   |  Events: command-submitted, trigger-death, go-command,   |
   |  item-picked-up, inventory-toggle, load-game,            |
   |  room-update, start-dialogue, scene-ready                |
   +----+----------+----------+----------+----------+---------+
        |          |          |          |          |
   +----v---+ +----v---+ +----v---+ +----v---+ +----v---+
   |Command | |Puzzle  | |Game    | |Save    | |Audio   |
   |Dispatch| |Engine  | |State   | |Manager | |Manager |
   +--------+ +--------+ +--------+ +--------+ +--------+
        |
   +----v-----------+
   |  HybridParser   |
   |  (TextParser +  |
   |   OllamaClient) |
   +----------------+
```

### Key Extension Points Identified

| Extension Point | Mechanism | Used By v2 Features |
|----------------|-----------|---------------------|
| `GameStateData` interface + `GameState` singleton | Add new fields, serialize/deserialize automatically | Death gallery, multiple endings, hint tracking |
| `EventBus` events | Add new event types, existing systems listen | Hints (puzzle-attempt-failed), death gallery (death-recorded) |
| `RoomData` JSON schema | Add optional fields to room JSON | Hints (per-puzzle hints), art assets (new background keys), endings (branch points) |
| `PuzzleAction` union type | Add new action types to the discriminated union | Multiple endings (trigger-ending), hints (show-hint) |
| `PuzzleCondition` union type | Add new condition types | Multiple endings (ending-path conditions) |
| `DeathScene` overlay | Extend with gallery link, death-specific art | Death gallery |
| `Preloader` asset loading | Add new asset load calls | Flux-generated backgrounds, item sprites, ending scenes |
| `style.css` + HTML overlay pattern | CSS media queries, new HTML elements | Mobile layout |
| `Phaser.Scale` config in `main.ts` | Adjust scale mode, add resize handlers | Mobile responsive |

---

## Feature 1: Flux Art Generation Pipeline

### Architecture Decision: Offline Tool, Not Runtime

The Flux pipeline is a **build-time/offline asset generation tool**, NOT a runtime system. It produces PNG files that replace placeholder assets in `public/assets/`. The game engine does not change -- it already loads images by key from the Preloader.

### Component Architecture

```
OFFLINE PIPELINE (not part of game runtime)
============================================

  +------------------+     +------------------+     +------------------+
  |  Art Manifest    |---->|  Generation      |---->|  Post-Processing |
  |  (JSON config)   |     |  Script          |     |  (pixelate,      |
  |                  |     |  (Python/Node)   |     |   palette,       |
  |  Per-room:       |     |                  |     |   resize)        |
  |  - prompt        |     |  ComfyUI API     |     +--------+---------+
  |  - style refs    |     |  or diffusers    |              |
  |  - dimensions    |     +------------------+              v
  |  - seed/cfg      |                              +--------+---------+
  +------------------+                              |  Output to       |
                                                    |  public/assets/  |
                                                    |  backgrounds/    |
                                                    |  sprites/        |
                                                    +------------------+
```

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `tools/art-pipeline/manifest.json` | Project root (not src/) | Defines all assets to generate: room backgrounds, item sprites, character art. Maps room IDs to prompts, style parameters, dimensions |
| `tools/art-pipeline/generate.py` | Project root | Python script that reads manifest, calls ComfyUI API or diffusers pipeline, saves outputs |
| `tools/art-pipeline/postprocess.py` | Project root | Pixel art post-processing: downscale to native resolution, apply palette constraints, ensure consistent style |
| `tools/art-pipeline/style-guide.json` | Project root | Style parameters shared across all generations: color palette, pixel density, art direction keywords |

### Integration With Existing Architecture

**Zero runtime changes required.** The pipeline produces files that slot directly into the existing asset loading flow:

1. Pipeline generates `public/assets/backgrounds/cave_entrance_bg.png` (replacing placeholder `bg-ground`)
2. Room JSON already references background layer keys: `{ "key": "bg-cave-entrance", "scrollFactor": 1 }`
3. Preloader already loads by key: `this.load.image('bg-cave-entrance', 'assets/backgrounds/cave_entrance_bg.png')`
4. RoomScene already renders layers by key with parallax

**Modification needed in Preloader.ts:** Replace placeholder background load calls with room-specific background loads. Currently all rooms share the same 4 placeholder layers (`bg-sky`, `bg-mountains`, `bg-trees`, `bg-ground`). With Flux art, each room gets unique backgrounds.

**Modification needed in room JSONs:** Update `background.layers[].key` values from shared placeholders to room-specific asset keys.

### Data Flow

```
manifest.json --> generate.py --> ComfyUI/diffusers --> raw PNG
                                                         |
                                                         v
                                              postprocess.py --> pixel art PNG
                                                                      |
                                                                      v
                                                          public/assets/backgrounds/
                                                                      |
                                                                      v
                                                     Preloader.ts loads by key
                                                                      |
                                                                      v
                                                 RoomScene.create() renders layers
```

### Asset Manifest Schema

```typescript
// tools/art-pipeline/manifest.json
interface ArtManifest {
  style: {
    basePromptSuffix: string;  // "pixel art, 16-bit, fantasy adventure game"
    negativePrompt: string;
    colorPalette: string[];    // Hex colors for palette constraint
    pixelScale: number;        // Target pixel size (e.g., 2 = 480x270 upscaled to 960x540)
  };
  rooms: Record<string, {
    layers: Array<{
      key: string;             // Matches Phaser asset key
      prompt: string;          // Generation prompt
      dimensions: { width: number; height: number };  // Output size
      scrollFactor: number;    // Parallax factor (for reference)
      seed?: number;           // Fixed seed for reproducibility
    }>;
  }>;
  sprites: Record<string, {
    prompt: string;
    dimensions: { width: number; height: number };
    frameCount?: number;       // For sprite sheets
    seed?: number;
  }>;
}
```

### Why ComfyUI Over Raw diffusers

ComfyUI provides a node-based workflow that can be saved and reproduced, supports ControlNet for pose/composition consistency, has native LoRA support for pixel art models like Pixel-Art-XL, and exposes a REST API for programmatic generation. The workflow file becomes a version-controlled artifact that ensures all team members generate assets with identical parameters.

**Confidence: MEDIUM** -- ComfyUI API integration patterns are well-documented but the specific pixel art workflow quality depends on model/LoRA selection that needs iterative testing.

---

## Feature 2: Progressive Hint System

### Architecture Decision: EventBus-Driven Hint Manager

The hint system hooks into the existing command dispatch flow. When a player attempts an action that fails (puzzle conditions not met, wrong verb/subject), the HintManager tracks these attempts and offers progressively more specific hints.

### Component Architecture

```
                    command-submitted
                          |
                          v
                    HybridParser.parse()
                          |
                          v
                    CommandDispatcher.dispatch()
                          |
                   +------+------+
                   |             |
              (success)    (failure / no match)
                   |             |
                   v             v
              normal flow   EventBus.emit('hint-opportunity', {
                              roomId, verb, subject, target,
                              puzzleContext })
                                  |
                                  v
                            +-----+-------+
                            | HintManager |
                            +-----+-------+
                                  |
                    (check attempt count for this puzzle area)
                                  |
                    +-------------+-------------+
                    |             |             |
                 (1-2 tries)  (3-5 tries)   (6+ tries)
                    |             |             |
                    v             v             v
              "Hmm, maybe    "That door    "Use the rusty
               look around    needs a key   key on the
               more..."       of some       locked door."
                              kind..."
                                  |
                                  v
                    NarratorDisplay.typewrite(hint)
```

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `src/game/systems/HintManager.ts` | Systems | Tracks failed attempts per puzzle area, selects appropriate hint tier, emits hints through NarratorDisplay |
| `public/assets/data/hints.json` | Data | Central hint registry mapping puzzle IDs to tiered hint arrays |

### Modifications to Existing Components

| Component | Change | Impact |
|-----------|--------|--------|
| `CommandDispatcher.ts` | Emit `hint-opportunity` event when dispatch returns `handled: false` or puzzle conditions fail | LOW -- add 3-5 lines after existing failure paths |
| `PuzzleEngine.ts` | Return richer failure info (which puzzle almost matched, what condition failed) | LOW -- add optional return data to `tryPuzzle` null result |
| `RoomScene.ts` | Create HintManager instance, wire EventBus listener, add "hint" command | LOW -- same pattern as existing system wiring |
| `GameStateData` | Add `hintAttempts: Record<string, number>` for tracking | LOW -- one field addition |
| `VerbTable.ts` | Add "hint" / "help" verb | LOW -- one entry |

### Hint Data Schema

```typescript
// public/assets/data/hints.json
interface HintRegistry {
  puzzles: Record<string, {  // Key = puzzle ID from room JSON
    tiers: string[];          // Index 0 = vague, last = explicit
    triggerContext: {          // What player actions trigger hint tracking
      verbs: string[];        // Verbs that indicate player is in this puzzle area
      subjects: string[];     // Subjects that relate to this puzzle
    };
  }>;
  generalHints: Record<string, string[]>;  // Room-level hints when no specific puzzle detected
}
```

### Example Hint Tiers

```json
{
  "use-key-on-door": {
    "tiers": [
      "That door looks sturdy. You'd need something to convince it to open.",
      "Doors have locks. Locks have keyholes. Keyholes want keys. It's a whole ecosystem.",
      "Perhaps that rusty key you found would fit the lock on this door?"
    ],
    "triggerContext": {
      "verbs": ["open", "use", "push", "pull"],
      "subjects": ["door", "locked-door", "cave-mouth"]
    }
  }
}
```

### Integration Pattern

The HintManager follows the exact same pattern as AudioManager -- singleton, initialized per-scene, EventBus-driven, cleanup on shutdown:

```typescript
// In RoomScene.create():
this.hintManager = HintManager.getInstance();
this.hintManager.init(this.roomData, this.narratorDisplay);

// In RoomScene shutdown:
this.hintManager.cleanup();
```

**Confidence: HIGH** -- This follows established EventBus patterns already proven in the codebase. The hint data schema mirrors the existing puzzle data patterns.

---

## Feature 3: Death Gallery Achievements

### Architecture Decision: Extend Existing Death System

The death system already tracks `deathCount` in GameState and processes death through a clean `trigger-death` -> `DeathScene` overlay flow. The gallery extends this by recording WHICH deaths occurred, not just how many.

### Component Architecture

```
EXISTING DEATH FLOW (unchanged):
  CommandDispatcher -> PuzzleEngine -> trigger-death event
       -> RoomScene handler -> DeathScene overlay

NEW ADDITIONS:
  +- - - - - - - - - - - - - - - - - - - - - - - - - - - - - -+
  |                                                             |
  |  trigger-death event                                        |
  |       |                                                     |
  |       +---> DeathGallery.recordDeath(deathId, roomId)       |
  |                   |                                         |
  |                   v                                         |
  |            GameState.deathsDiscovered[] updated              |
  |                                                             |
  |  DeathScene overlay (MODIFIED):                             |
  |       +---> Shows "Deaths discovered: X/Y"                  |
  |       +---> NEW indicator if this death is first discovery  |
  |       +---> "Gallery" button -> DeathGalleryScene           |
  |                                                             |
  |  DeathGalleryScene (NEW):                                   |
  |       +---> Grid of all possible deaths                     |
  |       +---> Discovered = title + narrator text + room       |
  |       +---> Undiscovered = silhouette/question mark         |
  |       +---> Completion percentage                           |
  |       +---> Accessible from MainMenuScene too               |
  +- - - - - - - - - - - - - - - - - - - - - - - - - - - - - -+
```

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `src/game/systems/DeathGallery.ts` | Systems | Records discovered deaths, checks completion, provides gallery data. Singleton mirroring AudioManager pattern |
| `src/game/scenes/DeathGalleryScene.ts` | Scenes | Full-screen scene showing all deaths as a collectible grid |
| `public/assets/data/death-registry.json` | Data | Master list of ALL possible deaths across all rooms, with metadata for gallery display |

### Modifications to Existing Components

| Component | Change | Impact |
|-----------|--------|--------|
| `GameStateData` | Add `deathsDiscovered: string[]` (array of deathId strings) | LOW -- one field |
| `DeathScene.ts` | Add "X/Y deaths found" text, "New!" badge for first discovery, "Gallery" button | MEDIUM -- adds ~30 lines to create() |
| `MainMenuScene.ts` | Add "Death Gallery" menu option | LOW -- one menu item |
| `main.ts` | Register `DeathGalleryScene` in scene list | LOW -- one line |
| `Preloader.ts` | Load `death-registry.json` | LOW -- one line |

### Death Registry Schema

```typescript
// public/assets/data/death-registry.json
interface DeathRegistry {
  deaths: Array<{
    id: string;              // Matches deathId in room JSON
    roomId: string;          // Which room this death occurs in
    title: string;           // "Death by Curiosity"
    category: string;        // "Poison" | "Fall" | "Combat" | "Stupidity" | etc.
    galleryHint: string;     // Cryptic hint for undiscovered: "Something in the cave entrance is not meant to be consumed..."
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';  // For visual flair
  }>;
  totalDeaths: number;       // Pre-computed total for percentage display
}
```

### Save/Load Integration

The `deathsDiscovered` array serializes automatically via the existing `GameState.serialize()` / `deserialize()` flow since it is a simple string array on `GameStateData`. No SaveManager changes needed.

**Important:** `deathsDiscovered` should persist across save slots as a meta-progression field (player keeps death gallery progress even when loading an earlier save). This requires a separate localStorage key outside the save slot system.

```typescript
// DeathGallery stores meta-progression independently
const DEATH_GALLERY_KEY = 'kqgame-death-gallery';
localStorage.setItem(DEATH_GALLERY_KEY, JSON.stringify(deathsDiscovered));
```

**Confidence: HIGH** -- Direct extension of the existing death system with minimal coupling. The pattern of "record event -> check against registry -> display in gallery" is straightforward.

---

## Feature 4: Mobile-Responsive Layout

### Architecture Decision: CSS-First With Minimal JS Adaptation

The existing layout uses `Phaser.Scale.FIT` with `CENTER_BOTH`, which already handles canvas resizing. The challenge is the HTML overlays (TextInputBar, NarratorDisplay, InventoryPanel) and touch input for the text parser.

### Layout Architecture

```
DESKTOP (current, 960x540+):
+------------------------------------------+
|              Phaser Canvas               |
|              960 x 540                   |
|                                          |
+------------------------------------------+
| [parser-response text area              ]|
| [> parser-input field                   ]|
+------------------------------------------+

MOBILE PORTRAIT (<768px):
+-------------------------+
|     Phaser Canvas       |
|     (scaled to fit)     |
|                         |
|   [touch tap zones]     |
+-------------------------+
| [narrator text         ]|
| [input / touch kbd btn ]|
+--+----+----+----+----+--+
|  | Go | Look|Take|Use |  |  <-- Quick verb buttons
+--+----+----+----+----+--+

MOBILE LANDSCAPE (<768px height):
+------------------------------------------+
|         Phaser Canvas (wider)            |
|                                          |
+------------------------------------------+
| [narrator] [input field] [verb buttons]  |
+------------------------------------------+
```

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `src/game/ui/MobileControls.ts` | UI | Touch-friendly verb buttons, tap-to-interact zones, virtual keyboard trigger |
| `src/game/ui/ResponsiveLayout.ts` | UI | Detects viewport, manages layout mode switching, coordinates HTML overlay positioning |

### Modifications to Existing Components

| Component | Change | Impact |
|-----------|--------|--------|
| `style.css` | Add CSS media queries for mobile breakpoints, flex layout adjustments | MEDIUM -- significant CSS additions |
| `main.ts` (Phaser config) | Keep `Scale.FIT` but add `resize` callback for layout updates | LOW -- 2-3 lines |
| `TextInputBar.ts` | Add mobile mode: show/hide keyboard button, compact layout | MEDIUM -- conditional rendering |
| `NarratorDisplay.ts` | Adjust font sizes for mobile viewport | LOW -- CSS handles most of this |
| `InventoryPanel.ts` | Touch-friendly item sizing, swipe-to-scroll | MEDIUM -- touch event handling |
| `RoomScene.ts` | Add tap-to-interact alternative to click-to-move (long-press for walk, tap for interact) | MEDIUM -- new input handler branch |
| `index.html` | Add viewport meta tag for mobile (already exists: `width=device-width, initial-scale=1.0`) | NONE -- already present |

### Mobile Touch Input Strategy

The text parser is the core interaction -- it MUST work on mobile. Two approaches, recommended to implement both:

**Approach A: Quick Verb Buttons**
- Horizontal bar of common verbs (Look, Take, Use, Go, Talk, Inventory)
- Tap verb, then tap hotspot/exit in scene
- Builds the command automatically: "look at [tapped hotspot]"
- No typing required for 90% of interactions

**Approach B: Virtual Keyboard Input**
- Tap the input field to trigger mobile keyboard
- Works with existing TextInputBar since it is a real HTML `<input>` element
- Mobile keyboard will push the viewport; handle with `visualViewport` API
- Use `window.visualViewport.addEventListener('resize', ...)` to detect keyboard open/close and adjust layout

### CSS Media Query Strategy

```css
/* Mobile portrait */
@media (max-width: 767px) {
  #game-container {
    flex-direction: column;
  }
  #text-parser-ui {
    font-size: 16px;  /* Prevent iOS zoom on input focus */
  }
  #parser-input {
    font-size: 16px;  /* Critical: iOS auto-zooms on <16px inputs */
  }
  .mobile-verb-bar {
    display: flex;
  }
}

/* Desktop */
@media (min-width: 768px) {
  .mobile-verb-bar {
    display: none;
  }
}
```

### Critical Mobile Pitfall: iOS Input Zoom

iOS Safari auto-zooms the page when focusing an `<input>` with `font-size` below 16px. The current `#parser-input` uses 14px. This MUST change to 16px on mobile to prevent the jarring zoom effect. The fix is purely CSS.

**Confidence: HIGH** -- The existing `Scale.FIT` + HTML overlay architecture is already mobile-friendly by design. The main work is CSS responsive design and the verb button UI addition. The Phaser canvas scaling already works on mobile.

---

## Feature 5: Multiple Endings

### Architecture Decision: Flag-Accumulated Branching

Rather than a branching tree (exponential content), use the existing flag system to accumulate "ending scores" based on player choices throughout the game. The final act evaluates these accumulated flags to determine which ending plays.

### Ending Architecture

```
THROUGHOUT THE GAME:
  Player choices set flags that influence ending:
    - helped_troll -> ending_compassion++
    - bribed_troll -> ending_pragmatism++
    - solved_all_puzzles -> ending_completionist++
    - death_count < 3 -> ending_skilled
    - found_secret_items -> ending_explorer

ACT 3 CLIMAX (existing throne_room_act3):
  PuzzleEngine evaluates ending conditions:
    +---------------------------------------------------+
    |  Ending conditions checked in priority order:      |
    |                                                    |
    |  1. "Perfect" ending: all_secrets + low_deaths     |
    |  2. "Compassion" ending: helped_all_npcs           |
    |  3. "Pragmatic" ending: bribed/fought through      |
    |  4. "Default" ending: minimum requirements met     |
    |  5. "Bad" ending: specific bad-choice flags        |
    +---------------------------------------------------+
              |
              v
    PuzzleAction: { type: 'trigger-ending', endingId: 'compassion' }
              |
              v
    EventBus.emit('trigger-ending', endingId)
              |
              v
    EndingScene (new) plays ending sequence
```

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `src/game/scenes/EndingScene.ts` | Scenes | Plays ending sequence: narrator text, ending-specific art, credits, epilogue |
| `public/assets/data/endings.json` | Data | Defines all possible endings with text, conditions, and art references |

### Modifications to Existing Components

| Component | Change | Impact |
|-----------|--------|--------|
| `PuzzleAction` type | Add `{ type: 'trigger-ending'; endingId: string }` | LOW -- one union member |
| `PuzzleEngine.ts` | Handle `trigger-ending` action: emit EventBus event | LOW -- one case in switch |
| `PuzzleCondition` type | Possibly add `{ type: 'death-count-below'; count: number }` for ending conditions | LOW -- one union member |
| `GameStateData` | Add `endingReached?: string` for save/meta-progression | LOW -- one field |
| Room JSONs (Act 3 climax rooms) | Add ending-trigger puzzles with flag conditions | MEDIUM -- new puzzle entries in existing JSON |
| `main.ts` | Register `EndingScene` | LOW -- one line |
| `MainMenuScene.ts` | Show "Endings Discovered: X/Y" if any endings reached | LOW -- small addition |
| `RoomScene.ts` | Wire `trigger-ending` EventBus handler | LOW -- same pattern as `trigger-death` |

### Ending Definition Schema

```typescript
// public/assets/data/endings.json
interface EndingDefinition {
  id: string;
  title: string;              // "The Compassionate Crown"
  priority: number;           // Higher = checked first
  conditions: PuzzleCondition[];  // Reuse existing condition system!
  sequences: Array<{
    type: 'narration' | 'scene-change' | 'art-display' | 'credits';
    text?: string;
    artKey?: string;
    duration?: number;
  }>;
  epilogueText: string;       // Brief "what happened after" text
}
```

### Why Flag Accumulation Over Tree Branching

1. **Content efficiency:** 5 endings require 5 epilogue sequences. A branching tree for 36 rooms would require hundreds of variants.
2. **Existing infrastructure:** The flag system (`GameState.flags`) already supports this. No new state mechanism needed.
3. **Player agency:** Choices throughout the ENTIRE game contribute to the ending, not just a final binary choice. This feels more earned.
4. **Testability:** Each ending is a set of flag conditions evaluated by the existing PuzzleEngine. Easy to test with flag presets.

**Confidence: HIGH** -- The flag/condition system is battle-tested across 36 rooms of puzzles. Endings are just another set of condition-checked triggers.

---

## Component Dependency Map

### New Component Dependencies

```
                    +------------------+
                    |   Preloader.ts   |  (MODIFIED: load new assets, registries)
                    +--------+---------+
                             |
              +--------------+---------------+
              |              |               |
    +---------v---+  +-------v-------+  +----v-----------+
    | Art assets  |  | hints.json    |  | death-registry |
    | (Flux gen.) |  | endings.json  |  | .json          |
    +-------------+  +-------+-------+  +----+-----------+
                             |               |
                    +--------v-------+  +----v-----------+
                    | HintManager.ts |  | DeathGallery.ts|
                    | (new system)   |  | (new system)   |
                    +--------+-------+  +----+-----------+
                             |               |
    +------------------------v---------------v-----------+
    |                    RoomScene.ts                     |
    |  (MODIFIED: wire HintManager, DeathGallery,        |
    |   mobile controls, ending handler)                 |
    +----+-----+-----+-----+-----+-----+-----+----------+
         |     |     |     |     |     |     |
    +----v+  +-v---+ |  +--v-+  +v---+ |  +-v----------+
    |Death|  |Main | |  |End |  |Dead| |  |Mobile      |
    |Scene|  |Menu | |  |ing |  |Gall| |  |Controls.ts |
    |(MOD)| |(MOD) | |  |Scn | |ery | |  |(new UI)    |
    +-----+ +------+ |  |(new)| |Scn | |  +------------+
                      |  +----+ |(new)| |
                      |         +-----+ |
                      |                 |
                +-----v------+    +-----v---------+
                |Responsive  |    |style.css      |
                |Layout.ts   |    |(MODIFIED)     |
                |(new UI)    |    +---------------+
                +------------+
```

### Modification Impact Summary

| File | Changes | Risk |
|------|---------|------|
| `GameStateData.ts` | Add 2-3 fields | NONE -- additive |
| `GameState.ts` | Add convenience methods for new fields | LOW |
| `PuzzleAction` type | Add 1-2 union members | LOW |
| `PuzzleCondition` type | Add 1 union member | LOW |
| `PuzzleEngine.ts` | Handle new action types (2 cases) | LOW |
| `CommandDispatcher.ts` | Emit hint events on failure, add "hint" verb | LOW |
| `DeathScene.ts` | Add gallery count, button | MEDIUM |
| `MainMenuScene.ts` | Add gallery + ending menu items | LOW |
| `RoomScene.ts` | Wire 3 new systems (same pattern x3) | MEDIUM (bulk, not complexity) |
| `Preloader.ts` | Load new registries + room-specific art | MEDIUM (many asset lines) |
| `main.ts` | Register 2 new scenes | NONE |
| `style.css` | Add mobile responsive rules | MEDIUM |
| `TextInputBar.ts` | Mobile font size, optional verb buttons | MEDIUM |
| `VerbTable.ts` | Add "hint" verb | NONE |

---

## Data Flow Changes

### New EventBus Events

| Event | Emitter | Listener(s) | Data |
|-------|---------|-------------|------|
| `hint-opportunity` | CommandDispatcher | HintManager | `{ roomId, verb, subject, target, puzzleContext }` |
| `show-hint` | HintManager | NarratorDisplay (via RoomScene) | `{ text, tier }` |
| `death-recorded` | DeathGallery | DeathScene (for badge) | `{ deathId, isNew, totalFound, totalPossible }` |
| `trigger-ending` | PuzzleEngine | RoomScene -> EndingScene | `{ endingId }` |

### Modified Data Flows

**Death Flow (extended):**
```
trigger-death -> RoomScene handler -> DeathGallery.recordDeath(deathId)
                                   -> DeathScene.launch({ ...data, galleryInfo })
```

**Command Failure Flow (new):**
```
CommandDispatcher.dispatch() returns handled:false
  -> emit 'hint-opportunity' with context
  -> HintManager checks attempt count
  -> if threshold reached, appends hint to narrator response
```

### GameStateData Extension

```typescript
// ADDITIONS to existing GameStateData interface
export interface GameStateData {
  // ... existing fields unchanged ...
  currentRoom: string;
  inventory: string[];
  flags: Record<string, boolean | string>;
  visitedRooms: string[];
  removedItems: Record<string, string[]>;
  playTimeMs: number;
  deathCount: number;
  dialogueStates: Record<string, string>;

  // NEW v2.0 fields
  hintAttempts: Record<string, number>;     // puzzleId -> attempt count
  endingReached?: string;                    // Which ending the player got (if any)
}

// SEPARATE from save data (meta-progression):
// Stored in localStorage key 'kqgame-death-gallery'
// deathsDiscovered: string[]
// endingsDiscovered: string[]
```

---

## Recommended Build Order

Based on dependency analysis, the features should be built in this order:

### Phase 1: Flux Art Pipeline (offline tool)
**Rationale:** Independent of all other features. Can run in parallel with any runtime work. Produces assets that all other features benefit from (death gallery looks better with real art, ending scenes need art).

**Dependencies:** None (offline tool)
**Blocks:** Nothing technically, but other features benefit from having real assets

### Phase 2: GameState Extensions + Death Gallery
**Rationale:** The GameState changes (new fields) are needed by hints AND endings. Build them first with death gallery as the simplest consumer. Death gallery is self-contained and validates the meta-progression pattern (localStorage outside save slots).

**Dependencies:** None beyond existing architecture
**Blocks:** Hints and endings need the extended GameState

### Phase 3: Progressive Hint System
**Rationale:** Requires the hint tracking in GameState (from phase 2). Integrates with CommandDispatcher and PuzzleEngine. Hint content can be authored in parallel with implementation.

**Dependencies:** Extended GameState (phase 2)
**Blocks:** Nothing

### Phase 4: Multiple Endings
**Rationale:** Requires the ending-related PuzzleAction/Condition extensions. Needs content authored (ending sequences, flag placement in Act 3 rooms). Most complex content-wise.

**Dependencies:** Extended PuzzleAction/Condition types (phase 2), Act 3 room content exists
**Blocks:** Nothing

### Phase 5: Mobile Responsive Layout
**Rationale:** Last because it affects the entire UI layer and benefits from all other features being stable. Testing mobile layout is easier when all features are in place. CSS changes are low-risk but touch everything.

**Dependencies:** All other features should be functionally complete
**Blocks:** Nothing

### Parallel Track: Art Asset Generation
The Flux pipeline (Phase 1) can run continuously throughout all phases, generating and refining assets. Art integration (swapping Preloader references) can happen at any point.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Runtime Image Generation
**What:** Calling ComfyUI/Flux from the browser at runtime to generate backgrounds on-the-fly.
**Why bad:** 5-30 second generation times per image. Requires local GPU server running. Users without GPU cannot play. Unpredictable art quality per session.
**Instead:** Generate all art offline. The game loads pre-generated PNGs just like it loads placeholder PNGs today.

### Anti-Pattern 2: Monolithic Hint Logic in CommandDispatcher
**What:** Adding if/else hint logic directly into the dispatch method.
**Why bad:** CommandDispatcher is already 700 lines. Adding hint logic couples hint behavior to command routing. Testing hints requires testing the entire dispatch chain.
**Instead:** Emit events. Let HintManager handle all hint logic independently. Same pattern as AudioManager.

### Anti-Pattern 3: Death Gallery in GameState Save Slots
**What:** Storing `deathsDiscovered` inside the regular GameStateData that gets saved/loaded per slot.
**Why bad:** Loading a save from before a death discovery erases the gallery entry. Players who discovered 20 deaths then load an early save lose their gallery progress.
**Instead:** Meta-progression stored in a separate localStorage key, independent of save slots. Gallery progress is cumulative and permanent.

### Anti-Pattern 4: Mobile Layout via Canvas-Drawn UI
**What:** Drawing verb buttons and touch controls using Phaser canvas drawing because "it's a game."
**Why bad:** Canvas has no text accessibility, no native touch scroll, no proper form input handling. The existing HTML overlay approach is correct -- extend it, do not replace it.
**Instead:** Keep HTML overlays. Add new HTML elements for verb buttons. Use CSS media queries for responsive layout.

### Anti-Pattern 5: Branching Ending Trees
**What:** Creating 5 different versions of Act 3 for 5 endings, with unique room sequences per ending.
**Why bad:** 5x content multiplication. Maintenance nightmare. Inconsistent quality across branches.
**Instead:** Single Act 3 with flag-based ending determination at the climax point. One EndingScene with data-driven sequences per ending. Same rooms, different final evaluation.

---

## Scalability Considerations

| Concern | At v2.0 (36 rooms) | At v3.0 (100+ rooms) |
|---------|---------------------|----------------------|
| Asset loading | All Flux backgrounds in Preloader (~36 unique backgrounds, ~20MB) | Area-based lazy loading needed; Preloader loads current area + adjacent |
| Hint data | Single hints.json (~50KB) | Split by act/area if file exceeds 200KB |
| Death registry | Single death-registry.json (~30 deaths, <10KB) | Still single file at 100 deaths |
| Ending conditions | 5 endings evaluated at climax | Flag accumulation scales linearly, no branching cost |
| Mobile performance | 960x540 canvas is lightweight on modern phones | May need quality tiers for very old devices |
| Art generation | ~40 images, few hours of generation | Batch automation critical; manifest-driven pipeline pays off |

---

## Sources

- [Black Forest Labs - FLUX models](https://bfl.ai/) -- Official Flux model family
- [ComfyUI - Pixel Art Workflow](https://www.kokutech.com/blog/gamedev/tips/art/pixel-art-generation-with-comfyui) -- Pixel art generation with ComfyUI
- [ComfyUI PixelArt Detector](https://github.com/dimtoneff/ComfyUI-PixelArt-Detector) -- Palette and pixel consistency tooling
- [Tau Games - Progressive Hint System](https://taugames.ca/blog/hints.html) -- Hint system design with sub-goals
- [Game Developer - Low Spoiler Hints](https://www.gamedeveloper.com/design/how-and-why-to-write-low-spoiler-hints-for-adventure-games-) -- Tiered hint writing methodology
- [TextAdventures.co.uk - Hint System](https://docs.textadventures.co.uk/quest/guides/a_hint_system.html) -- Stage-gate hint implementation
- [Envato Tuts+ - Unlockable Achievements](https://gamedevelopment.tutsplus.com/tutorials/how-to-code-unlockable-achievements-for-your-game-a-simple-approach--gamedev-6012) -- Achievement property/constraint pattern
- [Game Developer - Robust Achievement Systems](https://www.gamedeveloper.com/design/designing-and-building-a-robust-comprehensive-achievement-system) -- Achievement metric tracking
- [Phaser Scale Manager](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/) -- FIT/RESIZE scaling modes
- [Phaser Forum - Mobile Keyboard](https://phaser.discourse.group/t/how-to-force-mobile-keyboard-to-appear/11477) -- HTML input overlay for mobile
- [MDN - Mobile Touch Controls](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch) -- Touch input patterns
- [Standard Patterns in Choice-Based Games](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/) -- Time Cave, Quest, Branch-and-Bottleneck patterns
- [Kreonit - Nonlinear Gameplay](https://kreonit.com/programming-and-games-development/nonlinear-gameplay/) -- Branching vs. flag-accumulation tradeoffs
- [openedai-images-flux](https://github.com/matatonic/openedai-images-flux) -- OpenAI-compatible local Flux API server

---
*Architecture research for: KQGame v2.0 Art & Polish integration*
*Researched: 2026-02-21*
