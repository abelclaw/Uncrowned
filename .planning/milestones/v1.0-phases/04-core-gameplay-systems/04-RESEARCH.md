# Phase 4: Core Gameplay Systems - Research

**Researched:** 2026-02-20
**Domain:** Inventory management, data-driven puzzles, game state flags, death/respawn, auto-save/manual save, narrator typewriter UI, main menu, death screen overlay
**Confidence:** HIGH

## Summary

Phase 4 transforms the navigation-and-parser demo into a real adventure game. It spans six interconnected systems: (1) an inventory system where items live in player state and can be picked up, examined, used on hotspots, and combined with each other; (2) a data-driven puzzle engine where conditions and actions are defined in JSON and evaluated against game state flags; (3) a death system triggered by specific player actions, with funny narrator commentary and instant respawn to the last auto-save; (4) a narrator/dialogue display with typewriter text effect; (5) a save/load system with auto-save on room transitions and multiple manual save slots backed by localStorage; and (6) UI scenes for main menu and death screen overlay.

The key architectural insight is that nearly all of these systems converge on a single concept: **game state as a bag of flags**. Inventory is flags (player has item X). Puzzle conditions check flags. Puzzle actions set flags. Death triggers check flags. Save/load serializes flags. The entire phase can be organized around a central `GameState` object that holds inventory items, visited rooms, puzzle progress, and arbitrary string flags -- with every system reading from and writing to this single source of truth.

The second key insight is that the CommandDispatcher must evolve from returning static string responses (Phase 3) to evaluating conditions, executing side effects (add item to inventory, set flag, trigger death), and returning dynamic responses. This is where the puzzle engine and death system hook into the existing parser pipeline.

**Primary recommendation:** Build a central `GameState` class (singleton, accessible globally) that holds inventory, flags, visited rooms, and current room ID. Extend the room JSON schema with `items` (pickable objects), `puzzles` (condition/action pairs), and `deathTriggers` (action+condition -> death). The CommandDispatcher gains access to GameState and evaluates conditions before returning responses. Save/load serializes GameState to localStorage as JSON. The narrator typewriter effect is a simple JavaScript `setInterval` character reveal on the existing HTML response element. The main menu and death screen are Phaser scenes launched in parallel (overlay pattern).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INV-01 | Player can pick up items from scenes and add them to inventory | Items defined in room JSON with `takeable: true`. CommandDispatcher "take" handler checks if item exists in room and is takeable, adds to GameState.inventory, removes from room's active items. See "Inventory System" section. |
| INV-02 | Player can examine items in inventory to read descriptions | "examine/look" command extended to check inventory items when subject not found in room hotspots. Item definitions include `description` field. See "Inventory Item Schema" section. |
| INV-03 | Player can use inventory items on scene hotspots | "use X on Y" command: CommandDispatcher checks if X is in inventory and Y is a room hotspot, then evaluates puzzle conditions. See "Puzzle Condition/Action System" section. |
| INV-04 | Player can combine two inventory items to create new items | "combine X with Y" or "use X on Y" where both are inventory items: checks combination recipes in puzzle data. See "Item Combination" section. |
| INV-05 | Inventory panel displays all held items visually | HTML-based inventory panel (consistent with TextInputBar pattern) showing item icons/names. Toggle with "inventory" command or UI button. See "Inventory UI" section. |
| PUZ-01 | Inventory combination puzzles | Puzzle definitions in JSON: conditions check for items in inventory, actions create new items and consume inputs. See "Puzzle Types" section. |
| PUZ-02 | Environmental/logic puzzles | Puzzle definitions with conditions checking game state flags and room state. Actions set flags, reveal hotspots, open exits. See "Puzzle Types" section. |
| PUZ-04 | All puzzles defined in data files (JSON) | Puzzle definitions live in room JSON or a separate puzzles JSON. Engine evaluates them generically. See "Puzzle JSON Schema" section. |
| PUZ-05 | Puzzle condition/action system evaluates game state flags | Central GameState.flags map. Conditions are arrays of flag checks (has-item, flag-set, flag-not-set, in-room). Actions are arrays of mutations (add-item, remove-item, set-flag, show-message). See "Condition/Action Engine" section. |
| PUZ-07 | Every puzzle has logical solution | Design constraint, not engine feature. Research supports: no "dead man walking" states, all required items remain accessible, auto-save prevents permanent loss. See "Unwinnable State Prevention" section. |
| DEATH-01 | Frequent death scenarios triggered by specific player actions | Death triggers defined in room JSON: specific verb+subject combinations that match conditions trigger death. See "Death System" section. |
| DEATH-02 | Each death has unique funny narrator commentary | Death trigger definitions include `narratorText` field with sardonic commentary. See "Death Data Schema" section. |
| DEATH-03 | Game auto-saves on every room transition | GameState serialized to localStorage on every room change. Separate auto-save slot from manual saves. See "Auto-Save System" section. |
| DEATH-04 | Death instantly resets to last auto-save | Death handler loads the auto-save slot, restoring GameState to room-entry state. Player loses only current-room progress. See "Death Respawn" section. |
| DEATH-05 | Player can never reach unwinnable game state | Design constraint: items are never permanently consumable in wrong context, key items cannot be used incorrectly (only correct combinations work), auto-save prevents progress loss. See "Unwinnable State Prevention" section. |
| NARR-03 | Dark comedy narrator provides sardonic commentary | Narrator voice already established in CommandDispatcher responses. Phase 4 extends with death commentary, puzzle feedback, and typewriter display. See "Narrator Integration" section. |
| NARR-04 | Narrator text displays with typewriter effect in dialogue box | JavaScript setInterval-based character reveal on the HTML response element. Skippable by clicking or pressing any key. See "Typewriter Effect" section. |
| NARR-05 | Scene descriptions available via "look" command | Already implemented in Phase 3 CommandDispatcher. Phase 4 extends to include dynamic descriptions based on game state flags (e.g., "The stump is empty" after taking an item). See "Dynamic Descriptions" section. |
| UI-01 | Multiple save slots for manual saving | localStorage keys like `kqgame-save-1` through `kqgame-save-5`. Save command or menu button serializes GameState. See "Save/Load System" section. |
| UI-02 | Auto-save on room transitions | Separate localStorage key `kqgame-autosave`. Written in SceneTransition before starting new room. See "Auto-Save System" section. |
| UI-03 | Text input command bar always visible during gameplay | Already implemented in Phase 3. No changes needed. |
| UI-04 | Dialogue/narrator text box displays text with clear formatting | Enhance existing `#parser-response` element with typewriter effect, multi-line support, and styled narrator text. See "Typewriter Effect" section. |
| UI-05 | Main menu with new game, load game, and settings | New Phaser scene `MainMenuScene` with text-based menu options. Replaces direct-to-game flow. See "Main Menu" section. |
| UI-06 | Death screen overlay with narrator text and retry option | Phaser overlay scene launched on death. Dark overlay with narrator death text (typewriter) and "Try Again" button. See "Death Screen" section. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | ^3.90.0 | Game engine (already installed) | Scene management, event system, overlay scenes for menus/death |
| TypeScript | ~5.7.2 | Type safety (already installed) | Strong typing for GameState, puzzle conditions, inventory items |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | No additional libraries needed. All systems are pure TypeScript + localStorage + HTML/CSS. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage for saves | IndexedDB | IndexedDB supports larger data and structured queries, but adventure game save state is tiny (<50KB). localStorage is simpler and has zero API overhead. |
| HTML inventory panel | Phaser-rendered inventory | Phaser canvas inventory requires manual text rendering, scroll handling, click detection. HTML gives free layout, styling, accessibility. Consistent with TextInputBar pattern. |
| Custom typewriter JS | TypeIt.js library | TypeIt adds 20KB+ dependency for what is 15 lines of setInterval code. Not worth the dependency. |
| JSON puzzle definitions | Scripting language (Ink, Lua) | Ink/Lua add complexity and dependencies. JSON condition/action pairs handle inventory/environmental puzzles. Ink is saved for Phase 6 (NPC dialogue). |

