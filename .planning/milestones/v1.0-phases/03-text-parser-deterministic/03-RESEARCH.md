# Phase 3: Text Parser (Deterministic) - Research

**Researched:** 2026-02-20
**Domain:** Text input UI, keyword/regex command parsing, verb-noun resolution, command dispatch
**Confidence:** HIGH

## Summary

Phase 3 adds the text parser that defines this game as a "parser adventure" rather than a pure point-and-click. The scope is deliberately constrained: a deterministic keyword/regex parser that handles all standard adventure game verbs without any LLM dependency. This proves the game is fully playable before Phase 5 adds LLM enhancement.

The implementation breaks into three concerns: (1) a text input bar UI that is always visible during gameplay, (2) a parser that tokenizes input and extracts verb + subject + target, and (3) a command dispatch system that translates parsed commands into game actions executed against the current room state. All three concerns are well-understood patterns with no novel technical risk.

**Primary recommendation:** Use a plain HTML/CSS text input bar positioned below the canvas within the game container (not Phaser's `dom.createContainer`), a verb-synonym table with regex pattern matching for sentence structures, and an EventBus-driven command dispatch that resolves noun references against the current room's hotspots and exits. Extend the room JSON schema to include description text and verb-specific responses on hotspots.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PARSE-01 | Player can type natural language commands in a text input bar | HTML input element positioned below the game canvas, styled to match pixel art aesthetic, always visible during RoomScene. Enter key submits, command history with up/down arrows. See "Text Input Bar" section. |
| PARSE-02 | Keyword/regex fallback parser handles standard verbs (look, take, use, go, talk, open, push, pull) without LLM | Verb synonym table + regex pattern matching for VERB, VERB NOUN, VERB NOUN PREPOSITION NOUN structures. Fuzzy noun resolution against current room hotspots/exits/inventory. See "Parser Architecture" and "Verb Synonym Table" sections. |
| PARSE-07 | Game remains fully playable if Ollama is unavailable (graceful fallback) | This phase IS the fallback. The deterministic parser is the complete baseline. Phase 5's LLM parser will call through to this parser when Ollama is unavailable. No Ollama dependency in this phase at all. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | ^3.90.0 | Game engine (already installed) | Canvas rendering, scene management, event system |
| TypeScript | ~5.7.2 | Type safety (already installed) | Strong typing for GameAction, verb tables, parsed results |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | No additional libraries needed. The parser is pure TypeScript regex + string matching. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom regex parser | compromise.js NLP library | Compromise adds 200KB+ for features we don't need. Regex handles the 8 standard verbs perfectly. LLM in Phase 5 handles ambiguity. |
| Plain HTML input | Phaser DOM element (`dom.createContainer`) | Phaser DOM elements cannot be layered between game objects, only work on main camera, and add complexity. Plain HTML gives full CSS control and cleaner separation. |
| Plain HTML input | RexUI InputText plugin | Extra dependency for what is fundamentally an HTML `<input>` element. Overkill. |

**Installation:**
```bash
# No new packages needed. Pure TypeScript implementation using existing Phaser 3 + TypeScript stack.
```

## Architecture Patterns

### Recommended Project Structure
```
src/game/
├── parser/                    # NEW: Text parser system
│   ├── TextParser.ts          # Main parser: tokenize -> match verb -> resolve nouns -> GameAction
│   ├── VerbTable.ts           # Verb definitions, synonyms, and sentence patterns
│   └── NounResolver.ts        # Fuzzy matching of player nouns against room objects
├── types/
│   ├── RoomData.ts            # EXTEND: Add description, lookText, verb responses to hotspots
│   └── GameAction.ts          # NEW: Typed GameAction interface
├── ui/
│   └── TextInputBar.ts        # NEW: HTML input bar management, command history
├── systems/
│   └── CommandDispatcher.ts   # NEW: Routes GameActions to appropriate handlers
├── scenes/
│   └── RoomScene.ts           # EXTEND: Wire up parser, display response text
└── EventBus.ts                # EXTEND: Add COMMAND_SUBMITTED, COMMAND_PARSED, NARRATOR_SAY events
```

### Pattern 1: Verb-Synonym Table with Pattern Matching

**What:** A static table maps each canonical verb to its synonyms and expected sentence patterns. The parser normalizes input against this table to extract the verb, then uses the pattern to extract subject and target nouns.

**When to use:** For every text command the player types.

**Example:**
```typescript
// Source: Standard adventure game parser pattern (AGS, Inform, TADS)
interface VerbDefinition {
    canonical: string;  // Internal verb name
    synonyms: string[]; // All words that map to this verb
    patterns: RegExp[];  // Sentence patterns (most specific first)
}

const VERB_TABLE: VerbDefinition[] = [
    {
        canonical: 'look',
        synonyms: ['look', 'examine', 'inspect', 'check', 'study', 'read', 'l', 'x'],
        patterns: [
            /^(?:look|examine|inspect|check|study|read|l|x)\s+(?:at\s+)?(.+)$/i,  // "look at stump" / "examine key"
            /^(?:look|l)$/i,  // bare "look" = look at room
        ],
    },
    {
        canonical: 'take',
        synonyms: ['take', 'get', 'grab', 'pick', 'collect', 'acquire'],
        patterns: [
            /^(?:take|get|grab|collect|acquire)\s+(.+)$/i,                // "take mushroom"
            /^pick\s+up\s+(.+)$/i,                                        // "pick up mushroom"
            /^pick\s+(.+)\s+up$/i,                                        // "pick mushroom up"
        ],
    },
    {
        canonical: 'use',
        synonyms: ['use', 'apply', 'combine'],
        patterns: [
            /^(?:use|apply)\s+(.+?)\s+(?:on|with)\s+(.+)$/i,             // "use key on door"
            /^(?:use|apply)\s+(.+)$/i,                                     // "use lever"
            /^(?:combine)\s+(.+?)\s+(?:and|with)\s+(.+)$/i,              // "combine rope and hook"
        ],
    },
    {
        canonical: 'go',
        synonyms: ['go', 'walk', 'move', 'enter', 'exit', 'leave', 'head'],
        patterns: [
            /^(?:go|walk|move|head)\s+(?:to\s+)?(.+)$/i,                  // "go north" / "walk to cave"
            /^(?:enter|exit|leave)\s+(.+)$/i,                              // "enter cave" / "leave forest"
            /^(?:enter|exit|leave)$/i,                                     // bare "exit" = leave current room
            /^(north|south|east|west|n|s|e|w|up|down|u|d)$/i,             // directional shortcuts
        ],
    },
    {
        canonical: 'talk',
        synonyms: ['talk', 'speak', 'say', 'ask', 'chat', 'greet', 'hello'],
        patterns: [
            /^(?:talk|speak|chat)\s+(?:to|with)\s+(.+)$/i,                // "talk to wizard"
            /^(?:ask)\s+(.+?)\s+(?:about)\s+(.+)$/i,                     // "ask wizard about sword"
            /^(?:ask)\s+(.+)$/i,                                           // "ask wizard"
            /^(?:say|greet|hello)\s+(.+)$/i,                              // "say hello" / "greet guard"
        ],
    },
    {
        canonical: 'open',
        synonyms: ['open', 'unlock', 'close', 'shut', 'lock'],
        patterns: [
            /^(?:open|unlock)\s+(.+?)\s+(?:with)\s+(.+)$/i,              // "open door with key"
            /^(?:open|unlock|close|shut|lock)\s+(.+)$/i,                  // "open chest"
        ],
    },
    {
        canonical: 'push',
        synonyms: ['push', 'press', 'shove'],
        patterns: [
            /^(?:push|press|shove)\s+(.+)$/i,                             // "push button"
        ],
    },
    {
        canonical: 'pull',
        synonyms: ['pull', 'yank', 'tug', 'drag'],
        patterns: [
            /^(?:pull|yank|tug|drag)\s+(.+)$/i,                           // "pull lever"
        ],
    },
];
```

### Pattern 2: GameAction as the Universal Command Interface

**What:** Every parsed command produces a typed `GameAction` object. This is the interface between the parser and the game systems. Both the deterministic parser (this phase) and the future LLM parser (Phase 5) produce the same `GameAction`. Game systems never know which parser produced the action.

**When to use:** Every command flows through this interface.

**Example:**
```typescript
// Source: Architecture research ARCHITECTURE.md
interface GameAction {
    verb: 'look' | 'take' | 'use' | 'go' | 'talk' | 'open' | 'push' | 'pull';
    subject: string | null;    // Resolved ID of the target (hotspot, exit, item)
    target: string | null;     // For two-noun commands: "use X on Y" -> Y is target
    rawInput: string;          // Original player input for debugging / narrator reference
}

interface ParseResult {
    success: boolean;
    action?: GameAction;
    error?: string;            // "I don't understand" reason for failed parses
}
```

### Pattern 3: Noun Resolution Against Room Context

**What:** After extracting raw noun strings from the parser, a NounResolver fuzzy-matches them against the current room's hotspots, exits, and (future) inventory items. This maps player-typed names like "old stump" or "stump" or "tree" to the hotspot ID `"old-stump"`.

**When to use:** Every command that includes a noun.

**Example:**
```typescript
// NounResolver.ts
interface ResolvedNoun {
    type: 'hotspot' | 'exit' | 'item' | 'direction';
    id: string;
    confidence: 'exact' | 'partial' | 'none';
}

function resolveNoun(
    rawNoun: string,
    hotspots: HotspotData[],
    exits: ExitData[],
    // inventory: InventoryItem[] -- added in Phase 4
): ResolvedNoun | null {
    const normalized = rawNoun.toLowerCase().trim();

    // 1. Exact match on hotspot ID
    for (const h of hotspots) {
        if (h.id === normalized) return { type: 'hotspot', id: h.id, confidence: 'exact' };
    }

    // 2. Match on hotspot name (case-insensitive)
    for (const h of hotspots) {
        if (h.name.toLowerCase() === normalized) return { type: 'hotspot', id: h.id, confidence: 'exact' };
    }

    // 3. Partial match: any word in the hotspot name
    for (const h of hotspots) {
        const words = h.name.toLowerCase().split(/\s+/);
        if (words.includes(normalized)) return { type: 'hotspot', id: h.id, confidence: 'partial' };
    }

    // 4. Directional exits
    const DIRECTIONS: Record<string, string> = {
        'north': 'north', 'n': 'north', 'south': 'south', 's': 'south',
        'east': 'east', 'e': 'east', 'west': 'west', 'w': 'west',
        'up': 'up', 'u': 'up', 'down': 'down', 'd': 'down',
    };
    if (normalized in DIRECTIONS) {
        return { type: 'direction', id: DIRECTIONS[normalized], confidence: 'exact' };
    }

    // 5. Exit match by target room name or ID
    for (const ex of exits) {
        if (ex.id.includes(normalized) || ex.targetRoom.includes(normalized)) {
            return { type: 'exit', id: ex.id, confidence: 'partial' };
        }
    }

    return null;
}
```

### Pattern 4: HTML Text Input Bar with EventBus Integration

**What:** A plain HTML `<input>` element positioned below or at the bottom of the game canvas area. It is always visible during gameplay. The Enter key submits the command, which is emitted on the EventBus. Up/down arrows cycle through command history.

**When to use:** Always visible during RoomScene.

**Example:**
```typescript
// ui/TextInputBar.ts
export class TextInputBar {
    private inputEl: HTMLInputElement;
    private responseEl: HTMLDivElement;
    private history: string[] = [];
    private historyIndex: number = -1;

    constructor(private container: HTMLElement) {
        // Create wrapper div for input bar + response area
        const wrapper = document.createElement('div');
        wrapper.id = 'text-parser-ui';

        // Response/narrator text area
        this.responseEl = document.createElement('div');
        this.responseEl.id = 'parser-response';
        wrapper.appendChild(this.responseEl);

        // Input bar
        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.id = 'parser-input';
        this.inputEl.placeholder = 'Type a command...';
        this.inputEl.autocomplete = 'off';
        this.inputEl.spellcheck = false;
        wrapper.appendChild(this.inputEl);

        container.appendChild(wrapper);

        // Key handlers
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.submit();
            } else if (e.key === 'ArrowUp') {
                this.navigateHistory(-1);
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                this.navigateHistory(1);
                e.preventDefault();
            }
        });
    }

    private submit(): void {
        const text = this.inputEl.value.trim();
        if (!text) return;
        this.history.push(text);
        this.historyIndex = this.history.length;
        this.inputEl.value = '';
        // Emit via EventBus (imported separately)
        EventBus.emit('command-submitted', text);
    }

    showResponse(text: string): void {
        this.responseEl.textContent = text;
    }
}
```

### Pattern 5: Command Dispatcher with Room Context

**What:** The CommandDispatcher receives a `GameAction` from the parser and executes it against the current room state. It handles "look" by returning room/hotspot descriptions, "go" by triggering scene transitions, "take" / "use" / "talk" / "open" / "push" / "pull" by invoking hotspot verb handlers. Unhandled verbs produce an in-character "I don't understand" response.

**When to use:** Every parsed command.

**Example:**
```typescript
// systems/CommandDispatcher.ts
export class CommandDispatcher {
    dispatch(action: GameAction, roomData: RoomData): string {
        switch (action.verb) {
            case 'look':
                if (!action.subject) return roomData.description ?? `You are in ${roomData.name}.`;
                const hotspot = roomData.hotspots.find(h => h.id === action.subject);
                if (hotspot) return hotspot.responses?.look ?? `You see ${hotspot.name}. Nothing remarkable.`;
                return `You don't see that here.`;
            case 'go':
                // Resolve exit and trigger transition via EventBus
                // ...
            case 'take':
            case 'use':
            case 'open':
            case 'push':
            case 'pull':
            case 'talk':
                // Look up verb-specific response from hotspot data
                // ...
            default:
                return `I don't understand "${action.rawInput}". Try something else.`;
        }
    }
}
```

### Anti-Patterns to Avoid

- **Drawing the text input on canvas:** HTML `<input>` gives free text selection, cursor, focus management, accessibility, keyboard handling, copy/paste. Canvas gives none of this. Never render the input bar on canvas.
- **Hardcoding responses in the parser:** The parser extracts structure (verb + nouns). The room data contains responses. Keep them strictly separate. The parser should have zero knowledge of game content.
- **Blocking game loop on parsing:** The deterministic parser is synchronous and fast (microseconds), but the architecture must support async for Phase 5's LLM. Design the EventBus flow as async from the start.
- **Coupling parser to specific room data:** The parser produces generic `GameAction` objects. It should work with any room. Noun resolution uses the room's hotspot/exit lists, but the parser itself has no room knowledge.
- **Overly strict matching:** Players will type "look at the old stump", "examine stump", "check out that tree stump thing". The parser must strip articles ("the", "a", "an", "that", "this") and handle partial noun matches. Be generous in parsing, strict in execution.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text input field | Canvas-drawn input box | HTML `<input>` element | Free cursor, focus, selection, accessibility, copy/paste, IME support |
| Natural language understanding | Full NLP pipeline | Simple regex + synonym table | Phase 5's LLM handles ambiguity. The deterministic parser only needs to handle structured commands. |
| Fuzzy string matching | Levenshtein distance library | Partial word matching against known hotspot names | The noun vocabulary is small (current room's objects). Simple `includes()` and word-splitting is sufficient. |
| Command history | Custom circular buffer | Simple array with index | The history list will never be large enough to need optimization. |

**Key insight:** The deterministic parser is deliberately simple. Its job is to handle commands that follow standard adventure game patterns ("verb noun", "verb noun preposition noun"). Phase 5's LLM handles everything else. Over-engineering the regex parser wastes effort that the LLM layer makes unnecessary.

## Common Pitfalls

### Pitfall 1: Text Input Stealing Keyboard Focus from Phaser
**What goes wrong:** When the text input is focused, Phaser's keyboard event listeners stop receiving events (arrow keys, WASD, etc.). When the canvas is focused, the text input loses focus and typed characters go nowhere.
**Why it happens:** Only one DOM element can have keyboard focus at a time. Phaser scenes may use keyboard input for debugging or shortcuts.
**How to avoid:** The text input should be the primary keyboard target during gameplay. When the player clicks the canvas (to click-to-move), do NOT steal focus from the input. Instead, handle pointer events on the canvas without requiring focus. Use `this.input.mouse.disableContextMenu()` and pointer events (not keyboard) for scene interaction. If Phaser keyboard shortcuts are needed, use a modifier key (Ctrl, etc.) or only activate them when the input is empty.
**Warning signs:** Typed characters appearing in the game world or Phaser console instead of the input bar. Arrow keys scrolling the page instead of navigating command history.

### Pitfall 2: Missing Room Data for Text Responses
**What goes wrong:** The parser correctly identifies "look at stump" but there is no description text in the room data to return. The game shows a generic "Nothing special" for everything.
**Why it happens:** The current `HotspotData` interface only has `id`, `name`, `zone`, and `interactionPoint`. There are no description fields or verb-specific response fields.
**How to avoid:** Extend `HotspotData` to include a `responses` map and `description` field. Extend `RoomData` to include a room-level `description`. Update all existing room JSON files with placeholder text. This is a prerequisite for the parser to produce meaningful output.
**Warning signs:** Every interaction returns the same generic text regardless of the object or verb used.

### Pitfall 3: Not Stripping Articles and Filler Words
**What goes wrong:** Player types "look at the old tree stump" but the parser fails because it tries to match "the old tree stump" as a noun, and the hotspot is named "Old Tree Stump" (without "the").
**Why it happens:** Players naturally use articles ("the", "a", "an") and filler words ("that", "this", "some") in commands. The parser needs to strip these before noun resolution.
**How to avoid:** Maintain a stop-word list: `['the', 'a', 'an', 'this', 'that', 'those', 'these', 'some', 'my']`. Remove them from the noun phrase before attempting to resolve. Keep them in `rawInput` for the narrator to reference.
**Warning signs:** Commands that work without articles ("look stump") but fail with them ("look at the stump").

### Pitfall 4: Scaling the UI with the Canvas
**What goes wrong:** The game canvas uses `Scale.FIT` to resize within the viewport. The text input bar, being a separate HTML element, does not scale with it. On small screens the input is huge relative to the game; on large screens it is tiny.
**Why it happens:** Phaser's Scale Manager only scales the canvas element. External HTML elements are not managed.
**How to avoid:** Two approaches: (1) Make the text input bar part of the game container div and use CSS to style it relative to the container size. (2) Listen to Phaser's `resize` event and dynamically adjust the input bar's font size and dimensions. Approach 1 is simpler: place the input bar inside `#game-container` and use percentage-based sizing or the same CSS transform that Phaser applies to the canvas.
**Warning signs:** Text input looks correct at one window size but breaks at others.

