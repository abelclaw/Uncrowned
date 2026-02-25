# Phase 11: Progressive Hints - Research

**Researched:** 2026-02-21
**Domain:** Context-aware hint system with tiered escalation, integrated into existing text parser and PuzzleEngine
**Confidence:** HIGH

## Summary

Phase 11 adds a progressive hint system that helps stuck players without breaking immersion. The existing architecture is remarkably well-suited for this: the `CommandDispatcher` already handles meta-commands (inventory, save, load) before puzzle evaluation, the `VerbTable` + `TextParser` handles verb synonym registration, `GameState.flags` can track hint state per puzzle, and `NarratorDisplay` provides the typewriter delivery mechanism. The only new data dependency is hint text authored into the room JSON files.

The core challenge is NOT the runtime system (which is straightforward) but the content authoring: 36 rooms contain approximately 44 unique hintable puzzles (after deduplicating alternate syntaxes and filtering auto-triggers/simple-takes). Each puzzle needs a 3-tier hint chain (vague, medium, explicit) written in the narrator's sardonic voice, totaling approximately 132 individual hint texts. Additionally, the system must determine the "most relevant" unsolved puzzle per room and track failed attempts for automatic escalation.

The GameState schema must be extended from v2 to v3 to add hint tracking data (per-puzzle hint tier reached, per-puzzle failed attempt count). This requires a new migration function following the established migration chain pattern (v1->v2 exists, add v2->v3).

**Primary recommendation:** Build the HintSystem class and "hint" command integration first (Plan 1), then author all 132 hint texts across 36 room JSONs (Plan 2). The system code is small and testable; the content authoring is the bulk of the work.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HINT-01 | Player can type "hint" command to receive context-appropriate puzzle hint | TextParser + VerbTable pattern for new verb registration documented; CommandDispatcher meta-command dispatch pattern documented; HintSystem class design with room-context puzzle relevance scoring |
| HINT-02 | Hints are tiered (3 levels: vague -> medium -> explicit) per puzzle | Per-puzzle `hints` array in PuzzleDefinition with 3 tiers; GameState tracks current tier per puzzle via `hintTiers` map; escalation on repeated "hint" commands |
| HINT-03 | Hint system tracks failed attempts and escalates hint specificity automatically | Failed attempt tracking via `failedAttempts` map in GameState; CommandDispatcher sets attempt flag on puzzle condition-failure; HintSystem reads attempt count to auto-escalate tier |
| HINT-04 | Narrator delivers hints in character (sardonic tone, not breaking immersion) | Existing NarratorDisplay typewriter delivery; hints authored as narrator-voice text in room JSONs; writing style guide extracted from existing death texts and room descriptions |
| HINT-05 | All puzzles across 36 rooms have authored hint chains | 44 unique hintable puzzles identified; 132 total hint texts needed (3 tiers each); organized by act/room in room JSON `puzzleHints` field |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.7.2 | All new code (HintSystem, types, migration) | Already in project; type-safe hint data structures |
| Vitest | ^4.0.18 | Unit tests for HintSystem, migration, hint selection | Already in project; established test patterns |

### Supporting (already in project, no new dependencies)
| Library | Version | Purpose | Role in Phase 11 |
|---------|---------|---------|-----------------|
| Phaser | ^3.90.0 | EventBus for hint command events | EventBus.emit/on pattern for command routing |
| GameState singleton | N/A | Hint tier tracking, failed attempt tracking | Extended with `hintTiers` and `failedAttempts` fields |
| NarratorDisplay | N/A | Typewriter hint delivery | Existing `.typewrite()` method for in-character delivery |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON hint data in room files | Separate hints.json per room | Keeping hints in room JSONs co-locates puzzle + hint, making authoring easier and validation simpler |
| GameState flag tracking | Separate HintState class | GameState already has migration infrastructure; adding fields is simpler than a new persistence layer |
| Static 3-tier hints | LLM-generated dynamic hints | Static hints are deterministic, testable, and work without Ollama; LLM hints would be inconsistent and unreliable |

**Installation:**
```bash
# No new npm dependencies required
# All changes use existing project stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/game/
  systems/
    HintSystem.ts          # NEW: hint selection, tier tracking, attempt monitoring
  systems/
    CommandDispatcher.ts   # MODIFIED: add 'hint' to meta-commands
  types/
    PuzzleData.ts          # MODIFIED: add hints field to PuzzleDefinition
  parser/
    VerbTable.ts           # MODIFIED: add 'hint' verb entry
  types/
    GameAction.ts          # MODIFIED: add 'hint' to Verb union
  state/
    GameStateTypes.ts      # MODIFIED: add hintTiers, failedAttempts; bump to v3
    migrations/
      v2-to-v3.ts          # NEW: migration adding hint tracking fields
      index.ts             # MODIFIED: register v2->v3 migration
  __tests__/
    HintSystem.test.ts     # NEW: unit tests

public/assets/data/rooms/
  *.json                   # MODIFIED: add puzzleHints field to each room
```