**Installation:**
```bash
# No new packages needed. Pure TypeScript implementation using existing stack.
```

## Architecture Patterns

### Recommended Project Structure
```
src/game/
├── state/
│   ├── GameState.ts           # NEW: Central game state (inventory, flags, room, visited)
│   ├── SaveManager.ts         # NEW: Save/load to localStorage, auto-save, manual slots
│   └── GameStateTypes.ts      # NEW: Type definitions for state, items, save data
├── systems/
│   ├── CommandDispatcher.ts   # EXTEND: Add inventory commands, puzzle evaluation, death triggers
│   ├── PuzzleEngine.ts        # NEW: Evaluate conditions, execute actions from puzzle definitions
│   ├── DeathSystem.ts         # NEW: Check death triggers, display death screen, handle respawn
│   ├── InventorySystem.ts     # NEW: Add/remove items, check combinations, manage inventory state
│   ├── NavigationSystem.ts    # (existing)
│   └── SceneTransition.ts     # EXTEND: Add auto-save before transition
├── ui/
│   ├── TextInputBar.ts        # EXTEND: Add typewriter effect to response display
│   ├── InventoryPanel.ts      # NEW: HTML-based inventory display panel
│   └── NarratorDisplay.ts     # NEW: Typewriter text rendering with skip support
├── scenes/
│   ├── MainMenuScene.ts       # NEW: Title screen with New Game, Load, Settings
│   ├── DeathScene.ts          # NEW: Overlay scene for death with narrator text + retry
│   ├── RoomScene.ts           # EXTEND: Wire in GameState, puzzle engine, death system
│   └── ...                    # (existing scenes)
├── parser/
│   ├── TextParser.ts          # EXTEND: Add "inventory"/"i" as recognized command
│   ├── VerbTable.ts           # EXTEND: Add inventory, save, load verbs
│   └── NounResolver.ts        # EXTEND: Resolve nouns against inventory items
├── types/
│   ├── GameAction.ts          # EXTEND: Add 'inventory', 'save', 'load', 'combine' verbs
│   ├── RoomData.ts            # EXTEND: Add items, puzzles, deathTriggers to room schema
│   ├── ItemData.ts            # NEW: Item definitions, combination recipes
│   └── PuzzleData.ts          # NEW: Puzzle conditions, actions, triggers
├── data/                      # NEW: Global data files (not per-room)
│   └── items.json             # NEW: Master item definitions (id, name, description, icon)
└── EventBus.ts                # EXTEND: Add game state events
```

### Pattern 1: GameState as Central Truth

**What:** A singleton GameState object holds all mutable game state: current room, inventory items, game flags (string keys to boolean/string values), visited rooms, and play time. Every system reads from and writes to GameState. Save/load serializes/deserializes this object.

**When to use:** Every system that needs to know "what has the player done?"