### Pitfall 5: "go" Command Conflicting with Click-to-Move
**What goes wrong:** Player types "go cave" while also clicking on the scene. The click-to-move system and the text command dispatch both try to move the player simultaneously, causing jittery movement or race conditions.
**Why it happens:** Two input systems (mouse click and text parser) both produce movement commands but are not coordinated.
**How to avoid:** Both click-to-move and text "go" commands should produce the same kind of movement instruction (walk player to target point, then trigger action). The text "go" command should cancel any active click-to-move path before starting its own navigation. Use the existing `player.walkTo()` method, which already calls `stopMovement()` before starting a new path.
**Warning signs:** Player character stutters between two destinations or moves to wrong location after typing "go".

### Pitfall 6: Input Bar Z-Index Below Canvas
**What goes wrong:** The text input bar is not visible or not clickable because the Phaser canvas sits on top of it in the stacking context.
**Why it happens:** Default DOM stacking order or Phaser's canvas CSS may cover the input area.
**How to avoid:** Explicitly set `z-index` on the input bar higher than the canvas. Or position the input bar outside/below the canvas area entirely (beneath the game viewport), avoiding overlap. The simplest approach: the game container is a flex column with the canvas on top and the input bar below, rather than overlaying.
**Warning signs:** Input bar renders but clicks are captured by the canvas instead.