### Pattern 1: HintSystem as Stateful Service
**What:** A `HintSystem` class that reads room puzzle data, determines the most relevant unsolved puzzle, tracks hint tiers in GameState, and returns the appropriate hint text.
**When to use:** On every "hint" command from the player.
**Design:**
```typescript
// src/game/systems/HintSystem.ts

import { GameState } from '../state/GameState';
import type { RoomData } from '../types/RoomData';

export interface PuzzleHint {
    /** Which puzzle ID this hint is for */
    puzzleId: string;
    /** 3-tier hint texts: [vague, medium, explicit] */
    tiers: [string, string, string];
}

export class HintSystem {
    private state: GameState;

    constructor() {
        this.state = GameState.getInstance();
    }

    /**
     * Get the next appropriate hint for the current room.
     * Returns null if no unsolved puzzles remain in this room.
     */
    getHint(roomData: RoomData): string | null {
        // 1. Find all hintable puzzles in this room
        const puzzleHints = roomData.puzzleHints ?? [];
        if (puzzleHints.length === 0) return null;

        // 2. Filter to unsolved puzzles (not flagged as puzzle-solved:{id})
        const unsolved = puzzleHints.filter(
            h => !this.state.isFlagSet(`puzzle-solved:${h.puzzleId}`)
        );
        if (unsolved.length === 0) return null;

        // 3. Score by relevance (failed attempts > 0 ranks higher)
        const scored = unsolved.map(h => ({
            hint: h,
            attempts: this.getFailedAttempts(h.puzzleId),
        }));
        scored.sort((a, b) => b.attempts - a.attempts);

        // 4. Pick top candidate
        const best = scored[0].hint;

        // 5. Determine tier (auto-escalate based on failed attempts)
        const attempts = this.getFailedAttempts(best.puzzleId);
        const requestedTier = this.getHintTier(best.puzzleId);
        const autoTier = attempts >= 5 ? 2 : attempts >= 3 ? 1 : 0;
        const effectiveTier = Math.max(requestedTier, autoTier);
        const clampedTier = Math.min(effectiveTier, 2);

        // 6. Advance tier for next request
        this.setHintTier(best.puzzleId, Math.min(clampedTier + 1, 2));

        return best.tiers[clampedTier];
    }

    // ... GameState accessors for hintTiers and failedAttempts
}
```

### Pattern 2: Failed Attempt Tracking via CommandDispatcher
**What:** When a player attempts a puzzle action but conditions aren't met (e.g., "use key on door" without having the key), the CommandDispatcher increments a failed attempt counter for the most relevant puzzle.
**When to use:** On every puzzle-triggering command that fails its conditions.
**Design:**
```typescript
// In CommandDispatcher.dispatch(), after puzzle check:
if (roomData.puzzles && roomData.puzzles.length > 0) {
    const puzzleResult = this.puzzleEngine.tryPuzzle(
        action.verb, action.subject, action.target, roomData.puzzles,
    );
    if (puzzleResult?.matched) {
        return { response: puzzleResult.response, handled: true };
    }
    // NEW: If a puzzle trigger matched but conditions failed, track attempt
    const triggerMatch = this.findMatchingTrigger(action, roomData.puzzles);
    if (triggerMatch) {
        this.hintSystem.recordFailedAttempt(triggerMatch.id);
    }
}
```

### Pattern 3: Room JSON Hint Data Structure
**What:** Each room JSON gets a `puzzleHints` array co-located with puzzles and deaths.
**Structure:**
```json
{
    "puzzleHints": [
        {
            "puzzleId": "use-key-on-door",
            "tiers": [
                "The door looks like it's been locked for centuries. Doors have a traditional weakness, if only you could remember what it is...",
                "Something in this forest might open this door. Something small, metallic, and profoundly corroded.",
                "The rusty key from the old stump in the forest clearing. Use it on the door. I can't make it any clearer without doing it for you."
            ]
        }
    ]
}
```

