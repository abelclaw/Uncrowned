# Architecture Research

**Domain:** Browser-based graphic adventure game with LLM text parsing
**Researched:** 2026-02-20
**Confidence:** HIGH (architecture patterns well-established; LLM integration layer is MEDIUM)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Canvas       │  │ UI Overlay   │  │ Audio        │              │
│  │ Renderer     │  │ (HTML/CSS)   │  │ Manager      │              │
│  │ (scenes,     │  │ (inventory,  │  │ (music, SFX, │              │
│  │  sprites,    │  │  text input, │  │  narrator     │              │
│  │  animations) │  │  dialogs,    │  │  voice)       │              │
│  │              │  │  narrator)   │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
├─────────┴─────────────────┴─────────────────┴───────────────────────┤
│                         GAME LOOP                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  requestAnimationFrame -> Input -> Update -> Render -> repeat │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                       GAME LOGIC LAYER                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ Scene      │  │ Player     │  │ Puzzle     │  │ Death      │   │
│  │ Manager    │  │ Controller │  │ Engine     │  │ System     │   │
│  │ (FSM)      │  │ (movement, │  │ (triggers, │  │ (narrator, │   │
│  │            │  │  actions)  │  │  conditions│  │  respawn)  │   │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘   │
│        │               │               │               │           │
│  ┌─────┴──────┐  ┌─────┴──────┐  ┌─────┴──────────────┴──────┐    │
│  │ Inventory  │  │ Pathfinding│  │ Event Bus                 │    │
│  │ Manager    │  │ (A* on     │  │ (decoupled communication) │    │
│  │            │  │  walkable  │  │                            │    │
│  │            │  │  areas)    │  │                            │    │
│  └────────────┘  └────────────┘  └────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                     LLM INTEGRATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Text Parser Service                                          │   │
│  │ ┌────────────┐  ┌────────────┐  ┌────────────┐              │   │
│  │ │ Input      │  │ Ollama     │  │ Response   │              │   │
│  │ │ Sanitizer  │→ │ Client     │→ │ Mapper     │              │   │
│  │ │ & Context  │  │ (REST API) │  │ (JSON →    │              │   │
│  │ │ Builder    │  │            │  │  GameAction)│              │   │
│  │ └────────────┘  └────────────┘  └────────────┘              │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Scene        │  │ Game State   │  │ Asset        │              │
│  │ Definitions  │  │ Store        │  │ Registry     │              │
│  │ (JSON data   │  │ (current     │  │ (sprites,    │              │
│  │  files)      │  │  state,      │  │  audio,      │              │
│  │              │  │  save/load)  │  │  scene imgs) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Canvas Renderer | Drawing scene backgrounds, sprites, animations, walkable area debug overlays | Single HTML5 Canvas element, layered drawing with z-sorting, sprite sheet clipping |
| UI Overlay | Text input bar, inventory panel, dialog boxes, narrator text, death screen, menus | HTML/CSS elements positioned over the canvas -- NOT drawn on canvas |
| Audio Manager | Background music per scene, sound effects, narrator audio cues | Howler.js wrapping Web Audio API; audio sprites for SFX efficiency |
| Game Loop | Fixed timestep update, variable render; orchestrates input/update/render cycle | requestAnimationFrame with delta time accumulation |
| Scene Manager | Room transitions, loading/unloading scene data, managing active scene state | Finite State Machine where each room is a state |
| Player Controller | Character movement along walkable areas, click-to-move, action execution | Position tracking, A* pathfinding on walkable polygons, animation state |
| Puzzle Engine | Evaluating puzzle conditions, tracking item combinations, triggering outcomes | Data-driven condition/action system reading from scene definitions |
| Death System | Tracking death triggers, playing narrator commentary, managing respawn | Event-driven hooks into puzzle engine and scene hazards |
| Inventory Manager | Adding/removing items, item combination logic, item-on-scene-object interactions | Array-based inventory with item definition objects |
| Pathfinding | Computing walkable paths for character movement within scenes | A* on polygon navmesh or grid overlay of walkable areas |
| Event Bus | Decoupled communication between all game systems | Publish/subscribe pattern; typed events |
| Text Parser Service | Translating natural language input into structured game commands via LLM | Ollama REST client with prompt engineering and JSON schema output |
| Scene Definitions | Declarative room data: backgrounds, hotspots, exits, items, puzzle conditions | JSON files loaded at runtime; one file per room or grouped by area |
| Game State Store | Single source of truth for all mutable game state | Plain object with structured sections; serialized to localStorage/IndexedDB |
| Asset Registry | Loading, caching, and serving game assets (images, audio, data files) | Promise-based preloader with progress tracking |

## Recommended Project Structure

```
src/
├── core/                    # Engine fundamentals
│   ├── GameLoop.ts          # requestAnimationFrame loop with fixed timestep
│   ├── EventBus.ts          # Pub/sub event system
│   ├── AssetLoader.ts       # Image/audio/data preloading with progress
│   └── InputManager.ts      # Mouse click, keyboard, text input handling
├── rendering/               # All drawing concerns
│   ├── CanvasRenderer.ts    # Main canvas drawing, camera, z-sorting
│   ├── SpriteSheet.ts       # Sprite sheet parsing and frame extraction
│   ├── AnimationPlayer.ts   # Frame-based animation state machine
│   └── ParticleSystem.ts    # Simple particles (dust, sparkles, etc.)
├── scenes/                  # Scene/room management
│   ├── SceneManager.ts      # FSM for room transitions
│   ├── Scene.ts             # Base scene class (background, hotspots, exits)
│   └── SceneTransition.ts   # Fade, slide, cut transitions
├── entities/                # Game objects
│   ├── Player.ts            # Player character with movement and animation
│   ├── NPC.ts               # Non-player characters
│   ├── Hotspot.ts           # Clickable/interactable regions in a scene
│   └── SceneObject.ts       # Items, doors, environmental objects
├── systems/                 # Game logic systems
│   ├── InventoryManager.ts  # Item tracking, combination logic
│   ├── PuzzleEngine.ts      # Condition evaluation, trigger execution
│   ├── DeathSystem.ts       # Death triggers, narrator quips, respawn
│   ├── DialogSystem.ts      # NPC conversations, branching dialog
│   ├── Pathfinding.ts       # A* over walkable area polygons
│   └── SaveSystem.ts        # Serialize/deserialize game state
├── llm/                     # LLM text parser integration
│   ├── OllamaClient.ts      # HTTP client for Ollama REST API
│   ├── PromptBuilder.ts     # Context-aware prompt construction
│   ├── ResponseMapper.ts    # JSON response -> GameAction mapping
│   └── FallbackParser.ts    # Regex/keyword fallback when LLM unavailable
├── narrator/                # Narrator personality system
│   ├── NarratorEngine.ts    # Text generation, timing, queue
│   ├── DeathQuips.ts        # Death-specific dark comedy responses
│   └── NarratorPersonality.ts # Tone, style, context awareness
├── audio/                   # Sound management
│   ├── AudioManager.ts      # Music and SFX playback via Howler.js
│   └── MusicTracker.ts      # Scene-based music transitions
├── ui/                      # HTML/CSS overlay components
│   ├── TextInput.ts         # Command input bar
│   ├── InventoryPanel.ts    # Visual inventory display
│   ├── DialogBox.ts         # NPC/narrator text display
│   ├── DeathScreen.ts       # Death overlay with narrator text
│   └── MainMenu.ts          # Title, save slots, settings
├── data/                    # Game content (loaded at runtime)
│   ├── scenes/              # Scene definition JSON files
│   ├── items/               # Item definition JSON files
│   ├── puzzles/             # Puzzle definition JSON files
│   ├── dialogs/             # Dialog tree JSON files
│   └── narrator/            # Narrator text banks
├── assets/                  # Static game assets
│   ├── sprites/             # Character sprite sheets (PNG)
│   ├── backgrounds/         # Scene background images (PNG)
│   ├── ui/                  # UI element graphics
│   ├── audio/               # Music and SFX files
│   └── fonts/               # Pixel fonts
└── index.ts                 # Entry point: init, preload, start game loop
```

### Structure Rationale

- **core/:** Engine-level code that has zero knowledge of game content. Reusable across projects. No game-specific logic here.
- **rendering/:** Isolated from game logic. Renderer receives draw commands; it does not decide what to draw. This separation means you can swap rendering approaches without touching game logic.
- **scenes/ vs data/scenes/:** `src/scenes/` contains the Scene *engine* (manager, transitions). `src/data/scenes/` contains the *content* (JSON definitions). This separation is critical -- the engine interprets data, it does not hardcode room behavior.
- **systems/:** Each system is an independent module that communicates via the EventBus. Systems do not directly reference each other; they emit and listen to events.
- **llm/:** Completely isolated from the rest of the game. The LLM layer receives text and returns a `GameAction` struct. The game never knows or cares that an LLM was involved. This makes the fallback parser trivially swappable.
- **ui/:** HTML/CSS components, NOT canvas-drawn. This is deliberate: HTML handles text rendering, input fields, and accessibility far better than canvas. The canvas handles only the game world.
- **data/ vs assets/:** `data/` is structured game content (JSON). `assets/` is binary media (images, audio). Different loading strategies for each.

## Architectural Patterns

### Pattern 1: Data-Driven Scene Definitions

**What:** All game content (rooms, puzzles, items, dialogs) is defined in JSON data files, not in code. The engine reads these files and interprets them at runtime.
**When to use:** Always. This is the foundational pattern for the entire game.
**Trade-offs:** More upfront design work for the data schema, but massively easier content creation, iteration, and debugging. Content changes require zero code changes.

**Example:**
```typescript
// data/scenes/darkForest.json
{
  "id": "dark_forest",
  "name": "The Dark Forest",
  "background": "backgrounds/dark_forest.png",
  "music": "forest_ambience",
  "walkableArea": [
    { "x": 50, "y": 300 }, { "x": 750, "y": 300 },
    { "x": 750, "y": 550 }, { "x": 50, "y": 550 }
  ],
  "hotspots": [
    {
      "id": "old_tree",
      "name": "Gnarled Tree",
      "bounds": { "x": 200, "y": 150, "w": 120, "h": 200 },
      "look": "A tree so old it remembers when this forest wasn't dark.",
      "use": { "requires": "axe", "triggers": "puzzle_fell_tree" },
      "deathTrigger": null
    },
    {
      "id": "suspicious_mushroom",
      "name": "Suspicious Mushroom",
      "bounds": { "x": 500, "y": 400, "w": 40, "h": 40 },
      "look": "It glows invitingly. Nature's neon 'eat me' sign.",
      "take": { "gives": "suspicious_mushroom" },
      "eat": { "triggers": "death_mushroom_poison" }
    }
  ],
  "exits": [
    { "id": "to_village", "bounds": { "x": 0, "y": 300, "w": 50, "h": 250 }, "target": "village_square", "edge": "left" },
    { "id": "to_cave", "bounds": { "x": 700, "y": 200, "w": 100, "h": 150 }, "target": "cave_entrance", "requires": "torch" }
  ],
  "onEnter": [
    { "condition": "!flag.visited_dark_forest", "action": "narrator_say", "text": "Oh good, the dark forest. This always ends well." },
    { "condition": "!flag.visited_dark_forest", "action": "set_flag", "flag": "visited_dark_forest" }
  ]
}
```

### Pattern 2: Event Bus for System Communication

**What:** A centralized publish/subscribe system where game components emit typed events and subscribe to events they care about. No direct coupling between systems.
**When to use:** All inter-system communication. The PuzzleEngine should never directly call DeathSystem.kill(); instead it emits a `DEATH_TRIGGERED` event.
**Trade-offs:** Slight indirection makes debugging harder (you need to trace events). But the decoupling is essential -- it prevents the spaghetti that kills adventure games mid-development.

**Example:**
```typescript
// core/EventBus.ts
type GameEvent =
  | { type: 'PLAYER_CLICKED'; target: Hotspot; verb: string }
  | { type: 'ITEM_ACQUIRED'; itemId: string }
  | { type: 'ITEM_USED'; itemId: string; targetId: string }
  | { type: 'PUZZLE_SOLVED'; puzzleId: string }
  | { type: 'DEATH_TRIGGERED'; deathId: string }
  | { type: 'SCENE_CHANGE'; fromScene: string; toScene: string }
  | { type: 'NARRATOR_SAY'; text: string; style?: 'normal' | 'death' | 'hint' }
  | { type: 'COMMAND_PARSED'; action: GameAction }
  | { type: 'SAVE_REQUESTED' }
  | { type: 'LOAD_REQUESTED'; slotId: string };

class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on<T extends GameEvent['type']>(
    type: T,
    handler: (event: Extract<GameEvent, { type: T }>) => void
  ): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
    return () => this.listeners.get(type)?.delete(handler); // unsubscribe
  }

  emit(event: GameEvent): void {
    this.listeners.get(event.type)?.forEach(fn => fn(event));
  }
}
```

### Pattern 3: LLM as a Service with Structured Output

**What:** The LLM text parser is wrapped behind a clean service interface that accepts player text and returns a typed `GameAction`. The LLM is prompted to return JSON matching a strict schema using Ollama's structured output feature. A fallback regex parser handles cases when Ollama is unavailable or slow.
**When to use:** Every player text input goes through this pipeline.
**Trade-offs:** LLM adds latency (200-2000ms depending on model/hardware). The fallback parser ensures the game remains playable without Ollama running. The structured output schema constrains the LLM to valid game commands.

**Example:**
```typescript
// llm/ResponseMapper.ts
interface GameAction {
  verb: 'look' | 'take' | 'use' | 'give' | 'talk' | 'go' | 'combine' | 'eat' | 'open' | 'push' | 'pull';
  subject: string | null;    // "mushroom", "old tree", "door"
  target: string | null;     // for "use X on Y" -> Y is target
  confidence: number;        // 0-1, how sure the LLM is
  rawInterpretation: string; // LLM's explanation for debugging
}

// The Ollama format schema sent with requests:
const GAME_ACTION_SCHEMA = {
  type: "object",
  properties: {
    verb: { type: "string", enum: ["look","take","use","give","talk","go","combine","eat","open","push","pull"] },
    subject: { type: "string", nullable: true },
    target: { type: "string", nullable: true },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rawInterpretation: { type: "string" }
  },
  required: ["verb", "subject", "confidence", "rawInterpretation"]
};
```

### Pattern 4: Scene Manager as Finite State Machine

**What:** Each room/scene is a state in a finite state machine. The SceneManager holds the current scene, handles transitions (enter/exit hooks), and ensures only one scene is active at a time. Uses a pushdown automaton variant for overlay scenes (e.g., inventory screen, death screen).
**When to use:** All room navigation and game screen management.
**Trade-offs:** Simple and predictable. Limits you to one active scene (which is correct for this game type). The pushdown stack handles temporary overlays without losing room state.

**Example:**
```typescript
// scenes/SceneManager.ts
class SceneManager {
  private currentScene: Scene | null = null;
  private overlayStack: Scene[] = [];
  private scenes: Map<string, SceneDefinition> = new Map();

  async changeScene(sceneId: string): Promise<void> {
    const definition = this.scenes.get(sceneId);
    if (!definition) throw new Error(`Unknown scene: ${sceneId}`);

    if (this.currentScene) {
      await this.currentScene.onExit();
    }

    const scene = new Scene(definition, this.assetRegistry);
    await scene.onEnter();
    this.currentScene = scene;

    this.eventBus.emit({
      type: 'SCENE_CHANGE',
      fromScene: this.currentScene?.id ?? '',
      toScene: sceneId
    });
  }

  pushOverlay(overlay: Scene): void {
    this.overlayStack.push(overlay);
  }

  popOverlay(): void {
    this.overlayStack.pop();
  }
}
```

### Pattern 5: Condition/Action Puzzle System

**What:** Puzzles are defined as a set of conditions (flags, inventory items, scene state) and actions (give item, set flag, change scene, trigger death, play narrator text). The PuzzleEngine evaluates conditions against current game state and executes actions when all conditions are met.
**When to use:** Every puzzle, interaction, and game progression gate.
**Trade-offs:** Requires a well-designed condition vocabulary upfront. But once established, designers can create all puzzles purely in JSON without touching code.

**Example:**
```typescript
// data/puzzles/fellTree.json
{
  "id": "puzzle_fell_tree",
  "conditions": [
    { "type": "has_item", "item": "axe" },
    { "type": "in_scene", "scene": "dark_forest" },
    { "type": "flag_not_set", "flag": "tree_felled" }
  ],
  "actions": [
    { "type": "remove_item", "item": "axe" },
    { "type": "set_flag", "flag": "tree_felled" },
    { "type": "narrator_say", "text": "You hack at the tree with surprising competence. It crashes down, revealing a hidden path. The tree did not consent to this." },
    { "type": "modify_scene", "scene": "dark_forest", "changes": {
      "removeHotspot": "old_tree",
      "addExit": { "id": "to_hidden_path", "bounds": { "x": 200, "y": 250, "w": 120, "h": 100 }, "target": "hidden_path" }
    }},
    { "type": "play_sfx", "sound": "tree_falling" }
  ]
}
```

## Data Flow

### Main Game Loop Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Input   │ ──→ │  Update  │ ──→ │  Render  │ ──→ │  Wait    │
│  Phase   │     │  Phase   │     │  Phase   │     │  (rAF)   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ Read mouse,    │ Scene logic,   │ Draw bg,       │ requestAnimation
     │ keyboard,      │ puzzle eval,   │ sprites,       │ Frame callback
     │ text input     │ pathfinding,   │ UI overlays    │
     │                │ event dispatch │                │
     └────────────────┴────────────────┴────────────────┘
```

### Text Command Flow (LLM Path)

```
Player types "use the rusty key on the old chest"
    │
    ▼
┌─────────────────┐
│ InputManager     │  Captures text, emits TEXT_SUBMITTED event
└────────┬────────┘
         ▼
┌─────────────────┐
│ PromptBuilder    │  Builds context: current scene, inventory, nearby objects
│                  │  Creates system prompt + user message for Ollama
└────────┬────────┘
         ▼
┌─────────────────┐
│ OllamaClient    │  POST http://localhost:11434/api/chat
│                  │  { model, messages, format: GAME_ACTION_SCHEMA, stream: false }
│                  │  (OR stream: true for responsive feel)
└────────┬────────┘
         ▼
┌─────────────────┐
│ ResponseMapper   │  Validates JSON against schema
│                  │  Maps "rusty key" -> inventory item "rusty_key"
│                  │  Maps "old chest" -> hotspot "old_chest" in current scene
│                  │  Returns: { verb: "use", subject: "rusty_key", target: "old_chest" }
└────────┬────────┘
         ▼
┌─────────────────┐
│ EventBus         │  Emits COMMAND_PARSED event with GameAction
└────────┬────────┘
         ▼
┌─────────────────┐
│ PuzzleEngine     │  Receives GameAction, checks conditions against game state
│                  │  If conditions met -> execute actions (set flags, give items, etc.)
│                  │  If not met -> emit NARRATOR_SAY with contextual failure text
└────────┬────────┘
         ▼
┌─────────────────┐
│ Scene/UI Update  │  State changes propagate: inventory updates, scene modifications,
│                  │  narrator text display, death screen if applicable
└─────────────────┘
```

### Text Command Flow (Fallback Path)

```
Player types "use key on chest"
    │
    ▼
┌─────────────────┐
│ FallbackParser   │  Regex: /^(use|take|look|go|...)\s+(.+?)(?:\s+on\s+(.+))?$/i
│                  │  Fuzzy match subject/target against scene hotspots + inventory
│                  │  Returns: { verb: "use", subject: "rusty_key", target: "old_chest" }
└────────┬────────┘
         ▼
    (same EventBus -> PuzzleEngine path as LLM)
```

### Save/Load Flow

```
SAVE:
  GameState (flags, inventory, currentScene, player position, puzzle state)
      │
      ▼
  JSON.stringify(gameState)
      │
      ▼
  localStorage.setItem(`save_slot_${n}`, serialized)
  (IndexedDB for large save data or asset caching)

LOAD:
  localStorage.getItem(`save_slot_${n}`)
      │
      ▼
  JSON.parse(serialized) -> GameState
      │
      ▼
  Restore: set flags, restore inventory, change scene, position player
```

### Key Data Flows

1. **Player Action Flow:** Click/text input -> InputManager -> (LLM or Fallback) Parser -> GameAction -> EventBus -> PuzzleEngine/SceneManager -> State Update -> Renderer/UI update
2. **Scene Navigation Flow:** Player reaches exit -> SceneManager.changeScene() -> current scene onExit() -> load new scene data -> new scene onEnter() -> trigger onEnter events -> render new background
3. **Death Flow:** Hazard triggered -> DeathSystem receives DEATH_TRIGGERED event -> selects quip from death bank -> pushes DeathScreen overlay -> narrator text plays -> player chooses retry -> pop overlay, restore last checkpoint
4. **Narrator Flow:** Any system emits NARRATOR_SAY -> NarratorEngine queues text -> types out text letter-by-letter in DialogBox -> optional audio cue plays

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 5-10 rooms (prototype) | All data can live in a single JSON file. No lazy loading needed. Load all assets up front during preloader. |
| 20-50 rooms (full game ~5hrs) | Split scene data into per-room JSON files. Lazy-load assets per area (group rooms into areas). Preload adjacent rooms for seamless transitions. |
| 50+ rooms (expansion) | Area-based asset bundles. Progressive loading with loading screens between areas. Consider IndexedDB cache for downloaded assets. Compress sprite sheets. |

### Scaling Priorities

1. **First bottleneck: Asset memory.** With pixel art at 320x240 native resolution upscaled, individual assets are small. But 50+ rooms with unique backgrounds and sprite sheets add up. Solution: area-based loading, unloading distant scenes, and sprite sheet atlasing.
2. **Second bottleneck: LLM response time.** Ollama on consumer hardware takes 200ms-2s per request depending on model size. Solution: use a small model (7B-8B parameter), non-streaming for simple commands, show "thinking" animation during processing, and always have the fallback parser for instant responses.
3. **Third bottleneck: Save data size.** With 50+ rooms of flags and state, save data grows. Solution: only store deltas from default state, not full scene copies. A complete game state should stay under 100KB easily.

## Anti-Patterns

### Anti-Pattern 1: Drawing UI on Canvas

**What people do:** Render text input fields, inventory grids, and dialog boxes using Canvas drawing commands.
**Why it's wrong:** Canvas has no text selection, no accessibility, no native input handling, terrible text rendering at small sizes, and you must rebuild every standard UI behavior from scratch (scrolling, focus, cursor blinking, etc.).
**Do this instead:** Use HTML/CSS for all UI elements. Position them absolutely over the canvas. Use CSS `pointer-events` to control click-through. The canvas handles ONLY the game world (backgrounds, sprites, walkable areas).

### Anti-Pattern 2: Hardcoded Scene Logic

**What people do:** Write one TypeScript file per room with all interactions, puzzles, and dialogs coded as imperative logic. `if (player.hasItem('key') && currentRoom === 'cellar') { ... }`.
**Why it's wrong:** Adding or modifying a room requires code changes, rebuilds, and risk of regression. With 50+ rooms, the codebase becomes unmaintainable. Content iteration grinds to a halt.
**Do this instead:** Data-driven scene definitions (Pattern 1). The engine evaluates JSON conditions. Code changes are needed only when you add new *types* of conditions or actions, not new content.

### Anti-Pattern 3: God Object Game State

**What people do:** One massive `gameState` object that every system reads and writes to directly, with no structure or access control.
**Why it's wrong:** Race conditions between systems, impossible to debug state changes, save/load becomes fragile because any system can shove arbitrary data into the state.
**Do this instead:** Structured state with clear sections (inventory, flags, currentScene, playerPosition, puzzleState). Access through methods, not direct property mutation. Log state changes for debugging.

### Anti-Pattern 4: Synchronous LLM Calls Blocking the Game Loop

**What people do:** `await ollama.chat()` inside the update loop, freezing the game until the LLM responds.
**Why it's wrong:** The game freezes for 200ms-2s on every text command. Animations stop, audio stutters, the game feels broken.
**Do this instead:** Fire the LLM call asynchronously. Show a "thinking" indicator (narrator typing dots, hourglass cursor). When the response arrives, inject the GameAction into the event bus. The game loop continues rendering smoothly throughout.

### Anti-Pattern 5: Tight Coupling Between Puzzle and Death Systems

**What people do:** PuzzleEngine directly calls `deathSystem.kill('poison')` and `narrator.say('You died')`.
**Why it's wrong:** Systems become interdependent. Adding a new death animation requires modifying PuzzleEngine. Testing puzzles requires initializing the death system.
**Do this instead:** PuzzleEngine emits `DEATH_TRIGGERED` event. DeathSystem and NarratorEngine each independently subscribe to it. Each system handles its own response. Systems can be tested in isolation.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Ollama (local LLM) | REST API calls to `http://localhost:11434/api/chat` | Requires CORS config: `OLLAMA_ORIGINS="*"` on macOS via `launchctl setenv`. Use `stream: false` for simple commands, `stream: true` for narrator generation. Format parameter enforces JSON schema output. |
| Browser localStorage | `JSON.stringify` / `JSON.parse` for save data | 5-10MB limit. Sufficient for game state (flags, inventory, positions). Not suitable for caching large binary assets. |
| Browser IndexedDB | `idb-keyval` wrapper for asset caching | Use for caching loaded sprite sheets and audio if implementing offline/progressive loading. Not needed for MVP. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Core Engine <-> Game Logic | EventBus (pub/sub) | Engine emits input events, logic emits state change events |
| Game Logic <-> LLM Layer | GameAction interface | LLM layer returns typed GameAction; game logic never sees raw LLM output |
| Game Logic <-> Data Layer | Scene/Puzzle definitions (JSON) | Logic reads data; never writes to definitions. State changes go to GameState store |
| Rendering <-> Game Logic | Draw command list | Logic produces a list of what to draw; renderer draws it. Renderer has no game knowledge |
| UI Overlay <-> Game State | One-way data binding | UI reads from game state to display. User interactions go through InputManager -> EventBus |
| Audio <-> Game Logic | EventBus events | Systems emit sound events (`PLAY_SFX`, `PLAY_MUSIC`); AudioManager handles playback |

## Build Order (Dependency Chain)

The architecture has clear dependency layers that dictate build order:

```
Phase 1: Foundation (no game content needed)
  ├── GameLoop (everything depends on this)
  ├── EventBus (all systems communicate through this)
  ├── InputManager (mouse/keyboard capture)
  ├── CanvasRenderer (basic drawing capability)
  └── AssetLoader (ability to load images/audio)

Phase 2: Scene System (minimal playable prototype)
  ├── Scene + SceneManager (room loading, transitions)
  ├── Player (character rendering, click-to-move)
  ├── Pathfinding (walkable area navigation)
  ├── Hotspot (clickable scene regions)
  └── Scene data schema (JSON format for rooms)

Phase 3: Game Systems (gameplay loop)
  ├── InventoryManager (item tracking)
  ├── PuzzleEngine (condition/action evaluation)
  ├── FallbackParser (regex text commands -- playable without LLM)
  └── NarratorEngine (text display, typing effect)

Phase 4: LLM Integration (enhanced text parsing)
  ├── OllamaClient (REST API wrapper)
  ├── PromptBuilder (context-aware prompts)
  ├── ResponseMapper (JSON -> GameAction)
  └── Parser switching (LLM with fallback)

Phase 5: Polish Systems
  ├── AudioManager + Howler.js integration
  ├── DeathSystem (death triggers, quips, respawn)
  ├── SaveSystem (localStorage serialization)
  ├── UI Overlay (inventory panel, menus, dialogs)
  └── Scene transitions (fades, cuts)

Phase 6: Content Creation (data, not code)
  ├── All scene JSON definitions
  ├── All puzzle definitions
  ├── Narrator text banks
  ├── Dialog trees
  └── Asset production (sprites, backgrounds, audio)
```

**Why this order:**
- Phase 1 must come first because every other system depends on the game loop, event bus, and rendering.
- Phase 2 must precede Phase 3 because puzzles and inventory operate on scenes and hotspots.
- Phase 3 includes the FallbackParser deliberately: the game should be fully playable with simple text commands before LLM integration. This validates the entire puzzle/interaction system without LLM latency and complexity.
- Phase 4 is isolated because LLM integration is an enhancement layer, not a dependency. If Ollama integration proves problematic, the fallback parser keeps the game fully functional.
- Phase 5 is polish because audio, death animations, and save/load are important but not required for core gameplay testing.
- Phase 6 is last because content creation should only begin after the engine is proven. Creating content for an unfinished engine leads to rework.

## Sources

- [Phaser.io - HTML5 game framework](https://phaser.io/) -- market leader for HTML5 2D games, architecture reference
- [Game Programming Patterns - State](https://gameprogrammingpatterns.com/state.html) -- FSM, pushdown automata, hierarchical states
- [Adventure Game Studio Manual](https://adventuregamestudio.github.io/ags-manual/Settingupthegame.html) -- room/scene/inventory architecture from leading adventure game tool
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md) -- REST API endpoints, structured output, streaming
- [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs) -- JSON schema format parameter
- [Ollama CORS Configuration](https://objectgraph.com/blog/ollama-cors/) -- CORS setup for browser access
- [nav2d - 2D Navigation Meshes](https://github.com/frapa/nav2d) -- polygon navmesh with A* pathfinding for JS
- [PathFinding.js](https://github.com/qiao/PathFinding.js) -- grid-based A* pathfinding library
- [Howler.js](https://howlerjs.com/) -- Web Audio API wrapper for cross-browser game audio
- [Spicy Yoghurt - HTML5 Canvas Game Loop](https://spicyyoghurt.com/tutorials/html5-javascript-game-development/create-a-proper-game-loop-with-requestanimationframe) -- requestAnimationFrame game loop patterns
- [GameDev.net - State Machines in Games](https://www.gamedev.net/articles/programming/general-and-gameplay-programming/state-machines-in-games-r2982/) -- FSM patterns for scene management
- [GameDev.net - Navigation Meshes and Pathfinding](https://www.gamedev.net/tutorials/programming/artificial-intelligence/navigation-meshes-and-pathfinding-r4880/) -- navmesh A* implementation
- [IceFall Games - Adventure Puzzle Design](https://mtnphil.wordpress.com/2016/09/13/adventure-game-puzzle-design/) -- puzzle dependency graphs
- [GameDev.net - Point and Click Engine Design](https://www.gamedev.net/forums/topic/649892-coding-a-point-click-adventure-game-engine-from-scratch/) -- custom adventure engine architecture
- [Ollama Blog - Building LLM-Powered Web Apps](https://ollama.com/blog/building-llm-powered-web-apps) -- browser-to-Ollama integration patterns

---
*Architecture research for: Browser-based King's Quest-style adventure game with LLM text parsing*
*Researched: 2026-02-20*