## Code Examples

Verified patterns from the existing codebase and standard adventure game parser implementations:

### Extending HotspotData for Text Responses
```typescript
// types/RoomData.ts -- EXTEND existing interface
export interface HotspotData {
    id: string;
    name: string;
    zone: { x: number; y: number; width: number; height: number };
    interactionPoint: { x: number; y: number };
    // NEW: Verb-specific text responses
    responses?: {
        look?: string;
        take?: string;
        use?: string;
        talk?: string;
        open?: string;
        push?: string;
        pull?: string;
        default?: string;   // Fallback for unhandled verbs on this object
    };
}

export interface RoomData {
    id: string;
    name: string;
    description?: string;  // NEW: Room description for bare "look" command
    background: {
        layers: BackgroundLayer[];
        worldWidth: number;
    };
    walkableArea: Array<{ x: number; y: number }>;
    exits: ExitData[];
    hotspots: HotspotData[];
    playerSpawn: { x: number; y: number };
}
```

### Extending ExitData for Parser-Friendly Names
```typescript
// types/RoomData.ts -- EXTEND existing ExitData
export interface ExitData {
    id: string;
    zone: { x: number; y: number; width: number; height: number };
    targetRoom: string;
    spawnPoint: { x: number; y: number };
    transition: 'fade' | 'slide-left' | 'slide-right';
    // NEW: Direction labels for text parser
    direction?: string;     // "east", "north", etc. for "go east"
    label?: string;         // "cave", "village" for "go to cave"
}
```