### Pattern 4: "hint" as a Meta-Command Verb
**What:** Register "hint" alongside "inventory", "save", "load" as a meta-command that doesn't interact with room objects.
**Design:**
```typescript
// VerbTable.ts addition:
{
    canonical: 'hint',
    synonyms: ['hint', 'help', 'stuck', 'clue'],
    patterns: [
        /^(?:hint|help|stuck|clue)$/i,
        /^(?:give\s+me\s+a\s+)?(?:hint|help|clue)$/i,
        /^(?:i'?m?\s+)?stuck$/i,
        /^what\s+(?:do\s+i\s+do|should\s+i\s+do|now)$/i,
    ],
}

// CommandDispatcher.dispatch() addition in meta-command switch:
case 'hint':
    return this.handleHint(roomData);
```

### Anti-Patterns to Avoid
- **Per-puzzle hint state in flags:** Do NOT use `GameState.flags` for hint tiers -- flags are `boolean | string` and mixing numeric hint counters with game flags creates type confusion. Use dedicated `hintTiers: Record<string, number>` and `failedAttempts: Record<string, number>` fields.
- **Hint text in TypeScript code:** Do NOT embed hint text in source code. Keep all hint text in room JSON files for content authoring workflow consistency and so non-programmers could edit hints.
- **Global puzzle relevance:** Do NOT try to suggest hints for puzzles in OTHER rooms. The spec says "most relevant unsolved puzzle in the current room." Cross-room hints would be confusing and spoil exploration.
- **Counting ALL commands as failures:** Only count commands that match a puzzle trigger but fail conditions. Random unrelated commands should NOT increment failure counters.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verb synonym recognition | Custom string matching for "hint" | VerbTable pattern (existing) | Already handles synonyms, patterns, and regex matching for 12 verbs |
| Command dispatch routing | Ad-hoc if/else in RoomScene | CommandDispatcher meta-command (existing) | Established dispatch order ensures hints don't interfere with puzzles |
| Text delivery with typewriter | New UI component for hints | NarratorDisplay.typewrite() (existing) | Same delivery mechanism as all narrator text; maintains immersion |
| State persistence | Custom localStorage for hints | GameState + migration (existing) | Save/load already works; migration chain already established |
| Puzzle solved tracking | New tracking system | `puzzle-solved:{id}` flag (existing) | PuzzleEngine already sets these flags for `once: true` puzzles |

**Key insight:** The existing architecture was designed for extensibility. Adding a new verb, a new meta-command handler, and new GameState fields follows established patterns exactly. The hint system plugs into existing infrastructure at every point.

## Common Pitfalls

### Pitfall 1: Hint for Already-Solved Puzzles
**What goes wrong:** Player types "hint" and gets a hint for a puzzle they already solved, making the narrator look confused.
**Why it happens:** Not checking `puzzle-solved:{id}` flags before selecting hint candidate.
**How to avoid:** Always filter puzzleHints against solved flags before scoring. Use `this.state.isFlagSet('puzzle-solved:' + puzzleId)`.
**Warning signs:** Hint text references an action the player has already completed.

### Pitfall 2: Failed Attempts Counting Unrelated Actions
**What goes wrong:** Player types "look at rock" and it increments the failed attempt counter for a nearby puzzle, causing premature hint escalation.
**Why it happens:** Counting ALL unhandled commands as failures instead of specifically tracking puzzle-trigger mismatches.
**How to avoid:** Only increment failed attempts when a command MATCHES a puzzle trigger (same verb/subject/target) but FAILS the conditions check. Use PuzzleEngine's trigger matching logic.
**Warning signs:** Player gets explicit hints before trying the puzzle.

### Pitfall 3: "No Hint Available" for Complex Multi-Step Puzzles
**What goes wrong:** Player is stuck on a multi-step puzzle (e.g., "repair boat" requires planks + rope + boat) and gets no hint because the individual "take-planks" puzzle is in a different room.
**Why it happens:** Hint system only looks at current room's puzzles.
**How to avoid:** Author hints for the "destination" puzzle that reference prerequisite items/actions in other rooms. E.g., the `repair-boat` hint in underground_river says "You need materials: sturdy planks and rope. The cavern library and balcony come to mind."
**Warning signs:** Player types "hint" and gets "No hints available" despite being stuck.

### Pitfall 4: Stale Hint Tiers After Game Load
**What goes wrong:** Player saves, loads a different save, and hint tiers from the previous session bleed through.
**Why it happens:** HintSystem reads from GameState, but if tiers aren't serialized/deserialized properly, they persist across loads.
**How to avoid:** Store hintTiers and failedAttempts IN GameState.data (not as HintSystem instance variables). The serialization/deserialization cycle naturally resets them.
**Warning signs:** Explicit hints appear immediately after loading a save.

