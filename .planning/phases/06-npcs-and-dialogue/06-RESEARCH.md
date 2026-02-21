# Phase 6: NPCs and Dialogue - Research

**Researched:** 2026-02-21
**Domain:** inkjs narrative scripting, NPC dialogue systems, conversation-based puzzles
**Confidence:** HIGH

## Summary

Phase 6 adds NPCs with authored personalities and branching dialogue powered by inkjs, Inkle's JavaScript port of the ink narrative scripting language. The existing codebase already has the infrastructure needed: `CommandDispatcher.handleTalk()` routes talk commands to hotspot responses, `GameState` tracks flags and inventory, `PuzzleEngine` evaluates condition/action pairs, and `NarratorDisplay` renders typewriter text. The primary work is building a `DialogueManager` that bridges inkjs Story instances with the game's existing systems, defining NPC data structures, creating ink scripts for NPC conversations, and extending the command pipeline to enter/exit dialogue mode.

The recommended architecture uses **one ink Story instance per NPC**, with each NPC's conversation authored as a separate `.ink` file compiled to JSON at build time. This keeps NPC dialogue state isolated (each NPC tracks their own conversation progress independently) and avoids the complexity of routing a single monolithic story to many characters. Ink's `EXTERNAL` functions and variable system bridge game state (inventory, flags, visited rooms) into dialogue conditions, while ink tags (`#speaker:name`, `#emotion:angry`) control UI presentation.

**Primary recommendation:** Use inkjs v2.3 with pre-compiled JSON story files loaded via Phaser's cache system, one Story instance per NPC, with `BindExternalFunction` bridging ink to GameState for condition checks and flag mutations.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NPC-01 | NPCs exist in scenes with authored knowledge and personalities | NPC data format in room JSON with personality/knowledge fields; per-NPC ink files define conversational knowledge |
| NPC-02 | Player can talk to NPCs via text commands | Extend CommandDispatcher.handleTalk() to enter DialogueManager mode instead of returning static text |
| NPC-03 | NPC dialogue supports branching conversation trees | inkjs Story with knots/stitches/choices provides full branching; choices displayed as numbered options in text UI |
| NPC-04 | NPCs provide information, hints, and advance the plot | ink variables + EXTERNAL functions bridge game flags; ink actions set-flag/add-item trigger game state changes |
| PUZ-03 | Conversation-based puzzles -- gather info, persuade, negotiate | ink conditional choices gated on game flags/inventory; persuasion modeled as ink variables tracking trust/rapport |
| PUZ-06 | Puzzles advance the story and connect to player goals | ink knots unlock based on game state flags; completing conversation puzzles sets flags that unblock other puzzles |
| NARR-06 | Narrator references past player actions and events | ink EXTERNAL functions query GameState flags/visitedRooms; narrator ink script uses conditional text based on history |
| NARR-07 | Narrative scripted with inkjs for complex branching dialogue and story state | inkjs v2.3 Story class with compiled JSON; Compiler available for runtime compilation if needed |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| inkjs | 2.3.0 | Ink narrative engine for JavaScript | Official JS port of Inkle's ink; zero dependencies; full TypeScript support via `inkjs/types`; used by 80 Days, Heaven's Vault |
| inkjs/types | 2.3.0 | TypeScript type definitions | First-class TS support: `import { Story } from 'inkjs/types'` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-ink | latest | Compile .ink files at build time | Optional: enables `import story from './npc.ink'` with HMR; skip if pre-compiled JSON is simpler |
| Inky (desktop app) | latest | Visual ink editor with preview | Authoring .ink files; exports compiled JSON; not a runtime dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pre-compiled JSON | vite-plugin-ink | Plugin adds HMR and cleaner imports but is a smaller community project; JSON loading via Phaser cache is proven and simpler |
| Pre-compiled JSON | Runtime Compiler (`inkjs/full`) | Heavier bundle (~200KB vs ~80KB), no build step needed, but compile time adds latency on first load |
| Per-NPC Story instances | Single global Story | Single story is simpler for tightly coupled narratives but harder to manage isolated NPC conversation state |

**Installation:**
```bash
npm install inkjs
```

**Optional (for build-time compilation):**
```bash
npm install --save-dev vite-plugin-ink
```

## Architecture Patterns