### Stop-Word Removal
```typescript
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'this', 'that', 'those', 'these', 'some', 'my',
    'at', 'to', 'in', 'on', 'with', 'from', 'into', 'onto', 'of',
    'around', 'about', 'up', 'down', 'please', 'just', 'also',
]);

function stripStopWords(text: string): string {
    return text
        .split(/\s+/)
        .filter(word => !STOP_WORDS.has(word.toLowerCase()))
        .join(' ');
}
```

### EventBus Events for Parser System
```typescript
// Events emitted/consumed by the parser system
// 'command-submitted' -- TextInputBar -> Parser (raw string)
// 'command-parsed'    -- Parser -> CommandDispatcher (GameAction)
// 'command-response'  -- CommandDispatcher -> TextInputBar/ResponseDisplay (response text)
// 'go-command'        -- CommandDispatcher -> RoomScene (exit transition)
// 'narrator-say'      -- CommandDispatcher -> ResponseDisplay (narrator text)
```

### CSS for Text Input Bar (Pixel Art Aesthetic)
```css
#text-parser-ui {
    width: 100%;
    background: #1a1a2e;
    border-top: 2px solid #3a3a5e;
    font-family: monospace;
    box-sizing: border-box;
}

#parser-response {
    color: #c0c0d0;
    font-size: 14px;
    padding: 6px 12px;
    min-height: 24px;
    line-height: 1.4;
    white-space: pre-wrap;
    max-height: 60px;
    overflow-y: auto;
}

#parser-input {
    width: 100%;
    background: #0a0a1e;
    color: #e0e0ff;
    border: none;
    border-top: 1px solid #2a2a4e;
    padding: 8px 12px;
    font-family: monospace;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
}

#parser-input::placeholder {
    color: #4a4a6e;
}

#parser-input:focus {
    background: #0e0e24;
}
```