### Pitfall 5: Narrator Voice Inconsistency in Hints
**What goes wrong:** Some hints sound helpful and earnest, breaking the sardonic narrator voice.
**Why it happens:** Content authoring fatigue -- writing 132 hints, the author drifts from the established voice.
**How to avoid:** Establish a hint writing guide with examples. Hints should be reluctant, condescending, and funny. Reference existing room descriptions and death texts for voice consistency. The narrator is annoyed at having to help.
**Warning signs:** Hint text reads like a walkthrough rather than sardonic commentary.

### Pitfall 6: GameState Migration Breaking Existing Saves
**What goes wrong:** v2 saves fail to load in the v3 client because the migration doesn't handle missing fields.
**Why it happens:** Migration doesn't set defaults for new fields.
**How to avoid:** Follow the exact pattern of migrateV1toV2: explicitly set all new fields with sensible defaults (empty objects/arrays). Test migration with actual v2 save data.
**Warning signs:** "Cannot read property 'hintTiers' of undefined" at runtime.

## Code Examples

Verified patterns from existing codebase:

### Adding a New Verb to VerbTable
```typescript
// Source: existing VerbTable.ts pattern (lines 32-134)
// Add after the 'load' entry:
{
    canonical: 'hint',
    synonyms: ['hint', 'help', 'stuck', 'clue'],
    patterns: [
        /^(?:hint|help|stuck|clue)$/i,
        /^(?:give\s+me\s+a\s+)?(?:hint|help|clue)$/i,
        /^(?:i'?m?\s+)?stuck$/i,
        /^what\s+(?:do\s+i\s+do|should\s+i\s+do|now)$/i,
    ],
},
```

### Adding a Meta-Command to CommandDispatcher
```typescript
// Source: existing CommandDispatcher.dispatch() pattern (lines 49-59)
// Add 'hint' case to the meta-command switch:
case 'hint':
    return this.handleHint(roomData);
```

### GameState Migration v2 to v3
```typescript
// Source: existing v1-to-v2.ts pattern
export function migrateV2toV3(data: Record<string, unknown>): Record<string, unknown> {
    return {
        ...data,
        version: 3,
        hintTiers: {},      // Per-puzzle hint tier reached: { puzzleId: number }
        failedAttempts: {},  // Per-puzzle failed attempt count: { puzzleId: number }
    };
}
```

### Room JSON Hint Structure
```json
// Source: existing room JSON structure (e.g., forest_clearing.json)
// Add alongside "puzzles", "deaths", "dynamicDescriptions":
"puzzleHints": [
    {
        "puzzleId": "take-rusty-key",
        "tiers": [
            "Something glints in the old stump. Nature hides its treasures in the most obvious places, for those willing to look.",
            "The crack in the stump isn't just decorative. Something metallic is wedged in there. Your hands DO work, you know.",
            "Take the rusty key from the stump. It's right there. I'm pointing at it. Metaphorically. I'm a narrator, I don't have hands."
        ]
    }
]
```

### Hint Selection with Relevance Scoring
```typescript
// Pattern: score unsolved puzzles by failed attempts for relevance
const unsolved = puzzleHints.filter(
    h => !this.state.isFlagSet(`puzzle-solved:${h.puzzleId}`)
);

// Puzzles the player has actively failed rank higher
const scored = unsolved.map(h => ({
    hint: h,
    score: this.getFailedAttempts(h.puzzleId) * 10 + (h.priority ?? 0),
}));
scored.sort((a, b) => b.score - a.score);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Universal Hint Books (printed guides) | In-game progressive hints | ~2010+ (Telltale, modern LucasArts remasters) | Players never leave the game; hints feel like part of the experience |
| Binary hint (on/off) | Tiered escalation (vague -> medium -> explicit) | ~2015+ (Thimbleweed Park, 2017) | Players get the minimum help needed; preserves puzzle satisfaction |
| Separate hint menu/UI | Narrator-delivered hints in main text area | Best practice for immersive adventure games | No UI mode switch; hint feels like the narrator talking, not a walkthrough |
| Manual hint request only | Auto-escalation on repeated failures | Modern UX standard | Respects player time without requiring them to admit they're stuck |

**Key reference:** Ron Gilbert's Thimbleweed Park (2017) implemented a tiered hint system where hints escalated from vague to explicit. The in-game "hint line phone" was diegetic (the player called a phone for hints). This project's sardonic narrator serves the same diegetic role -- the narrator reluctantly gives hints rather than breaking the fourth wall with a help menu.

## Content Authoring Scale

### Puzzle Inventory (from codebase analysis)

| Category | Count | Notes |
|----------|-------|-------|
| Total puzzle entries in room JSONs | 108 | Includes alternate syntaxes |
| Simple take actions | 31 | Don't need hints (item is visible, just "take" it) |
| Alternate syntax duplicates | 18 | Same puzzle, different command wording |
| Auto-triggers / ending choices | 5 | Not player-solvable puzzles |
| **Unique hintable puzzles** | **~44** | Distinct puzzles needing hint chains |

### Act Distribution

| Act | Rooms | Hintable Puzzles | Hint Texts (3 tiers) |
|-----|-------|------------------|---------------------|
| 1a (Tutorial) | 7 | ~8 | ~24 |
| 1b (Royal Mess) | 7 | ~12 | ~36 |
| 2 (Screaming Caverns) | 12 | ~14 | ~42 |
| 3 (Rite of Closure) | 10 | ~10 | ~30 |
| **Total** | **36** | **~44** | **~132** |

### Hint Writing Voice Guide

Based on analysis of existing narrator text in the codebase:

**Tone patterns (from existing room descriptions and death texts):**
- Reluctant helpfulness: "I suppose I should mention..."
- Condescending patience: "You know, most people figure this out without help."
- Self-aware narrator: "I'm the narrator. I see everything. I'm choosing to be vague."
- Escalating frustration: Tier 1 is coy, Tier 2 is exasperated, Tier 3 is bluntly explicit
- Never break character: Even the most explicit hint stays in narrator voice

**Example hint chain (forest_clearing: take-rusty-key):**
```
Tier 1 (vague): "Something catches the light in this clearing. The old stump
seems particularly smug about keeping secrets. Perhaps a closer look is in order."