### Recommended Project Structure
```
src/game/
  dialogue/
    DialogueManager.ts     # Bridge between inkjs and game systems
    DialogueUI.ts          # Choice display and conversation UI mode
    NpcRegistry.ts         # Loads and indexes NPC definitions
  types/
    NpcData.ts             # NPC type definitions
public/assets/data/
  npcs/
    npcs.json              # NPC registry (personality, knowledge, room placement)
  dialogue/
    old_man.ink.json        # Pre-compiled ink JSON per NPC
    merchant.ink.json
    guard.ink.json
    narrator.ink.json       # Narrator personality/history-aware commentary
  ink-source/               # Source .ink files (not served, for authoring only)
    old_man.ink
    merchant.ink
    guard.ink
    narrator.ink
```

### Pattern 1: One Story Instance Per NPC
**What:** Each NPC gets its own inkjs `Story` instance created from a dedicated compiled ink JSON file. Story state is saved/restored per NPC as part of GameState serialization.
**When to use:** Always -- this is the recommended pattern for multi-NPC games.
**Example:**
```typescript
// Source: inkjs README + RunningYourInk.md
import { Story } from 'inkjs/types';

export class DialogueManager {
  private activeStory: Story | null = null;
  private npcStoryStates: Map<string, string> = new Map(); // npcId -> saved JSON state

  startConversation(npcId: string, compiledJson: string): void {
    // Create fresh Story from compiled ink JSON
    const story = new Story(compiledJson);

    // Restore saved state if NPC was talked to before
    const savedState = this.npcStoryStates.get(npcId);
    if (savedState) {
      story.state.LoadJson(savedState);
    }

    // Bind external functions so ink can query game state
    story.BindExternalFunction('hasItem', (itemId: string) => {
      return GameState.getInstance().hasItem(itemId);
    });
    story.BindExternalFunction('hasFlag', (flagName: string) => {
      return GameState.getInstance().isFlagSet(flagName);
    });
    story.BindExternalFunction('setFlag', (flagName: string) => {
      GameState.getInstance().setFlag(flagName, true);
    });

    this.activeStory = story;
  }

  // Get next line of dialogue + any tags
  continue(): { text: string; tags: string[] } | null {
    if (!this.activeStory || !this.activeStory.canContinue) return null;
    const text = this.activeStory.Continue() ?? '';
    const tags = this.activeStory.currentTags ?? [];
    return { text: text.trim(), tags };
  }

  // Get current choices for the player
  getChoices(): Array<{ index: number; text: string }> {
    if (!this.activeStory) return [];
    return this.activeStory.currentChoices.map((choice, i) => ({
      index: i,
      text: choice.text,
    }));
  }

  // Player selects a choice
  choose(index: number): void {
    this.activeStory?.ChooseChoiceIndex(index);
  }

  endConversation(npcId: string): void {
    if (this.activeStory) {
      // Save story state for next conversation
      this.npcStoryStates.set(npcId, this.activeStory.state.toJson());
      this.activeStory = null;
    }
  }
}
```

### Pattern 2: Ink-GameState Bridge via EXTERNAL Functions
**What:** Ink scripts declare `EXTERNAL` functions that the game binds to GameState queries. This lets ink conditionally branch based on inventory, flags, and visited rooms without duplicating state.
**When to use:** Always -- this is how ink communicates with the game engine.
**Example ink file:**
```ink
// Source: ink WritingWithInk.md + RunningYourInk.md
EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)

=== greeting ===
{hasFlag("met_old_man"):
    Ah, you again. Back for more wisdom, are we?
- else:
    Well, well. A visitor. Haven't had one of those since the last one died.
    ~ setFlag("met_old_man")
}

What brings you to my hovel?
+ [Ask about the cave] -> cave_info
+ [Ask about the key] -> key_info
+ {hasItem("mysterious-bottle")} [Show the bottle] -> bottle_reaction
+ [Leave] -> farewell

=== cave_info ===
The cave? Oh, you mean the Screaming Caverns.
They don't actually scream. That's just the wind.
...Probably.
~ setFlag("knows_cave_name")
-> greeting

=== key_info ===
{hasItem("rusty-key"):
    That old thing? It opens the chest in the cave. Or it did, before someone left it in a stump for a century.
    ~ setFlag("knows_key_purpose")
- else:
    Key? What key? I don't know anything about any key. *nervous whistling*
}
-> greeting

=== bottle_reaction ===
*The old man's eyes widen*
Where did you find THAT? That's... that's Grandmother's "medicine."
Don't drink it. Trust me.
~ setFlag("bottle_identified")
-> greeting

=== farewell ===
Come back anytime. Or don't. I'll be dead either way. #emotion:sad
-> END
```