**Example:**
```typescript
// state/GameState.ts
export interface GameStateData {
    currentRoom: string;
    inventory: string[];                    // Item IDs the player holds
    flags: Record<string, boolean | string>; // Arbitrary game state flags
    visitedRooms: string[];                 // Room IDs visited (for "new room" detection)
    removedItems: Record<string, string[]>; // Room ID -> removed item IDs (items already taken)
    playTimeMs: number;
    deathCount: number;
}

export class GameState {
    private static instance: GameState;
    private data: GameStateData;

    static getInstance(): GameState {
        if (!GameState.instance) {
            GameState.instance = new GameState();
        }
        return GameState.instance;
    }

    private constructor() {
        this.data = this.getDefaultState();
    }

    private getDefaultState(): GameStateData {
        return {
            currentRoom: 'forest_clearing',
            inventory: [],
            flags: {},
            visitedRooms: [],
            removedItems: {},
            playTimeMs: 0,
            deathCount: 0,
        };
    }

    // Inventory operations
    hasItem(itemId: string): boolean {
        return this.data.inventory.includes(itemId);
    }

    addItem(itemId: string): void {
        if (!this.hasItem(itemId)) {
            this.data.inventory.push(itemId);
        }
    }

    removeItem(itemId: string): void {
        this.data.inventory = this.data.inventory.filter(id => id !== itemId);
    }

    // Flag operations
    getFlag(key: string): boolean | string | undefined {
        return this.data.flags[key];
    }

    setFlag(key: string, value: boolean | string = true): void {
        this.data.flags[key] = value;
    }

    isFlagSet(key: string): boolean {
        return !!this.data.flags[key];
    }

    // Room operations
    markRoomVisited(roomId: string): void {
        if (!this.data.visitedRooms.includes(roomId)) {
            this.data.visitedRooms.push(roomId);
        }
    }

    isRoomItemRemoved(roomId: string, itemId: string): boolean {
        return this.data.removedItems[roomId]?.includes(itemId) ?? false;
    }

    markRoomItemRemoved(roomId: string, itemId: string): void {
        if (!this.data.removedItems[roomId]) {
            this.data.removedItems[roomId] = [];
        }
        this.data.removedItems[roomId].push(itemId);
    }

    // Serialization
    serialize(): string {
        return JSON.stringify(this.data);
    }

    deserialize(json: string): void {
        this.data = JSON.parse(json);
    }

    reset(): void {
        this.data = this.getDefaultState();
    }

    getData(): Readonly<GameStateData> {
        return this.data;
    }
}
```

### Pattern 2: Data-Driven Puzzle Condition/Action System

**What:** Puzzles are defined as condition/action pairs in JSON. A condition is an array of checks (has-item, flag-set, in-room, etc.). An action is an array of mutations (add-item, remove-item, set-flag, show-message, trigger-death, etc.). The PuzzleEngine evaluates conditions against GameState and executes matching actions.

**When to use:** Every interaction that produces a game state change (picking up items, solving puzzles, triggering deaths).

**Example:**
```typescript
// types/PuzzleData.ts

/** A single condition that must be true for a puzzle/trigger to fire */
export type PuzzleCondition =
    | { type: 'has-item'; item: string }
    | { type: 'not-has-item'; item: string }
    | { type: 'flag-set'; flag: string }
    | { type: 'flag-not-set'; flag: string }
    | { type: 'in-room'; room: string }
    | { type: 'item-not-taken'; item: string }; // Room item still present

/** A single action to execute when all conditions are met */
export type PuzzleAction =
    | { type: 'add-item'; item: string }
    | { type: 'remove-item'; item: string }
    | { type: 'set-flag'; flag: string; value?: boolean | string }
    | { type: 'remove-flag'; flag: string }
    | { type: 'show-message'; text: string }
    | { type: 'narrator-say'; text: string }
    | { type: 'trigger-death'; deathId: string }
    | { type: 'remove-hotspot'; hotspot: string }
    | { type: 'add-hotspot'; hotspot: string }
    | { type: 'open-exit'; exit: string };

/** A complete puzzle/interaction definition */
export interface PuzzleDefinition {
    id: string;
    /** What verb+subject+target triggers evaluation (null = any) */
    trigger: {
        verb: string;
        subject?: string;   // Hotspot/item ID
        target?: string;    // For two-noun commands
    };
    /** All conditions must be true */
    conditions: PuzzleCondition[];
    /** Actions to execute when all conditions are met */
    actions: PuzzleAction[];
    /** Whether this puzzle can only fire once */
    once?: boolean;
}
```

**JSON example (in room data):**
```json
{
    "puzzles": [
        {
            "id": "take-rusty-key",
            "trigger": { "verb": "take", "subject": "rusty-key" },
            "conditions": [
                { "type": "item-not-taken", "item": "rusty-key" }
            ],
            "actions": [
                { "type": "add-item", "item": "rusty-key" },
                { "type": "narrator-say", "text": "You pocket the rusty key. It leaves orange residue on your fingers. Lovely." }
            ],
            "once": true
        },
        {
            "id": "use-key-on-door",
            "trigger": { "verb": "use", "subject": "rusty-key", "target": "locked-door" },
            "conditions": [
                { "type": "has-item", "item": "rusty-key" },
                { "type": "flag-not-set", "flag": "door-unlocked" }
            ],
            "actions": [
                { "type": "set-flag", "flag": "door-unlocked" },
                { "type": "remove-item", "item": "rusty-key" },
                { "type": "open-exit", "exit": "to-dungeon" },
                { "type": "narrator-say", "text": "The key turns with a groan that rivals your own. The door swings open, revealing darkness and the faint smell of regret." }
            ],
            "once": true
        }
    ]
}
```

### Pattern 3: Death Triggers as Specialized Puzzles

**What:** Death scenarios use the same condition/action system as puzzles but with a `trigger-death` action. Death triggers are evaluated before normal responses in the CommandDispatcher, so dangerous actions are caught.

**When to use:** Any verb+subject combination that should kill the player.

**Example:**
```json
{
    "deathTriggers": [
        {
            "id": "drink-poison",
            "trigger": { "verb": "use", "subject": "mysterious-bottle" },
            "conditions": [
                { "type": "flag-not-set", "flag": "bottle-identified" }
            ],
            "actions": [
                { "type": "trigger-death", "deathId": "poison-death" }
            ]
        }
    ],
    "deaths": {
        "poison-death": {
            "narratorText": "You drink the mysterious liquid. It tastes like regret and bad decisions. Which, coincidentally, is exactly what it is. You crumple to the floor in a heap of poor judgment.",
            "title": "Death by Curiosity"
        }
    }
}
```

### Pattern 4: Typewriter Text Effect (JavaScript, Not CSS)

**What:** Narrator text is revealed one character at a time using a simple JavaScript interval. The effect is skippable (click or keypress reveals all text immediately). This runs on the existing HTML `#parser-response` element.

**When to use:** Every narrator response, room descriptions, death text.