### Minimal Response Display (Narrator Text Area)
```typescript
// Simple text display above the input bar showing the game's response to commands.
// This is NOT the full narrator/typewriter system (Phase 4).
// It is a plain text area that shows the most recent command response.
// Phase 4 will replace this with a proper typewriter-effect DialogBox.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Strict verb-noun parser ("GET LAMP" only) | Synonym tables + fuzzy matching | ~2000s (Inform 7, TADS 3) | Players can use natural phrasing |
| Canvas-rendered UI | HTML/CSS overlay UI | ~2018 (Phaser 3 design guidance) | Better accessibility, text rendering, input handling |
| Global game state object | EventBus-driven dispatch | ~2015 (modern game architecture) | Decoupled systems, easier testing |

**Deprecated/outdated:**
- Phaser 3's `dom.createContainer` approach is functional but the Phaser community generally recommends plain HTML overlay for complex UI (text input, forms) due to scaling and layering limitations.

## Open Questions

1. **Layout approach: input below canvas vs overlaid on canvas**
   - What we know: Both approaches work. Below-canvas avoids z-index issues and scaling complications. Overlaid matches the "always visible during gameplay" requirement more literally (input is part of the game viewport).
   - What's unclear: Which looks better at 960x540 with the FIT scale mode. If the input is below the canvas, it reduces the visible game area. If overlaid, it covers part of the scene.
   - Recommendation: Start with the input bar below the canvas (flex column layout: canvas on top, input bar below). This is simpler and avoids all z-index/scaling issues. The game viewport becomes the canvas (960x540 game area) plus the input bar below it. Both fit within the Scale Manager's parent container.

2. **Response text display: where does it go?**
   - What we know: The player needs feedback for every command. Phase 4 adds a full narrator/dialog box with typewriter effect. Phase 3 needs something simpler.
   - What's unclear: Should Phase 3 build a minimal response area that Phase 4 replaces, or should it build the response area in a way Phase 4 extends?
   - Recommendation: Build a minimal response text area above the input bar (part of the `#text-parser-ui` wrapper). It shows plain text, no typewriter effect. Phase 4 can replace or enhance this with the full narrator system. Keep it simple and replaceable.