### Pattern 3: Dialogue Mode in Command Pipeline
**What:** When the player talks to an NPC, the game enters "dialogue mode" where text input selects choices by number instead of parsing adventure commands. The UI shows available choices. Exiting dialogue mode returns to normal command parsing.
**When to use:** During active NPC conversations.
**Example:**
```typescript
// In RoomScene or CommandDispatcher
private inDialogue: boolean = false;
private dialogueManager: DialogueManager;

// When "talk to old_man" is dispatched:
private handleTalkToNpc(npcId: string): void {
  const npcData = this.npcRegistry.get(npcId);
  const compiledJson = this.cache.json.get(`dialogue-${npcId}`);

  this.dialogueManager.startConversation(npcId, compiledJson);
  this.inDialogue = true;

  // Show first dialogue line + choices
  this.advanceDialogue(npcId);
}

private advanceDialogue(npcId: string): void {
  // Gather all continuous text lines
  const lines: string[] = [];
  let tags: string[] = [];

  while (true) {
    const result = this.dialogueManager.continue();
    if (!result) break;
    lines.push(result.text);
    tags = result.tags; // last line's tags apply
  }

  const choices = this.dialogueManager.getChoices();

  if (lines.length > 0) {
    this.narratorDisplay.typewrite(lines.join('\n'));
  }

  if (choices.length > 0) {
    // Show choices in the response area
    const choiceText = choices.map(c => `  ${c.index + 1}. ${c.text}`).join('\n');
    // Append after current text
    this.showChoices(choiceText);
  } else {
    // No more choices = conversation ended
    this.dialogueManager.endConversation(npcId);
    this.inDialogue = false;
  }
}

// During dialogue mode, numeric input selects a choice
private handleDialogueInput(input: string, npcId: string): void {
  const choiceNum = parseInt(input.trim(), 10);
  if (isNaN(choiceNum) || choiceNum < 1) {
    this.narratorDisplay.showInstant('Pick a number.');
    return;
  }
  this.dialogueManager.choose(choiceNum - 1);
  this.advanceDialogue(npcId);
}
```

### Pattern 4: NPC Data in Room JSON
**What:** NPCs are defined in a separate registry and referenced by room JSON, similar to how hotspots work. Each NPC has personality metadata, a dialogue file reference, and scene placement.
**When to use:** For placing NPCs in rooms with visual and interaction data.
**Example NPC type:**
```typescript
export interface NpcDefinition {
  id: string;
  name: string;
  /** Personality summary for narrator/LLM context */
  personality: string;
  /** What this NPC knows about (for LLM-assisted parsing context) */
  knowledge: string[];
  /** ink dialogue JSON file key (loaded in Preloader) */
  dialogueKey: string;
  /** Default greeting when no ink state exists */
  defaultGreeting: string;
}

export interface RoomNpcData {
  id: string;              // References NpcDefinition.id
  /** Where the NPC sprite appears */
  position: { x: number; y: number };
  /** Where the player walks to before talking */
  interactionPoint: { x: number; y: number };
  /** Clickable zone for mouse interaction */
  zone: { x: number; y: number; width: number; height: number };
  /** Conditions for NPC presence (e.g., only after a flag is set) */
  conditions?: Array<{ type: string; flag?: string; [key: string]: unknown }>;
}
```

**Room JSON extension:**
```json
{
  "id": "village_path",
  "npcs": [
    {
      "id": "old_man",
      "position": { "x": 500, "y": 400 },
      "interactionPoint": { "x": 470, "y": 430 },
      "zone": { "x": 480, "y": 370, "width": 40, "height": 80 }
    }
  ]
}
```

### Pattern 5: Narrator History Awareness via Ink
**What:** The narrator's commentary is driven by an ink script that queries game history through EXTERNAL functions. This enables NARR-06 (narrator references past actions).
**When to use:** For narrator responses that should be aware of player history.
**Example:**
```ink
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()
EXTERNAL hasFlag(flagName)

=== narrator_look_room ===
{visitedRoom("cave_entrance") && visitedRoom("village_path"):
    You've been around, haven't you? The cave, the village... quite the adventurer.
- visitedRoom("cave_entrance"):
    Back from the cave, I see. Still alive. Color me mildly surprised.
- else:
    You haven't been anywhere yet. How... unadventurous.
}

{getDeathCount() > 3:
    You do have a remarkable talent for dying, I'll give you that.
}
-> END
```