**Example:**
```typescript
// ui/NarratorDisplay.ts
export class NarratorDisplay {
    private element: HTMLElement;
    private timer: ReturnType<typeof setInterval> | null = null;
    private fullText: string = '';
    private charIndex: number = 0;
    private onComplete: (() => void) | null = null;

    constructor(element: HTMLElement) {
        this.element = element;
        // Click to skip
        this.element.addEventListener('click', () => this.skipToEnd());
    }

    /**
     * Display text with typewriter effect.
     * @param text - Full text to display
     * @param speed - Milliseconds per character (default 30)
     * @param onComplete - Callback when text is fully displayed
     */
    typewrite(text: string, speed: number = 30, onComplete?: () => void): void {
        this.stop();
        this.fullText = text;
        this.charIndex = 0;
        this.onComplete = onComplete ?? null;
        this.element.textContent = '';

        this.timer = setInterval(() => {
            if (this.charIndex < this.fullText.length) {
                this.element.textContent += this.fullText[this.charIndex];
                this.charIndex++;
            } else {
                this.stop();
                this.onComplete?.();
            }
        }, speed);
    }

    /** Show full text immediately (skip animation). */
    skipToEnd(): void {
        this.stop();
        this.element.textContent = this.fullText;
        this.onComplete?.();
    }

    /** Show text instantly without typewriter effect. */
    showInstant(text: string): void {
        this.stop();
        this.fullText = text;
        this.element.textContent = text;
    }

    private stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    destroy(): void {
        this.stop();
    }
}
```

### Pattern 5: Save/Load via localStorage with JSON Serialization

**What:** GameState is serialized to JSON and stored in localStorage. Auto-save uses a dedicated key. Manual saves use numbered slot keys. Load deserializes and restores GameState, then restarts RoomScene with the saved room.

**When to use:** Auto-save on every room transition. Manual save via "save" command or menu. Load from main menu or "load" command.

**Example:**
```typescript
// state/SaveManager.ts
const SAVE_PREFIX = 'kqgame';
const AUTO_SAVE_KEY = `${SAVE_PREFIX}-autosave`;
const MANUAL_SAVE_PREFIX = `${SAVE_PREFIX}-save`;
const MAX_SAVE_SLOTS = 5;

export interface SaveSlotInfo {
    slot: number;
    roomId: string;
    roomName: string;
    timestamp: number;
    playTimeMs: number;
}

export class SaveManager {
    /** Auto-save current game state. Called on room transitions. */
    static autoSave(state: GameState): void {
        const data = state.serialize();
        localStorage.setItem(AUTO_SAVE_KEY, data);
        localStorage.setItem(`${AUTO_SAVE_KEY}-meta`, JSON.stringify({
            timestamp: Date.now(),
            roomId: state.getData().currentRoom,
        }));
    }

    /** Load auto-save. Returns true if loaded successfully. */
    static loadAutoSave(state: GameState): boolean {
        const data = localStorage.getItem(AUTO_SAVE_KEY);
        if (!data) return false;
        state.deserialize(data);
        return true;
    }

    /** Save to a numbered slot (1-5). */
    static saveToSlot(state: GameState, slot: number): void {
        const key = `${MANUAL_SAVE_PREFIX}-${slot}`;
        localStorage.setItem(key, state.serialize());
        localStorage.setItem(`${key}-meta`, JSON.stringify({
            slot,
            timestamp: Date.now(),
            roomId: state.getData().currentRoom,
            playTimeMs: state.getData().playTimeMs,
        }));
    }

    /** Load from a numbered slot. Returns true if loaded. */
    static loadFromSlot(state: GameState, slot: number): boolean {
        const key = `${MANUAL_SAVE_PREFIX}-${slot}`;
        const data = localStorage.getItem(key);
        if (!data) return false;
        state.deserialize(data);
        return true;
    }

    /** Get metadata for all save slots. */
    static getSlotInfos(): (SaveSlotInfo | null)[] {
        const slots: (SaveSlotInfo | null)[] = [];
        for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
            const metaStr = localStorage.getItem(`${MANUAL_SAVE_PREFIX}-${i}-meta`);
            if (metaStr) {
                slots.push(JSON.parse(metaStr));
            } else {
                slots.push(null);
            }
        }
        return slots;
    }

    /** Check if auto-save exists. */
    static hasAutoSave(): boolean {
        return localStorage.getItem(AUTO_SAVE_KEY) !== null;
    }
}
```

### Pattern 6: Overlay Scenes for Death Screen and Menus

**What:** Phaser 3 supports running multiple scenes in parallel. The death screen is launched as an overlay scene (using `scene.launch()`) that renders on top of the paused game scene. The main menu is a standalone scene that starts the game.

**When to use:** Death events, main menu, pause menu.

**API reference:**
- `this.scene.launch('DeathScene', { deathData })` -- start overlay without stopping current scene
- `this.scene.pause('RoomScene')` -- pause the game scene beneath
- `this.scene.stop('DeathScene')` -- close the overlay
- `this.scene.resume('RoomScene')` -- unpause (not used for death; death loads auto-save instead)

**Example:**
```typescript
// scenes/DeathScene.ts
export class DeathScene extends Phaser.Scene {
    constructor() {
        super('DeathScene');
    }

    create(data: { title: string; narratorText: string }): void {
        // Dark overlay covering entire viewport
        const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.85);
        overlay.setDepth(0);

        // Death title
        this.add.text(480, 120, data.title, {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#cc3333',
        }).setOrigin(0.5);

        // Narrator text (could use typewriter via HTML overlay or Phaser text)
        const narratorText = this.add.text(480, 270, data.narratorText, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#c8c8d4',
            wordWrap: { width: 700 },
            align: 'center',
            lineSpacing: 8,
        }).setOrigin(0.5);

        // "Try Again" button
        const retryText = this.add.text(480, 430, '[ Try Again ]', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffcc00',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        retryText.on('pointerover', () => retryText.setColor('#ffffff'));
        retryText.on('pointerout', () => retryText.setColor('#ffcc00'));
        retryText.on('pointerdown', () => {
            this.scene.stop('DeathScene');
            // Load auto-save and restart RoomScene
            const state = GameState.getInstance();
            SaveManager.loadAutoSave(state);
            this.scene.start('RoomScene', { roomId: state.getData().currentRoom });
        });
    }
}
```