Tier 2 (medium): "There's definitely something metallic wedged in the crack of
that stump. Your ancestors developed opposable thumbs specifically for moments
like this."

Tier 3 (explicit): "Take the rusty key from the stump. T-A-K-E. K-E-Y. I
cannot make this simpler without physically controlling your hands, which I
assure you I would if I could."
```

## Open Questions

1. **Should simple "take" puzzles get hints?**
   - What we know: 31 puzzles are straightforward "take X" where the item is visible in the room
   - What's unclear: Do players actually get stuck on these, or are they obvious?
   - Recommendation: Author basic hints for take puzzles only when the item is hidden or non-obvious (e.g., `take-vip-stamp` in a hidden drawer). Skip hints for items that are plainly visible and described in room text. This reduces authoring from ~44 to ~35-40 puzzles that truly need hints.

2. **How should "hint" interact with the LLM parser fallback?**
   - What we know: HybridParser tries regex first, then Ollama if regex fails. "hint" as a registered verb will always match regex.
   - What's unclear: Should "I need help with this puzzle" (natural language) also trigger hints via LLM?
   - Recommendation: Register "hint" in VerbTable with broad synonym patterns (hint, help, stuck, clue, "what do I do"). The regex path will catch most phrasings. LLM fallback naturally handles the rest since it maps to the `hint` verb.

3. **Should hints reference items/puzzles in other rooms?**
   - What we know: Current spec says "most relevant unsolved puzzle in the current room."
   - What's unclear: What if the player is in a room with NO unsolved puzzles but is still lost?
   - Recommendation: If no unsolved puzzles remain in the current room, show a fallback message: "Everything in this room seems to be in order. Perhaps another location holds what you seek." This nudges exploration without cross-room spoilers.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `CommandDispatcher.ts`, `PuzzleEngine.ts`, `VerbTable.ts`, `TextParser.ts`, `GameStateTypes.ts`, `GameState.ts`, migrations system
- Room JSON structure: 36 room files in `public/assets/data/rooms/`
- Puzzle dependency graph: `.planning/milestones/v1.0-phases/08-content-production/puzzle-dependency-graph.md`
- Story bible: `.planning/milestones/v1.0-phases/08-content-production/story-bible.md`

### Secondary (MEDIUM confidence)
- Thimbleweed Park hint system design (Ron Gilbert, 2017) -- well-documented tiered hint approach that influenced modern adventure games

### Tertiary (LOW confidence)
- None. This phase is primarily an integration and content authoring task using established codebase patterns. No external libraries or APIs are involved.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies; all changes use existing TypeScript + Vitest + Phaser EventBus
- Architecture: HIGH - every integration point (VerbTable, CommandDispatcher, GameState, NarratorDisplay) has been verified in the codebase
- Pitfalls: HIGH - identified from direct analysis of existing code patterns and data flow
- Content scale: HIGH - puzzle count verified by programmatic analysis of all 36 room JSONs

**Research date:** 2026-02-21
**Valid until:** Indefinite (this phase uses only project-internal patterns; no external dependencies to become stale)