### Anti-Patterns to Avoid
- **Single monolithic ink file for all NPCs:** Makes state management nightmarish; one NPC's conversation progress can corrupt another's. Use one Story per NPC.
- **Duplicating game state in ink variables:** Don't mirror inventory/flags in ink VAR declarations. Use EXTERNAL functions to query GameState directly. Single source of truth.
- **Parsing dialogue choices with the adventure text parser:** During dialogue mode, input should be simple number selection, not full NLP parsing. Don't route "1" through HybridParser.
- **Blocking the game loop during dialogue:** Keep dialogue async-friendly. The Story.Continue() call is synchronous and fast, but UI updates should use the existing typewriter/event patterns.
- **Hardcoding NPC responses in CommandDispatcher:** The current `handleTalk` returns static hotspot response text. For NPCs with ink dialogue, it must delegate to DialogueManager instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Branching dialogue trees | Custom tree data structure + evaluator | inkjs Story | Ink handles choice tracking, visit counts, conditional content, variable scoping, and state serialization; a custom solution would be a poor reimplementation |
| Dialogue state persistence | Manual JSON serialization of conversation progress | `story.state.toJson()` / `story.state.LoadJson()` | Ink's built-in state serialization captures callstack, variables, visit counts, and choice history |
| Conditional dialogue content | Flag-checking logic in TypeScript | Ink conditionals (`{flag: text}`) + EXTERNAL functions | Ink's conditional syntax is purpose-built for this; keeps logic in authored content, not code |
| Choice presentation/tracking | Custom choice tracking with used/unused states | Ink's `*` (once-only) and `+` (sticky) choices | Ink automatically tracks which choices have been used; `*` choices disappear after selection |
| NPC visit counting | Manual counter in GameState flags | Ink's `TURNS_SINCE(-> knot)` and visit counting | Ink automatically tracks how many times each knot has been visited |

**Key insight:** Ink was designed specifically for the dialogue branching and state tracking problem. Its internal state machine handles edge cases (choice exhaustion, visit counting, conditional gating) that would take hundreds of lines to hand-roll correctly.

## Common Pitfalls

### Pitfall 1: Story Instance Reuse Without State Reset
**What goes wrong:** Creating one Story instance and reusing it across conversations without saving/restoring state. The NPC "remembers" wrong things or skips content.
**Why it happens:** Developers treat Story like a stateless query engine instead of a stateful machine.
**How to avoid:** Always call `story.state.toJson()` when ending a conversation and `story.state.LoadJson()` when resuming. Create a fresh Story from the compiled JSON if starting fresh.
**Warning signs:** NPC says "you again" on first meeting, or choices that should appear are missing.

### Pitfall 2: EXTERNAL Function Binding After Continue()
**What goes wrong:** Calling `story.Continue()` before binding all EXTERNAL functions causes a runtime error.
**Why it happens:** EXTERNAL functions must be bound before the story tries to call them.
**How to avoid:** Always bind ALL external functions immediately after creating the Story instance and before any `Continue()` call.
**Warning signs:** "Missing function binding" or "undefined function" errors in console.

### Pitfall 3: Not Draining canContinue Before Reading Choices
**What goes wrong:** Reading `currentChoices` while `canContinue` is still true. Choices aren't populated until all continuous text is consumed.
**Why it happens:** Ink requires you to call `Continue()` until `canContinue` is false before choices become available.
**How to avoid:** Always loop `while (story.canContinue) { story.Continue(); }` before accessing `currentChoices`.
**Warning signs:** Empty choices array when choices should exist; choices appearing one step late.

### Pitfall 4: Dialogue Mode Input Collision
**What goes wrong:** During dialogue mode, the text parser interprets "1" or "2" as adventure commands instead of choice selections.
**Why it happens:** The command pipeline doesn't know it's in dialogue mode.
**How to avoid:** Set a `inDialogue` flag that short-circuits the parser. During dialogue, route raw input directly to choice selection.
**Warning signs:** Typing "1" triggers "I don't understand" instead of selecting choice 1.

### Pitfall 5: ink State Not Included in Save/Load
**What goes wrong:** Player saves game, loads it, and all NPC conversations reset to the beginning.
**Why it happens:** The ink story states are stored in DialogueManager memory but not serialized into GameState.
**How to avoid:** Extend `GameStateData` with a `dialogueStates: Record<string, string>` field. Serialize all NPC story states when saving, restore when loading.
**Warning signs:** NPCs repeat introductions after loading a save.