### Pattern 7: Extending Room JSON for Items and Puzzles

**What:** The room JSON schema grows to include `items` (pickable objects in the scene), `puzzles` (condition/action pairs), and `deathTriggers`. Items are a subset of hotspots -- they appear in the scene and can be interacted with, but also can be picked up and removed.

**When to use:** Every room that has interactive items, puzzles, or death scenarios.

**Example:**
```typescript
// types/RoomData.ts -- EXTENDED
export interface RoomItemData {
    id: string;                    // Must match item definition in items.json
    name: string;                  // Display name
    zone: { x: number; y: number; width: number; height: number };
    interactionPoint: { x: number; y: number };
    /** Sprite/image key for the item in the scene (before pickup) */
    spriteKey?: string;
    responses?: HotspotResponses;  // Same verb-specific responses as hotspots
}

// RoomData extended with:
export interface RoomData {
    // ... existing fields ...
    items?: RoomItemData[];            // Pickable items in this room
    puzzles?: PuzzleDefinition[];      // Puzzle condition/action pairs
    deathTriggers?: PuzzleDefinition[]; // Death trigger condition/action pairs
    deaths?: Record<string, { title: string; narratorText: string }>;
}
```

### Pattern 8: Inventory Panel as HTML Element

**What:** The inventory is an HTML panel (like TextInputBar) that can be toggled visible. It shows a grid of item names/icons. Clicking an item "selects" it for use. The panel is positioned above the parser response area or as a slide-out panel.

**When to use:** "inventory" or "i" command, or clicking an inventory UI button.

**Example:**
```typescript
// ui/InventoryPanel.ts
export class InventoryPanel {
    private panelEl: HTMLDivElement;
    private itemsEl: HTMLDivElement;
    private visible: boolean = false;

    constructor(container: HTMLElement) {
        this.panelEl = document.createElement('div');
        this.panelEl.id = 'inventory-panel';
        this.panelEl.style.display = 'none';

        const header = document.createElement('div');
        header.id = 'inventory-header';
        header.textContent = 'Inventory';
        this.panelEl.appendChild(header);

        this.itemsEl = document.createElement('div');
        this.itemsEl.id = 'inventory-items';
        this.panelEl.appendChild(this.itemsEl);

        container.appendChild(this.panelEl);
    }

    update(items: Array<{ id: string; name: string }>): void {
        this.itemsEl.innerHTML = '';
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'inventory-empty';
            empty.textContent = 'Your pockets are empty. How tragic.';
            this.itemsEl.appendChild(empty);
            return;
        }
        for (const item of items) {
            const el = document.createElement('div');
            el.className = 'inventory-item';
            el.textContent = item.name;
            el.dataset.itemId = item.id;
            this.itemsEl.appendChild(el);
        }
    }

    toggle(): void {
        this.visible = !this.visible;
        this.panelEl.style.display = this.visible ? 'block' : 'none';
    }

    show(): void {
        this.visible = true;
        this.panelEl.style.display = 'block';
    }

    hide(): void {
        this.visible = false;
        this.panelEl.style.display = 'none';
    }

    destroy(): void {
        this.panelEl.remove();
    }
}
```

### Anti-Patterns to Avoid

- **Scattering game state across systems:** Do NOT let each system maintain its own copy of state. One GameState, one source of truth. Inventory, puzzle progress, flags -- all live in GameState.
- **Hardcoding puzzle logic in TypeScript:** Puzzles must be data-driven (JSON). The engine should not contain any puzzle-specific code like `if (item === 'rusty-key' && hotspot === 'locked-door')`. That logic lives in the JSON data.
- **Making items disappear from scenes via DOM manipulation:** Track removed items in GameState (removedItems map). When RoomScene loads, filter out items that have been taken. This way, save/load correctly restores item visibility.
- **Auto-save after state changes in a room:** Auto-save happens ONLY on room transitions (before entering the new room). Never during a room. This ensures death resets to room-entry state, not mid-puzzle state.
- **Using Phaser UI for text-heavy elements:** Stay with HTML for inventory panel, narrator text, menus. Phaser text rendering is pixel-based and does not support selection, scrolling, or accessibility. HTML is superior for text UI.
- **Creating unwinnable states:** Never consume key items on wrong actions. "Use key on wrong door" should say "That doesn't work" but NOT remove the key. Items are only consumed by puzzle actions that explicitly remove them on success.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Typewriter text effect | Complex animation system | Simple `setInterval` with character index | 15 lines of code. Libraries add unnecessary dependency. |
| Save data serialization | Custom binary format | `JSON.stringify` / `JSON.parse` + localStorage | Adventure game state is small. JSON is debuggable and human-readable. |
| Inventory grid layout | Custom Phaser-based grid rendering | HTML flexbox/grid layout | CSS handles responsive grids trivially. HTML gives accessibility. |
| Condition evaluation | Custom expression parser | Array of typed condition objects with switch statement | The condition types are finite and known. No need for a general expression language. |
| Scene overlay (death screen) | Custom camera/rendering layer | Phaser scene.launch() + scene.pause() | Phaser's built-in multi-scene system handles overlay rendering, input isolation, and lifecycle. |
| Game state persistence | Custom file system | localStorage | Browser-native, 5MB capacity (more than enough), zero-dependency. |

**Key insight:** All six systems in this phase converge on GameState + condition/action evaluation. Build the GameState and PuzzleEngine first, and every other system becomes straightforward wiring.

## Common Pitfalls