3. **How should "go" work with current exit data?**
   - What we know: Exits have `id` (e.g., "to-cave"), `targetRoom` (e.g., "cave_entrance"), but no direction labels. The player might type "go east", "go to cave", or "go right".
   - What's unclear: How to map player text to exits without direction metadata.
   - Recommendation: Add `direction` and `label` fields to `ExitData`. Update existing room JSONs. "go east" matches `direction: "east"`. "go cave" matches `label: "cave"`. "go right" tries to match the exit on the right side of the screen based on zone position.

## Sources

### Primary (HIGH confidence)
- Phaser 3 official docs: DOM Element concept page - DOM element creation, positioning, event handling, limitations
- Phaser 3 codebase: existing RoomScene.ts, Player.ts, EventBus.ts, RoomData.ts - established patterns for this project
- ARCHITECTURE.md (.planning/research/) - Pre-researched architecture patterns, GameAction interface, parser flow diagram

### Secondary (MEDIUM confidence)
- [AGS Text Parser Manual](https://adventuregamestudio.github.io/ags-manual/TextParser.html) - Word-number synonym system, parsing algorithm
- [Interactive Fiction Community Forum: Standard Verbs](https://intfiction.org/t/standard-verbs/62739) - Comprehensive verb list with community consensus on essentials
- [TextAdventureGameInputParser (GitHub)](https://github.com/Anders-H/TextAdventureGameInputParser) - Verb-object-preposition-target pattern matching, ambiguity handling
- [HTPATAIC Ch.13: The Parser](https://helderman.github.io/htpataic/htpataic13.html) - Pattern-based command matching implementation
- [Phaser 3 DOM Element docs](https://docs.phaser.io/phaser/concepts/gameobjects/dom-element) - DOM integration configuration and limitations
- [Phaser 3 Rex Notes: DOM Element](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/domelement/) - Comprehensive DOM element reference with config examples

### Tertiary (LOW confidence)
- [Adventure Game Sentence Parsing with Compromise](https://killalldefects.com/2020/02/20/adventure-game-sentence-parsing-with-compromise/) - NLP library approach (rejected as overkill, but useful for understanding sentence structure)
- [Phaser forum: responsive HTML input overlay](https://www.html5gamedevs.com/topic/41072-phaser-3-responsive-html-input-overlay/) - Community approaches to HTML overlay positioning with Scale Manager

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed. Pure TypeScript with existing Phaser 3.
- Architecture (parser): HIGH - Verb-synonym-regex parsing is a 40+ year solved problem. AGS, Inform, TADS all use this approach.
- Architecture (UI): HIGH - HTML input overlay is well-documented Phaser 3 pattern.
- Architecture (room data extension): HIGH - Straightforward schema extension of existing JSON files.
- Pitfalls: HIGH - Focus management and scaling issues are well-documented in Phaser community.
- Noun resolution: MEDIUM - Fuzzy matching approach is sound but exact heuristics may need tuning during implementation.

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, no fast-moving dependencies)