### Pitfall 6: Large ink JSON Bundle Size
**What goes wrong:** Loading all NPC dialogue JSON files at startup causes slow initial load.
**Why it happens:** Compiled ink JSON can be 20-100KB per NPC; many NPCs add up.
**How to avoid:** Load dialogue JSON lazily per-room (only load dialogue files for NPCs in the current room). Use Phaser's dynamic asset loading or fetch on demand.
**Warning signs:** Preloader takes noticeably longer after adding NPC dialogue files.

## Code Examples

### Loading inkjs Story from Compiled JSON (Browser/Vite)
```typescript
// Source: inkjs README, RunningYourInk.md
import { Story } from 'inkjs/types';

// In Preloader scene, load compiled ink JSON as a Phaser JSON asset:
this.load.json('dialogue-old_man', 'assets/data/dialogue/old_man.ink.json');

// In RoomScene or DialogueManager, create Story from cached JSON:
const jsonData = this.cache.json.get('dialogue-old_man');
const story = new Story(JSON.stringify(jsonData));
// Note: Story constructor expects a string, not a parsed object.
// If Phaser auto-parses JSON, re-stringify it.
```

### Complete Dialogue Loop
```typescript
// Source: RunningYourInk.md adapted for browser
function runDialogueStep(story: Story): {
  lines: string[];
  choices: Array<{ index: number; text: string }>;
  ended: boolean;
  tags: string[];
} {
  const lines: string[] = [];
  let tags: string[] = [];

  // Drain all continuous text
  while (story.canContinue) {
    const line = story.Continue();
    if (line) lines.push(line.trim());
    tags = story.currentTags ?? [];
  }

  // Check for choices
  const choices = story.currentChoices.map((c, i) => ({
    index: i,
    text: c.text,
  }));

  const ended = !story.canContinue && choices.length === 0;

  return { lines, choices, ended, tags };
}
```

### Binding External Functions
```typescript
// Source: RunningYourInk.md
function bindGameFunctions(story: Story, state: GameState): void {
  // Query functions (ink calls these, expects return value)
  story.BindExternalFunction('hasItem', (itemId: string) => {
    return state.hasItem(itemId);
  });

  story.BindExternalFunction('hasFlag', (flagName: string) => {
    return state.isFlagSet(flagName);
  });

  story.BindExternalFunction('visitedRoom', (roomId: string) => {
    return state.getData().visitedRooms.includes(roomId);
  });

  story.BindExternalFunction('getDeathCount', () => {
    return state.getData().deathCount;
  });

  // Mutation functions (ink calls these for side effects)
  story.BindExternalFunction('setFlag', (flagName: string) => {
    state.setFlag(flagName, true);
  });

  story.BindExternalFunction('addItem', (itemId: string) => {
    state.addItem(itemId);
  });

  story.BindExternalFunction('removeItem', (itemId: string) => {
    state.removeItem(itemId);
  });
}
```

### Parsing Tags for UI Control
```typescript
// Source: RunningYourInk.md tags documentation
// Tags follow format: #key:value
function parseTags(tags: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const tag of tags) {
    const colonIdx = tag.indexOf(':');
    if (colonIdx > 0) {
      const key = tag.substring(0, colonIdx).trim();
      const value = tag.substring(colonIdx + 1).trim();
      parsed[key] = value;
    } else {
      // Bare tag (no value)
      parsed[tag.trim()] = 'true';
    }
  }
  return parsed;
}

// Usage in dialogue display:
const { lines, tags } = runDialogueStep(story);
const parsed = parseTags(tags);
if (parsed.speaker) {
  // Show speaker name above dialogue
}
if (parsed.emotion) {
  // Update NPC sprite expression
}
```