### Pitfall 1: Auto-Save Timing Creates Unsolvable State on Death
**What goes wrong:** If auto-save fires AFTER the player has done something irreversible in a room (used an item incorrectly), death reset loads a mid-room state where they are already stuck.
**Why it happens:** Auto-save fires too frequently or at wrong moments.
**How to avoid:** Auto-save ONLY on room entry (during room transition, before the new room's create() runs). Never mid-room. Death always resets to "just entered this room" state. This is the King's Quest VII pattern: retry brings you back to just before the dangerous area.
**Warning signs:** Player dies, retries, and finds they are missing an item they had when they entered the room.

### Pitfall 2: NounResolver Does Not Check Inventory Items
**What goes wrong:** Player types "use key on door" but the NounResolver only checks room hotspots and exits. "key" resolves to 'unknown' type, and the CommandDispatcher cannot find the item.
**Why it happens:** Phase 3's NounResolver was designed for room-only context. Phase 4 must extend it to check inventory.
**How to avoid:** Add inventory item resolution to NounResolver's resolve chain. After checking hotspots (step 3) and before checking exits (step 4), check inventory items by ID and name. The NounResolver already returns `type: 'unknown'` for unresolved nouns (line 120 comment says "for future inventory resolution (Phase 4)") -- this is the extension point.
**Warning signs:** "use" and "combine" commands never find inventory items. Player has to drop items to interact with them.

### Pitfall 3: Puzzle Condition Evaluation Order Matters
**What goes wrong:** Two puzzles match the same trigger (e.g., "use bottle" could be a puzzle solution or a death trigger depending on conditions). If the wrong one is evaluated first, the player dies when they should succeed.
**Why it happens:** Puzzle definitions are evaluated in array order. If death triggers are checked before puzzle solutions, a death with broader conditions fires first.
**How to avoid:** Evaluate puzzle definitions in specificity order: more conditions = more specific = higher priority. Alternatively, define a `priority` field. As a simpler rule: check puzzles first (solutions), then death triggers. A successful puzzle match short-circuits death trigger evaluation.
**Warning signs:** Player has the right items and does the right thing but still dies.

### Pitfall 4: Items and Hotspots Share ID Space Collisions
**What goes wrong:** A room has a hotspot "chest" and an item "chest" (the thing inside the chest). "look at chest" is ambiguous -- does it mean the hotspot or the inventory item?
**Why it happens:** Hotspots and items use the same noun resolution pipeline without namespace separation.
**How to avoid:** Use distinct ID prefixes for items vs hotspots (not strictly necessary) but more importantly, define clear resolution priority: room hotspots first (they are physically present), then inventory items. For "use X on Y", X should resolve inventory-first (you are using something you have), Y should resolve room-first (you are targeting something in the scene).
**Warning signs:** "look at" shows inventory description when player meant the room object, or vice versa.

### Pitfall 5: Death Scene Input Leaks to Underlying RoomScene
**What goes wrong:** While the death screen overlay is showing, clicks pass through to the RoomScene underneath, moving the player or triggering interactions.
**Why it happens:** Phaser's input system propagates events to all active scenes unless explicitly stopped.
**How to avoid:** When launching the death scene, pause the RoomScene (`this.scene.pause('RoomScene')`). The death scene's full-screen overlay rectangle should be interactive to capture clicks. Alternatively, disable input on RoomScene explicitly: `this.scene.get('RoomScene').input.enabled = false`.
**Warning signs:** Player moves or takes actions while the death screen is visible.

### Pitfall 6: localStorage Full or Unavailable
**What goes wrong:** In private browsing mode, some browsers restrict or disable localStorage. The game crashes on save attempt.
**Why it happens:** `localStorage.setItem()` can throw `QuotaExceededError` or `SecurityError`.
**How to avoid:** Wrap all localStorage operations in try/catch. If saving fails, show an in-game message ("Unable to save -- check browser settings") rather than crashing. Check for localStorage availability at startup.
**Warning signs:** Game crashes with uncaught DOMException on save.

### Pitfall 7: Command Verb Set Not Extended for New Systems
**What goes wrong:** Player types "inventory" or "save" or "load" and gets "I don't understand". The parser does not recognize these as valid commands.
**Why it happens:** VerbTable was designed for the 8 standard adventure verbs. Meta-commands (inventory, save, load) were not included.
**How to avoid:** Add new verb entries to VerbTable: `inventory` (synonyms: "inventory", "i", "items", "bag"), `save` (synonyms: "save", "save game"), `load` (synonyms: "load", "restore", "load game"). Update the GameAction Verb type union. Add CommandDispatcher handlers for these meta-verbs.
**Warning signs:** Players cannot access inventory or save/load via text commands.

## Code Examples

Verified patterns from the existing codebase and standard adventure game implementations:

### Extending VerbTable for Phase 4 Commands
```typescript
// parser/VerbTable.ts -- ADD these entries
// Update Verb type in GameAction.ts first:
// export type Verb = 'look' | 'take' | 'use' | 'go' | 'talk' | 'open' | 'push' | 'pull'
//     | 'inventory' | 'save' | 'load' | 'combine';

{
    canonical: 'inventory',
    synonyms: ['inventory', 'i', 'items', 'bag', 'pockets'],
    patterns: [
        /^(?:inventory|items|bag|pockets|i)$/i,
    ],
},
{
    canonical: 'save',
    synonyms: ['save', 'savegame'],
    patterns: [
        /^save\s+(?:game\s+)?(\d+)$/i,    // "save 1" or "save game 1"
        /^save(?:\s+game)?$/i,             // bare "save" -> prompt for slot
    ],
},
{
    canonical: 'load',
    synonyms: ['load', 'restore', 'loadgame'],
    patterns: [
        /^(?:load|restore)\s+(?:game\s+)?(\d+)$/i, // "load 1"
        /^(?:load|restore)(?:\s+game)?$/i,          // bare "load"
    ],
},
```

### Extending NounResolver for Inventory Items
```typescript
// parser/NounResolver.ts -- EXTEND resolve() method
// Add inventory items parameter and check between hotspot checks and exit checks

resolve(
    rawNoun: string,
    hotspots: HotspotData[],
    exits: ExitData[],
    inventoryItems?: Array<{ id: string; name: string }>,  // NEW
): ResolvedNoun {
    // ... existing hotspot checks (steps 1-3) ...

    // NEW: Check inventory items (between hotspot and exit checks)
    if (inventoryItems) {
        for (const item of inventoryItems) {
            if (item.id === normalized) {
                return { type: 'item', id: item.id, confidence: 'exact' };
            }
        }
        for (const item of inventoryItems) {
            if (item.name.toLowerCase() === normalized) {
                return { type: 'item', id: item.id, confidence: 'exact' };
            }
        }
        for (const item of inventoryItems) {
            const itemWords = item.name.toLowerCase().split(/\s+/);
            const nounWords = normalized.split(/\s+/);
            if (nounWords.some(w => itemWords.includes(w))) {
                return { type: 'item', id: item.id, confidence: 'partial' };
            }
        }
    }

    // ... existing direction and exit checks (steps 4-7) ...
}
```

### PuzzleEngine Condition Evaluator
```typescript
// systems/PuzzleEngine.ts
import type { PuzzleCondition, PuzzleAction, PuzzleDefinition } from '../types/PuzzleData';
import { GameState } from '../state/GameState';

export class PuzzleEngine {
    private state: GameState;

    constructor() {
        this.state = GameState.getInstance();
    }

    /** Check if all conditions of a puzzle are met. */
    evaluateConditions(conditions: PuzzleCondition[]): boolean {
        return conditions.every(cond => this.evaluateCondition(cond));
    }

    private evaluateCondition(cond: PuzzleCondition): boolean {
        switch (cond.type) {
            case 'has-item':
                return this.state.hasItem(cond.item);
            case 'not-has-item':
                return !this.state.hasItem(cond.item);
            case 'flag-set':
                return this.state.isFlagSet(cond.flag);
            case 'flag-not-set':
                return !this.state.isFlagSet(cond.flag);
            case 'in-room':
                return this.state.getData().currentRoom === cond.room;
            case 'item-not-taken':
                return !this.state.isRoomItemRemoved(
                    this.state.getData().currentRoom,
                    cond.item
                );
            default:
                return false;
        }
    }

    /** Execute an array of puzzle actions. Returns the combined response text. */
    executeActions(actions: PuzzleAction[]): string {
        const messages: string[] = [];
        for (const action of actions) {
            const msg = this.executeAction(action);
            if (msg) messages.push(msg);
        }
        return messages.join(' ');
    }

    private executeAction(action: PuzzleAction): string | null {
        switch (action.type) {
            case 'add-item':
                this.state.addItem(action.item);
                return null;
            case 'remove-item':
                this.state.removeItem(action.item);
                return null;
            case 'set-flag':
                this.state.setFlag(action.flag, action.value ?? true);
                return null;
            case 'remove-flag':
                this.state.setFlag(action.flag, false);
                return null;
            case 'show-message':
            case 'narrator-say':
                return action.text;
            case 'trigger-death':
                // Emit death event -- handled by RoomScene/DeathSystem
                EventBus.emit('trigger-death', action.deathId);
                return null;
            case 'remove-hotspot':
            case 'add-hotspot':
            case 'open-exit':
                // These require RoomScene to update its display
                EventBus.emit('room-update', action);
                return null;
            default:
                return null;
        }
    }

    /**
     * Find and execute the first matching puzzle for a given action.
     * Returns the response text, or null if no puzzle matched.
     */
    tryPuzzle(
        verb: string,
        subject: string | null,
        target: string | null,
        puzzles: PuzzleDefinition[],
    ): { response: string; matched: boolean } | null {
        for (const puzzle of puzzles) {
            if (this.matchesTrigger(puzzle, verb, subject, target)) {
                if (this.evaluateConditions(puzzle.conditions)) {
                    const response = this.executeActions(puzzle.actions);
                    // Mark as solved if one-time
                    if (puzzle.once) {
                        this.state.setFlag(`puzzle-solved:${puzzle.id}`, true);
                    }
                    return { response, matched: true };
                }
            }
        }
        return null;
    }

    private matchesTrigger(
        puzzle: PuzzleDefinition,
        verb: string,
        subject: string | null,
        target: string | null,
    ): boolean {
        if (puzzle.trigger.verb !== verb) return false;
        if (puzzle.trigger.subject && puzzle.trigger.subject !== subject) return false;
        if (puzzle.trigger.target && puzzle.trigger.target !== target) return false;
        // Skip already-solved one-time puzzles
        if (puzzle.once && this.state.isFlagSet(`puzzle-solved:${puzzle.id}`)) return false;
        return true;
    }
}
```

### Auto-Save Integration in SceneTransition
```typescript
// systems/SceneTransition.ts -- ADD auto-save call before transitions
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';

// In transitionToRoom(), before starting the new scene:
static transitionToRoom(scene, roomId, spawnPoint, transition, duration): void {
    // Auto-save current state before leaving the room
    const state = GameState.getInstance();
    state.getData().currentRoom = roomId; // Update to new room before saving
    SaveManager.autoSave(state);

    // ... existing transition code ...
}
```

### CommandDispatcher Integration with PuzzleEngine
```typescript
// systems/CommandDispatcher.ts -- EXTEND dispatch() method
// Before returning static responses, check puzzles and death triggers:

dispatch(action: GameAction, roomData: RoomData): DispatchResult {
    // 1. Check death triggers first (specific dangerous actions)
    if (roomData.deathTriggers) {
        const deathResult = this.puzzleEngine.tryPuzzle(
            action.verb, action.subject, action.target, roomData.deathTriggers
        );
        if (deathResult?.matched) {
            return { response: deathResult.response, handled: true };
        }
    }

    // 2. Check puzzle interactions
    if (roomData.puzzles) {
        const puzzleResult = this.puzzleEngine.tryPuzzle(
            action.verb, action.subject, action.target, roomData.puzzles
        );
        if (puzzleResult?.matched) {
            return { response: puzzleResult.response, handled: true };
        }
    }

    // 3. Fall through to existing verb handlers
    switch (action.verb) {
        // ... existing handlers, now enhanced with inventory checks ...
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cookie-based game saves | localStorage JSON serialization | ~2015 | Larger storage, structured data, no server roundtrip |
| Hardcoded puzzle logic per game | Data-driven condition/action systems | ~2010 (AGS, Inform, TADS) | Content creators can add puzzles without code changes |
| Death = reload manual save | Auto-save on room transition + instant retry | ~2010 (KQ7, modern adventures) | Eliminates save-scumming frustration while keeping death as game mechanic |
| Canvas-rendered text UI | HTML overlay for text-heavy UI | ~2018 (Phaser 3 era) | Better accessibility, scrolling, formatting, input handling |
| Global mutable state scattered across objects | Centralized GameState singleton with serialization | Modern pattern | Clean save/load, predictable state, easy debugging |

**Deprecated/outdated:**
- Cookies for game saves: localStorage is strictly better for this use case.
- Phaser 2.x DataManager plugin: Phaser 3 has built-in Data Manager but plain localStorage is simpler for our needs.
- RexUI for simple panels: Adding the plugin for what HTML/CSS handles natively is unnecessary overhead.

## Open Questions

1. **Item icons/sprites: placeholder text or actual images?**
   - What we know: Phase 4 is features-before-content. Inventory items need some visual representation.
   - What's unclear: Whether to use text-only inventory (item names in a list) or placeholder colored squares/emoji as icons.
   - Recommendation: Start with text-only inventory (item names). This is consistent with the text adventure heritage and avoids blocking on art assets. Phase 8 (content production) can add item sprites.

2. **Should puzzles live in room JSONs or a separate puzzles.json?**
   - What we know: Room JSONs currently hold all room-specific data. Puzzles often span rooms (item from room A used in room B).
   - What's unclear: Whether cross-room puzzle data should be duplicated or centralized.
   - Recommendation: Room-specific puzzles (death triggers, item pickups, hotspot interactions) live in room JSON. Item combination recipes (which are room-independent) live in a global `puzzles.json` or `combinations.json`. The PuzzleEngine checks both.

3. **How should the "use" verb distinguish inventory-on-hotspot from hotspot-on-hotspot?**
   - What we know: "use key on door" implies key is in inventory, door is in room. "use lever" implies lever is a room hotspot.
   - What's unclear: How the NounResolver should prioritize inventory vs room context for the subject vs target of two-noun commands.
   - Recommendation: For "use X on Y": resolve X as inventory-first (you use things you HAVE), resolve Y as room-first (you use them ON things in the scene). For single-noun "use X": check room hotspots first, then inventory. This matches player mental model.

4. **MainMenuScene: Phaser-rendered or HTML overlay?**
   - What we know: The death screen uses Phaser overlay. The text input uses HTML. Consistency matters.
   - What's unclear: Whether the main menu should be a Phaser scene (consistent with death screen) or HTML (consistent with text UI).
   - Recommendation: Phaser scene. The main menu is a full-screen scene with no game underneath, making it a natural Phaser scene. It replaces the current `Preloader -> RoomScene` flow with `Preloader -> MainMenuScene -> RoomScene`.

## Sources

### Primary (HIGH confidence)
- Existing codebase: RoomScene.ts, CommandDispatcher.ts, TextParser.ts, NounResolver.ts, GameAction.ts, RoomData.ts -- established patterns and extension points
- [Phaser 3 Scenes documentation](https://docs.phaser.io/phaser/concepts/scenes) -- multi-scene overlay pattern, launch/pause/resume/stop APIs
- [Phaser 3 localStorage notes](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/localstorage/) -- save/load serialization approach
- [W3Schools Typewriter Effect](https://www.w3schools.com/howto/howto_js_typewriter.asp) -- verified JS typewriter pattern

### Secondary (MEDIUM confidence)
- [nicole.express: Designing Adventure Game API](https://nicole.express/2017/designing-adventure-game-api.html) -- verbs-as-functions, flag-based state, JSON room/dialogue structure
- [Slattstudio: Sierra Deaths Were Great](https://slattstudio.com/2021/02/09/sierra-deaths-were-great-and-how-to-make-them-greater/) -- auto-save on room entry, death as collectible, humorous death text
- [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html) -- state machine patterns for game objects
- [AGS Inventory documentation](https://ensadi.github.io/AGSBook/part1/chapter4/inventory.html) -- adventure game inventory system architecture
- [Giant Bomb: Unwinnable State](https://www.giantbomb.com/unwinnable-state/3015-7607/) -- dead man walking prevention philosophy

### Tertiary (LOW confidence)
- [TV Tropes: Unwinnable By Design / Sierra](https://tvtropes.org/pmwiki/pmwiki.php/UnwinnableByDesign/Sierra) -- historical context for unwinnable states in Sierra games (design reference, not technical)
- [GameDev.net: Death and Dead Ends](https://www.gamedev.net/forums/topic/654153-death-and-dead-ends-in-adventure-games/) -- community discussion on death system design philosophy

## Metadata

**Confidence breakdown:**
- GameState architecture: HIGH -- centralized state with JSON serialization is a well-proven pattern. localStorage is universally supported.
- Puzzle condition/action system: HIGH -- data-driven condition/action pairs are the standard approach for adventure game puzzles (AGS, Inform, TADS all use variants).
- Inventory system: HIGH -- straightforward state management + noun resolution extension. Extension points already exist in NounResolver.
- Death/respawn system: HIGH -- auto-save on room entry + overlay scene is well-documented Phaser 3 pattern.
- Typewriter effect: HIGH -- trivial JS implementation, well-documented everywhere.
- Save/load system: HIGH -- localStorage + JSON.stringify is the standard browser game approach.
- Main menu/UI scenes: HIGH -- Phaser 3 multi-scene support is mature and well-documented.
- Unwinnable state prevention: MEDIUM -- this is primarily a content/design discipline rather than an engine feature. The engine can enforce certain rules (never consume items on failed actions) but ultimately depends on puzzle design quality.

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, no fast-moving dependencies)