### Extending GameStateData for Dialogue Persistence
```typescript
// Source: Existing GameStateTypes.ts pattern
export interface GameStateData {
  currentRoom: string;
  inventory: string[];
  flags: Record<string, boolean | string>;
  visitedRooms: string[];
  removedItems: Record<string, string[]>;
  playTimeMs: number;
  deathCount: number;
  // NEW: Per-NPC ink story state JSON strings
  dialogueStates: Record<string, string>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom dialogue tree JSON | inkjs with authored .ink scripts | Adopted for this project | Dramatic reduction in engine code; dialogue logic lives in content files |
| Static hotspot talk responses | Dynamic ink-driven conversations | Phase 6 | NPCs go from one-line responses to full branching conversations |
| Flags-only narrator | ink-scripted narrator with history queries | Phase 6 | Narrator can reference specific past events via EXTERNAL functions |
| inklecate CLI for compilation | inkjs Compiler class or vite-plugin-ink | inkjs 2.1+ | Can compile .ink at build time or runtime without external binary |

**Deprecated/outdated:**
- inkjs v1.x: Used different import paths; v2.x is current with TypeScript support via `inkjs/types`
- `require('inkjs')` style imports: Use ES module imports `import { Story } from 'inkjs/types'`

## Open Questions

1. **vite-plugin-ink vs pre-compiled JSON**
   - What we know: vite-plugin-ink provides HMR and cleaner imports; pre-compiled JSON via Inky/inklecate is more proven and has zero extra dependencies
   - What's unclear: vite-plugin-ink's stability and maintenance status (smaller community project)
   - Recommendation: Start with pre-compiled JSON loaded via Phaser cache (proven, simple). Upgrade to vite-plugin-ink later if authoring workflow demands it.

2. **Dialogue choice UI design**
   - What we know: Text adventure tradition uses numbered choices; the game already has a text input bar
   - What's unclear: Whether choices should be clickable buttons, typed numbers, or both
   - Recommendation: Start with typed numbers (consistent with text parser UI). The NarratorDisplay area shows choices as numbered list; player types the number. Can add click support later.

3. **NPC sprite rendering**
   - What we know: Room JSON has hotspots with zones; NPCs need visual presence
   - What's unclear: Whether NPCs are static sprites or animated; art pipeline not yet defined
   - Recommendation: Treat NPCs as static sprites (like hotspots) for Phase 6. Phase 8 content production handles final art. Use placeholder sprites for now.

4. **ObserveVariable reliability in inkjs**
   - What we know: There's a reported issue (#329 on y-lohse/inkjs) about ObserveVariable not working
   - What's unclear: Whether this is fixed in v2.3 or remains broken
   - Recommendation: Don't rely on ObserveVariable. Use EXTERNAL functions for ink-to-game communication and poll ink variables when needed after Continue() calls.

## Sources

### Primary (HIGH confidence)
- [inkjs README (y-lohse/inkjs)](https://github.com/y-lohse/inkjs) - Version 2.3.0, TypeScript imports, Story API, external functions, variable access
- [ink WritingWithInk.md](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) - Knots, stitches, choices, variables, EXTERNAL, tags, conditionals, tunnels
- [ink RunningYourInk.md](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md) - Continue loop, BindExternalFunction, ObserveVariable, state save/load, tags API, error handling

### Secondary (MEDIUM confidence)
- [vite-plugin-ink](https://github.com/floriancargoet/vite-plugin-ink) - Vite plugin for .ink file compilation and HMR
- [inkjs TypeScript+Webpack docs](https://github.com/y-lohse/inkjs/blob/master/docs/working-with-typescript-and-webpack.md) - TypeScript declarations, Compiler class usage
- [inkle ink-unity-integration issue #26](https://github.com/inkle/ink-unity-integration/issues/26) - Jon Ingold's recommendation on per-NPC ink architecture
- [inkjs ObserveVariable issue #329](https://github.com/y-lohse/inkjs/issues/329) - Known issue with variable observers

### Tertiary (LOW confidence)
- [Echodog Games: Using Ink for Conversations](https://www.echodoggames.com/blog/2019/09/19/using-ink-for-conversations/) - Community patterns for NPC ink conversations (content could not be fetched)
- [Dialogue Trees: Creating Branching Narratives](https://www.designthegame.com/learning/tutorial/dialogue-trees-creating-branching-narratives-games) - General dialogue architecture patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - inkjs is the documented requirement; well-maintained, TypeScript-supported, extensively documented
- Architecture: HIGH - Per-NPC Story instance pattern is well-established and recommended by ink's creator; maps cleanly to existing GameState/PuzzleEngine patterns
- Pitfalls: HIGH - Derived from official documentation (binding order, Continue loop, state serialization) and known GitHub issues
- Integration with existing code: HIGH - Examined all relevant source files; CommandDispatcher.handleTalk, GameState, PuzzleEngine, NarratorDisplay all have clear extension points

**Research date:** 2026-02-21
**Valid until:** 2026-04-21 (inkjs is stable; ink spec rarely changes)
