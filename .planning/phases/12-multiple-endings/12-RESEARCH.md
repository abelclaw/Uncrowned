# Phase 12: Multiple Endings - Research

**Researched:** 2026-02-21
**Domain:** Narrative branching via accumulated flags, EndingScene UI, MetaGameState endings tracking, room/puzzle JSON authoring
**Confidence:** HIGH

## Summary

Phase 12 adds 3-4 distinct endings to the game, determined by flags accumulated across the entire playthrough, evaluated at the Act 3 climax moment (the `perform-rite` and `perform-rite-crystal` puzzles in `throne_room_act3`). The core infrastructure for this phase already exists: the PuzzleEngine evaluates flag conditions from room JSON data, MetaGameState already has `recordEnding(endingId)` and `getEndingsDiscovered()` methods, and GameState tracks all flags and inventory. The main new work is: (1) a new `trigger-ending` action type in PuzzleEngine, (2) an `EndingScene` Phaser scene (analogous to DeathScene, but longer-form with credits), (3) an `endings-registry.json` static data file, (4) re-authoring the throne_room_act3 perform-rite puzzles to evaluate ending conditions instead of just setting `game-complete`, and (5) adding ending-influence flags to key decision points across rooms.

The architecture follows the same pattern as the Death Gallery (Phase 10): a static registry JSON provides all display data, a Phaser scene renders it, MetaGameState persists discoveries, and a new EventBus event bridges PuzzleEngine to the scene layer. No new npm dependencies are needed. The entire phase uses existing Phaser 3 rendering, TypeScript, and the established pattern of EventBus-mediated scene transitions.

The four endings are determined by the combination of `clerk_remembers` vs `clerk_outwitted` (how the Clerk was handled), `throne_accepted` vs `throne_declined` (Pip's choice after the curse breaks), and potentially `clock-fixed` (whether Pip took time to help the kingdom before the climax). These flags naturally emerge from existing gameplay choices and the story already supports them thematically.

**Primary recommendation:** Add a `trigger-ending` action type to PuzzleEngine, build EndingScene using the DeathScene pattern, author 3-4 endings in endings-registry.json, then re-author the perform-rite puzzles to route through ending evaluation rather than a bare `game-complete` flag.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENDS-01 | Game has 3-4 distinct endings determined by accumulated player choices and puzzle completion | Four endings designed (see Architecture section): Redemption Ending, Bureaucratic Ending, Wanderer Ending, Hero's Crown Ending. Each maps to a specific combination of flags already in the game's flag registry. The existing flag system (68 flags across all acts) contains all the decision points needed. |
| ENDS-02 | Ending conditions evaluated via existing PuzzleEngine flag/condition system at Act 3 climax | PuzzleEngine.evaluateConditions() already handles `flag-set`, `flag-not-set`, `has-item`, etc. The perform-rite puzzles in throne_room_act3 set `game-complete`. These must be modified to emit `trigger-ending` with an endingId instead. PuzzleEngine needs a new `trigger-ending` action type (one-line addition to executeAction switch). |
| ENDS-03 | EndingScene displays ending-specific narrator text, epilogue, and credits | EndingScene follows DeathScene pattern: full-screen scene, dark background, title, narrator epilogue text, credits roll, then "Play Again" and "Main Menu" buttons. Data loaded from endings-registry.json (preloaded in Preloader). No new Phaser APIs needed. |
| ENDS-04 | Discovered endings tracked in MetaGameState for replay awareness | MetaGameState.recordEnding(endingId) and getEndingsDiscovered() already implemented and tested. The EndingScene calls recordEnding() on create(), checks isNew to show "NEW ENDING" badge. Endings gallery accessible from MainMenuScene (conditional on discoveries > 0). |
| ENDS-05 | Key decision points throughout game have ending-influence flags authored in room/puzzle JSONs | The Clerk confrontation (dungeon.json), Clerk ally path (clerk_remembers vs clerk_outwitted), throne decision (throne_room_act3.json accept/decline puzzles), clock repair (clock_tower.json clock-fixed), and mirror truth reveal (mirror_hall.json) are the key decision points. Puzzles for these already exist; some need `ending-influence` metadata to make the choice visible to the player. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.90.0 | EndingScene rendering, tweens, text, scene transitions | Already locked in; all UI is Phaser scenes |
| MetaGameState | (existing) | Cross-playthrough endings persistence | Already has recordEnding/getEndingsDiscovered; same pattern as death gallery |
| PuzzleEngine | (existing) | Ending condition evaluation and trigger | Add one action type; no structural changes needed |
| TypeScript | ~5.7.2 | EndingScene, type definitions, registry types | Already in project; all new code is TypeScript |

### Supporting (already in project)
| Library | Version | Purpose | Role in Phase 12 |
|---------|---------|---------|-----------------|
| EventBus | (existing) | Bridge PuzzleEngine action to EndingScene launch | New `trigger-ending` event, same pattern as `trigger-death` |
| Vitest | ^4.0.18 | Unit tests for ending condition logic | Test ending condition evaluation, registry validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flag-based ending determination | Separate EndingEngine class | Overkill for 3-4 endings; PuzzleEngine conditions are sufficient and already proven |
| endings-registry.json | Inline ending text in room JSON | Endings span the whole game, not a single room; a separate registry is the right scope |
| Full credits scene | Simple text scroll | Simple typewriter text with credits attribution is consistent with the game's monospace aesthetic; a scroll animation is optional polish |
| 4 distinct endings | 2 endings | 4 endings is achievable with the existing flag set, gives meaningful replayability, and creates a 2x2 matrix that's easy to communicate |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
public/assets/data/
  endings-registry.json          # NEW: Master list of 3-4 endings with display data

src/game/
  scenes/
    EndingScene.ts               # NEW: Full-screen ending scene (analogous to DeathScene)
  systems/
    PuzzleEngine.ts              # MODIFIED: add trigger-ending action type
  types/
    EndingRegistryData.ts        # NEW: TypeScript types for endings-registry.json
  scenes/
    RoomScene.ts                 # MODIFIED: listen for trigger-ending EventBus event
    MainMenuScene.ts             # MODIFIED: add Endings Gallery link (if endings discovered)
  main.ts                        # MODIFIED: register EndingScene
  scenes/Preloader.ts            # MODIFIED: load endings-registry.json

public/assets/data/rooms/
  throne_room_act3.json          # MODIFIED: perform-rite puzzles emit trigger-ending not game-complete
  dungeon.json                   # MODIFIED: clerk path flags; add ending-influence metadata
  mirror_hall.json               # MODIFIED: add ending-influence metadata to mirror puzzle
  clock_tower.json               # MODIFIED: add ending-influence metadata to clock repair
```

### The Four Endings

The 2x2 flag matrix produces four thematically distinct endings:

| Ending ID | Clerk Path | Throne Choice | Description |
|-----------|-----------|---------------|-------------|
| `ending-redemption` | `clerk_remembers` (memory crystal) | `throne_declined` | The Clerk remembers himself, redeems, Pip walks away. Pip saves the kingdom then takes the road. The Clerk files the last form as Marlowe again. |
| `ending-bureaucratic` | `clerk_outwitted` (contract clauses) | `throne_declined` | Pip outmaneuvers bureaucracy with bureaucracy. Kingdom saved by procedure. Pip walks away. The Clerk files the closure form under duress. |
| `ending-wanderer-king` | `clerk_remembers` | `throne_accepted` | Pip unexpectedly rules. The Clerk-as-Marlowe serves a king who came for soup and stayed for paperwork. The warmest ending. |
| `ending-reluctant-ruler` | `clerk_outwitted` | `throne_accepted` | Pip rules a kingdom they saved through technicality, administrated by a Clerk who cooperated only under procedural obligation. The most absurdist ending. |

**Note:** If `clock-fixed` is true in any ending, the epilogue references that the kingdom's clock now runs on time -- a detail line that rewards thorough players without blocking any ending.

**Fallback ending:** If the rite is somehow performed without either clerk flag being set (should not happen in normal play, but defensively handled), treat as `ending-bureaucratic`.

### Pattern 1: trigger-ending Action Type (PuzzleEngine Extension)
**What:** A new action type that emits an EventBus event with the endingId. Analogous to `trigger-death`.
**When to use:** In the perform-rite puzzles after the curse is broken.

```typescript
// In PuzzleEngine.ts executeAction() switch -- add ONE case:
case 'trigger-ending':
    EventBus.emit('trigger-ending', action.endingId);
    return null;

// PuzzleAction type extension (PuzzleData.ts):
| { type: 'trigger-ending'; endingId: string }
```

### Pattern 2: Ending Condition Evaluation in Puzzle JSON
**What:** The perform-rite puzzles in throne_room_act3.json are restructured as a conditional chain that determines the ending ID before triggering it.
**When to use:** At the moment the curse breaks.

The existing approach sets `game-complete` in perform-rite. The new approach replaces `game-complete` with a `trigger-ending` action. However, because PuzzleEngine uses first-match-wins ordering, and the perform-rite puzzle already consumes the items and breaks the curse, the ending determination must happen in the SAME puzzle or via a follow-up.

**Recommended approach:** Keep perform-rite as a single puzzle that sets the curse-broken flag, then add FOUR new ending-determination puzzles that fire immediately after (triggered by the `curse-broken` flag being set, via a post-rite puzzle sequence evaluated by a follow-up "use rite-circle" or via EventBus). The cleanest approach is to have the perform-rite puzzle emit a generic `curse-broken` event, and a new `determine-ending` puzzle series checks flag combinations:

```json
// In throne_room_act3.json puzzles array (AFTER perform-rite):
{
    "id": "ending-redemption",
    "trigger": { "verb": "use", "subject": "rite-circle" },
    "conditions": [
        { "type": "flag-set", "flag": "curse-broken" },
        { "type": "flag-set", "flag": "clerk_remembers" },
        { "type": "flag-not-set", "flag": "ending-triggered" }
    ],
    "actions": [
        { "type": "set-flag", "flag": "ending-triggered" },
        { "type": "trigger-ending", "endingId": "ending-redemption" }
    ],
    "once": true
}
```

However this approach requires the player to type another command after the rite text appears. A cleaner alternative is to evaluate the ending WITHIN the perform-rite action sequence itself, using a new action type: `evaluate-ending`, which reads the GameState flags directly and calls the appropriate ending.

**Cleanest approach:** Add an `evaluate-ending` action type to PuzzleEngine that internally checks the flag matrix and emits `trigger-ending` with the correct ID. This keeps the perform-rite puzzle self-contained:

```typescript
// In PuzzleEngine.ts executeAction():
case 'evaluate-ending': {
    const endingId = this.determineEnding();
    EventBus.emit('trigger-ending', endingId);
    return null;
}

private determineEnding(): string {
    const remembers = this.state.isFlagSet('clerk_remembers');
    const accepted = this.state.isFlagSet('throne_accepted');
    if (remembers && accepted) return 'ending-wanderer-king';
    if (remembers && !accepted) return 'ending-redemption';
    if (!remembers && accepted) return 'ending-reluctant-ruler';
    return 'ending-bureaucratic'; // clerk_outwitted or fallback
}
```

**Tradeoff:** `evaluate-ending` is a PuzzleEngine method that contains story logic. This is a mild violation of the "no logic in engine" principle, but acceptable given the small scope (4 endings, 2 flags). Alternative: pass the conditions as a lookup table in the action JSON.

**Recommended for planners:** Use the `evaluate-ending` action approach with the flag matrix hardcoded in PuzzleEngine. Keep it simple; this is not a generic system, it's 4 endings.

### Pattern 3: EndingScene (Full-Screen Scene, Analogous to DeathScene)
**What:** A full-screen Phaser scene launched when the ending triggers.
**When to use:** Launched from RoomScene's `trigger-ending` handler.

```typescript
export interface EndingSceneData {
    endingId: string;
    isNewEnding: boolean;      // true if first discovery
    discoveredCount: number;   // from MetaGameState
    totalEndings: number;      // 4
}

export class EndingScene extends Phaser.Scene {
    constructor() {
        super('EndingScene');
    }

    create(data: EndingSceneData): void {
        // Record ending in MetaGameState
        // Load ending data from cache ('endings-registry')
        // Render: dark background, title, badge if new, epilogue text, credits, buttons
        // Buttons: "Play Again" (reset + start RoomScene at forest_clearing)
        //          "Main Menu" (scene.start('MainMenuScene'))
    }
}
```

**Key difference from DeathScene:** EndingScene does NOT use `scene.pause()` + `scene.launch()` as an overlay. It uses `scene.start()` to fully replace RoomScene. The game is over; there is no "resume" to RoomScene. RoomScene is stopped, EndingScene is started.

```typescript
// In RoomScene.ts: add trigger-ending handler (analogous to trigger-death):
this.triggerEndingHandler = (endingId: string) => {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const meta = MetaGameState.getInstance();
    const isNewEnding = meta.recordEnding(endingId);
    const discoveredCount = meta.getEndingsDiscovered().length;

    // Stop RoomScene and start EndingScene (not an overlay -- game is over)
    this.textInputBar.hide();
    this.inventoryPanel.hide();
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('EndingScene', {
            endingId,
            isNewEnding,
            discoveredCount,
            totalEndings: 4,
        } as EndingSceneData);
    });
};
EventBus.on('trigger-ending', this.triggerEndingHandler);
```

### Pattern 4: endings-registry.json (Static Data)
**What:** A JSON file with display data for all endings, loaded at preload time.
**When to use:** EndingScene reads this from Phaser cache via `this.cache.json.get('endings-registry')`.

```json
{
    "version": 1,
    "totalEndings": 4,
    "endings": [
        {
            "id": "ending-redemption",
            "title": "The Tinker's Farewell",
            "subtitle": "The Clerk Remembers / Pip Walks Away",
            "epilogueText": "Marlowe the wizard -- for that is who he was, before four centuries of paperwork buried the memory -- filed the last closure form with hands that finally trembled. Not from age. From feeling. The Kingdom of Erelhain de-petrified in a wave of golden light, stone cracking away from trees, from fountains, from people who blinked in confusion at the afternoon sun. Pip watched from the castle gate, pack on back. When the Ghost King offered the throne, Pip had said: 'I came for directions and a warm meal. I got directions. Martha's soup will do for the meal.' The Ghost King had not argued. He had, perhaps, expected this. 'The road,' he said instead, 'goes east.' Pip went east. The Kingdom of Erelhain rebuilt. And somewhere in the Royal Archive, filed under 'P' for 'Pip,' is a document certifying one traveling tinker as the Uncrowned Sovereign who saved a kingdom by accident, declined a throne on purpose, and asked only for lunch. It is, the Clerk-who-was-Marlowe noted, the most heroic paperwork he has ever filed.",
            "galleryHint": "Remember who the Clerk really is, then choose the road over the crown."
        },
        {
            "id": "ending-bureaucratic",
            "title": "Filed Under 'Closed'",
            "subtitle": "The Clerk Was Outwitted / Pip Walks Away",
            "epilogueText": "The Clerk filed his protest in triplicate. This was procedurally valid. His cooperation with the Rite of Administrative Closure was, he noted for the record, undertaken under duress of his own regulatory framework, and he wished this documented. Pip witnessed his signature. The kingdom de-petrified. The Clerk processed the outcome with the mechanical efficiency of a man who has been ambushed by his own rules and intends to metabolize the experience through paperwork. When the throne was offered, Pip declined. 'I have places to be.' The Clerk stamped their exit permit without being asked. It was the most passive-aggressive act of gratitude in the kingdom's history, and Pip received it in the spirit it was given. The road east. The kingdom behind. The Clerk at his desk, processing the closure of a four-hundred-year-old curse. He wrote 'RESOLVED -- PROCEDURALLY CORRECT' across the top of the file. This was, he noted, the most technically accurate thing he had written in four centuries.",
            "galleryHint": "Win the argument with paperwork, then walk away from the crown."
        },
        {
            "id": "ending-wanderer-king",
            "title": "The Accidental Monarch",
            "subtitle": "The Clerk Remembers / Pip Accepts the Throne",
            "epilogueText": "Nobody was more surprised than Pip. Marlowe -- who had been the Clerk, and before that a wizard, and before that presumably a person with a name and opinions about parking -- served as chief administrator to a monarch who had arrived looking for directions three days ago. The Ghost King departed at peace, his duty complete. Martha made soup. The Petrified Guard de-petrified and immediately asked for back pay. The kingdom, having been governed by bureaucratic inertia for four centuries, barely noticed the change in management. Pip's first royal decree was handwritten on a napkin. It said, verbatim: 'Everything's probably fine. Ask Marlowe if in doubt.' Marlowe framed it. It was, he said, the most efficient executive summary he had received since before the curse. The kingdom rebuilt. Pip ruled. Not through prophecy. Not through destiny. Through the simple fact of being the only person in the room who wasn't a ghost, a bureaucrat, or petrified. Leadership, like paperwork, begins with showing up.",
            "galleryHint": "Help the Clerk remember who he was, then stay to rule what you saved."
        },
        {
            "id": "ending-reluctant-ruler",
            "title": "The Procedurally Correct King",
            "subtitle": "The Clerk Was Outwitted / Pip Accepts the Throne",
            "epilogueText": "The Clerk processed the coronation paperwork under the same duress he had processed everything else: thoroughly, correctly, and with visible distaste. Pip, now technically sovereign of a kingdom that had been saved by exploiting a clause in a four-century-old curse document, found this extremely funny. The Clerk did not. The Ghost King departed. Martha made soup. The kingdom rebuilt itself around a monarch who had read a legal document more carefully than anyone in four hundred years, and an administrator who had been outwitted by his own filing system. They did not, technically, like each other. They did, technically, run an effective kingdom. Pip signed documents. The Clerk stamped them. The bureaucracy continued, slightly improved. Somewhere in the Royal Archive, beneath a notation reading 'OUTCOME: PROCEDURALLY CORRECT,' is the record of how the Kingdom of Erelhain was saved by a tinker who found the loophole. The Clerk has read it fourteen times. He cannot find the error. This is perhaps the most terrifying thing that has ever happened to him.",
            "galleryHint": "Win on a technicality, then stay to enforce more technicalities from the throne."
        }
    ]
}
```

### Pattern 5: Ending-Influence Flags in Room/Puzzle JSONs (ENDS-05)
**What:** Key decision-point puzzles should have a JSON metadata field that signals to the player (via narrator text) that their choice matters for the ending.
**When to use:** Any puzzle where player choice sets a flag that directly influences ending selection.

The narrator text already handles this implicitly (the perform-rite sequence describes different outcomes based on Clerk path). The decision points that influence endings are:

| Room | Puzzle ID | Flag Set | Ending Influence |
|------|-----------|----------|-----------------|
| `dungeon` | `show-memory-crystal` | `clerk_remembers` | Affects all 4 endings |
| `dungeon` | `outwit-clerk` | `clerk_outwitted` | Affects all 4 endings |
| `throne_room_act3` | `accept-throne` | `throne_accepted` | Splits ending pair |
| `throne_room_act3` | `decline-throne` | `throne_declined` | Splits ending pair |
| `clock_tower` | `repair-clock` | `clock-fixed` | Epilogue detail only |
| `mirror_hall` | `mirror-truth` | `mirror_truth_revealed` | Epilogue detail only |

The narrator text in the dungeon already foreshadows the Clerk confrontation's weight. No additional JSON metadata field is required for ENDS-05 -- the existing puzzle text adequately signals importance. However, adding an `endingInfluence: true` field to PuzzleDefinition is optional documentation for future authors.

### EndingScene Layout

```
+--------------------------------------------------+
|                                                    |
|      NEW ENDING DISCOVERED!    [badge, if new]    |
|                                                    |
|          "The Tinker's Farewell"    [title]       |
|      The Clerk Remembers / Pip Walks Away         |
|           [subtitle / condition summary]          |
|                                                    |
|  [Epilogue text, word-wrapped, typewriter effect, |
|   ~200 words, narrator voice, monospace font]     |
|                                                    |
|       ---- THE END ----                           |
|                                                    |
|    Uncrowned | A Text Adventure                   |
|    Written with sardonic affection for paperwork  |
|    [brief credits]                                |
|                                                    |
|    [ Play Again ]     [ Main Menu ]               |
|    Endings: X/4 discovered                        |
|                                                    |
+--------------------------------------------------+
```

### Anti-Patterns to Avoid
- **Using `scene.launch()` for EndingScene:** DeathScene uses launch (overlay) because the player returns to the same room. EndingScene should use `scene.start()` because the game is over and RoomScene state is irrelevant.
- **Evaluating ending outside the puzzle data flow:** Don't determine the ending in RoomScene or EndingScene. Determination belongs in PuzzleEngine (where all game logic lives), triggered by the perform-rite puzzle action.
- **Adding a separate "what is my ending" flag to GameState:** Use the existing flags (`clerk_remembers`, `clerk_outwitted`, `throne_accepted`, `throne_declined`). Don't create a redundant `ending-id` flag -- the ending is derived, not stored.
- **Blocking the rite with ending evaluation:** The rite should complete regardless of which ending fires. The ending is a consequence of the rite, not a gating condition on it.
- **Starting EndingScene before the rite narrator text is fully displayed:** The perform-rite narrator text is ~150 words and takes ~15 seconds to typewrite. The `trigger-ending` action must be deferred until after the typewriter effect completes, or the EndingScene should wait for player input ("Press any key to continue").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-playthrough endings persistence | Custom localStorage wrapper | MetaGameState.recordEnding() (already exists) | Already implemented, tested, and integrated |
| Ending condition logic | Complex rule engine | Simple 2-flag if/else in PuzzleEngine.determineEnding() | 4 endings is not a complex rules problem; YAGNI |
| Ending display data | Inline text in TypeScript | endings-registry.json in public/assets/data | Keeps content editable without code rebuild; consistent with death-registry pattern |
| Scene transition after rite text | Custom event sequencing | Phaser camera fadeOut callback + scene.start() | Established pattern in SceneTransition.ts |
| Credits scroll | ScrollPlugin or WebGL shader | Simple Phaser text with typewriter or instant display | The monospace aesthetic suits static credits; a scroll adds complexity without value |

**Key insight:** This phase is primarily a data-authoring and wiring task. The runtime machinery (flag evaluation, MetaGameState persistence, EventBus events, Phaser scene rendering) all has proven patterns from Phase 10. The main novelty is `evaluate-ending` action type in PuzzleEngine and the EndingScene itself.

## Common Pitfalls

### Pitfall 1: Throne Decision Timing vs. Ending Trigger
**What goes wrong:** The perform-rite puzzles currently fire when the player uses an item on the rite circle. The `throne_accepted` / `throne_declined` flags are set by separate puzzles AFTER curse-broken. If the ending triggers immediately on rite completion, neither throne flag is set yet.
**Why it happens:** The throne choice puzzles exist in the current throne_room_act3.json but they only fire AFTER `curse-broken` is already set. The ending trigger also fires when `curse-broken` is set.
**How to avoid:** Do NOT trigger the ending immediately in perform-rite. Instead, the perform-rite puzzle should set `curse-broken` and display the rite completion narrator text, but the ending is triggered by a SUBSEQUENT player action -- specifically, interacting with the cracked-throne after the curse breaks (the accept/decline choice). Modify `accept-throne` and `decline-throne` puzzles to call `evaluate-ending` at the END of their action lists.
**Warning signs:** All players get the same ending regardless of throne choice; `throne_accepted` never set when ending fires.

**Architecture fix:** Remove `game-complete` flag from perform-rite. Add `evaluate-ending` action to BOTH `accept-throne` and `decline-throne` puzzles. This ensures the ending fires AFTER the throne decision is made.

```json
// In accept-throne puzzle actions:
[
    { "type": "set-flag", "flag": "throne_accepted" },
    { "type": "narrator-say", "text": "..." },
    { "type": "evaluate-ending" }
]

// In decline-throne puzzle actions:
[
    { "type": "set-flag", "flag": "throne_declined" },
    { "type": "narrator-say", "text": "..." },
    { "type": "evaluate-ending" }
]
```

**Result:** The ending fires only after the throne choice, correctly capturing all 4 flag combinations.

### Pitfall 2: EndingScene Launched Before Typewriter Completes
**What goes wrong:** `evaluate-ending` is in the action list after `narrator-say`. PuzzleEngine executes actions synchronously. The `narrator-say` text starts typewriting, but `evaluate-ending` fires immediately after, starting EndingScene while the rite text is still playing.
**Why it happens:** PuzzleEngine.executeActions() is fully synchronous; NarratorDisplay.typewrite() is asynchronous.
**How to avoid:** Use a Phaser `time.delayedCall()` in RoomScene's `trigger-ending` handler to delay the scene transition by a fixed duration (e.g., 3000ms for the rite narrator text + 1500ms buffer). Or: have EndingScene wait for player input ("Press any key to see your ending") before rendering. The latter is better UX -- it respects reading speed.
**Warning signs:** EndingScene appears mid-typewriter, cutting off the rite completion narrative.

**Recommended fix:** EndingScene shows a "Press any key / Click to continue" prompt at the bottom. The fade-in begins immediately (black screen), but the ending content renders only when the player acknowledges. This gives the player control over when to leave the rite scene.

### Pitfall 3: MetaGameState.recordEnding() Not Called Before Scene Start
**What goes wrong:** If recordEnding() is called inside EndingScene.create(), and the player closes the browser immediately after the scene starts, the ending is never recorded.
**Why it happens:** Same as Phase 10 death recording -- scene lifecycle vs. persistence timing.
**How to avoid:** Call `MetaGameState.recordEnding(endingId)` in RoomScene's `trigger-ending` handler BEFORE starting EndingScene (same pattern as recordDeath() in triggerDeathHandler). Pass `isNewEnding` result to EndingScene via scene data.

### Pitfall 4: PuzzleEngine determineEnding() Uses Wrong Flag Priority
**What goes wrong:** `clerk_remembers` and `clerk_outwitted` are mutually exclusive in normal gameplay (both paths set `clerk_allied` but only one of the two flags is set). However, if a future debug/test scenario sets both, determineEnding() must have clear priority.
**Why it happens:** No explicit guard on simultaneous flag setting in current design.
**How to avoid:** PuzzleEngine.determineEnding() checks `clerk_remembers` first. If set, it takes priority over `clerk_outwitted`. Document this explicitly in code comments.

### Pitfall 5: Endings Gallery Link Not Conditional
**What goes wrong:** MainMenuScene always shows "Endings Gallery" even when no endings have been discovered, causing a confusing empty state.
**Why it happens:** Inconsistent with Death Gallery pattern (which gates on discoveries > 0).
**How to avoid:** Mirror the Death Gallery pattern: only show "Endings Gallery" in MainMenuScene when `MetaGameState.getEndingsDiscovered().length > 0`.

### Pitfall 6: perform-rite Puzzles' narrator-say Text Now Severed from Ending
**What goes wrong:** The perform-rite narrator text describes "the curse lifts" generically, then the throne puzzles describe the specific choice. The ending epilogue text in EndingScene then ALSO describes the full story. This creates narrative repetition.
**Why it happens:** The ending epilogue was written to stand alone (for the gallery), but the player also just read the perform-rite and throne-choice narration.
**How to avoid:** Write the EndingScene epilogue to begin AFTER the in-room narration -- it should start from where the throne decision left off, not recap the rite. The perform-rite + throne narration = the climax. The EndingScene epilogue = the aftermath and reflection.

## Code Examples

### Example 1: PuzzleEngine evaluate-ending Action
```typescript
// Source: src/game/systems/PuzzleEngine.ts -- extend executeAction()

// Add to PuzzleAction type (PuzzleData.ts):
| { type: 'evaluate-ending' }

// Add to PuzzleEngine.executeAction():
case 'evaluate-ending':
    EventBus.emit('trigger-ending', this.determineEnding());
    return null;

// New private method:
private determineEnding(): string {
    const remembers = this.state.isFlagSet('clerk_remembers');
    const accepted = this.state.isFlagSet('throne_accepted');
    if (remembers && accepted) return 'ending-wanderer-king';
    if (remembers && !accepted) return 'ending-redemption';
    if (!remembers && accepted) return 'ending-reluctant-ruler';
    return 'ending-bureaucratic';
}
```

### Example 2: RoomScene trigger-ending Handler
```typescript
// Source: follows trigger-death handler pattern in RoomScene.ts

private triggerEndingHandler!: (endingId: string) => void;

// In create():
this.triggerEndingHandler = (endingId: string) => {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Record ending BEFORE starting EndingScene
    const meta = MetaGameState.getInstance();
    const isNewEnding = meta.recordEnding(endingId);
    const discoveredCount = meta.getEndingsDiscovered().length;

    // Fade out, then launch EndingScene (full stop -- no resume)
    this.textInputBar.hide();
    this.inventoryPanel.hide();
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => {
            this.scene.start('EndingScene', {
                endingId,
                isNewEnding,
                discoveredCount,
                totalEndings: 4,
            } as EndingSceneData);
        }
    );
};
EventBus.on('trigger-ending', this.triggerEndingHandler);

// In shutdown cleanup:
EventBus.off('trigger-ending', this.triggerEndingHandler);
```

### Example 3: EndingScene.ts (Skeleton)
```typescript
// Source: follows DeathScene.ts pattern

import { Scene } from 'phaser';
import { GameState } from '../state/GameState';
import type { EndingEntry, EndingRegistry } from '../types/EndingRegistryData';

export interface EndingSceneData {
    endingId: string;
    isNewEnding: boolean;
    discoveredCount: number;
    totalEndings: number;
}

export class EndingScene extends Scene {
    constructor() {
        super('EndingScene');
    }

    create(data: EndingSceneData): void {
        const registry: EndingRegistry = this.cache.json.get('endings-registry');
        const ending: EndingEntry | undefined = registry.endings.find(e => e.id === data.endingId);

        if (!ending) {
            console.error(`Ending "${data.endingId}" not found in registry`);
            this.scene.start('MainMenuScene');
            return;
        }

        // Dark background
        this.add.rectangle(480, 270, 960, 540, 0x000000, 1).setDepth(0);

        // NEW ENDING badge
        if (data.isNewEnding) {
            const badge = this.add.text(480, 60, 'NEW ENDING DISCOVERED!', {
                fontFamily: 'monospace', fontSize: '14px', color: '#ffcc00',
            }).setOrigin(0.5).setAlpha(0).setDepth(1);
            this.tweens.add({ targets: badge, alpha: 1, y: badge.y - 10, duration: 500, ease: 'Back.easeOut' });
        }

        // Title
        this.add.text(480, 90, ending.title, {
            fontFamily: 'monospace', fontSize: '26px', color: '#c8c8d4',
        }).setOrigin(0.5).setDepth(1);

        // Subtitle
        this.add.text(480, 125, ending.subtitle, {
            fontFamily: 'monospace', fontSize: '12px', color: '#888888',
        }).setOrigin(0.5).setDepth(1);

        // Epilogue text (word-wrapped, centered)
        this.add.text(480, 280, ending.epilogueText, {
            fontFamily: 'monospace', fontSize: '13px', color: '#c8c8d4',
            wordWrap: { width: 780 }, align: 'left', lineSpacing: 6,
        }).setOrigin(0.5).setDepth(1);

        // Credits
        this.add.text(480, 440, '---- THE END ----', {
            fontFamily: 'monospace', fontSize: '14px', color: '#666666',
        }).setOrigin(0.5).setDepth(1);

        this.add.text(480, 462, `${data.discoveredCount}/${data.totalEndings} endings discovered`, {
            fontFamily: 'monospace', fontSize: '11px', color: '#555555',
        }).setOrigin(0.5).setDepth(1);

        // Play Again button
        const playAgain = this.add.text(340, 500, '[ Play Again ]', {
            fontFamily: 'monospace', fontSize: '20px', color: '#ffcc00',
        }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });

        playAgain.on('pointerdown', () => {
            GameState.getInstance().reset();
            this.scene.start('RoomScene', { roomId: 'forest_clearing' });
        });

        // Main Menu button
        const mainMenu = this.add.text(620, 500, '[ Main Menu ]', {
            fontFamily: 'monospace', fontSize: '20px', color: '#c8c8d4',
        }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });

        mainMenu.on('pointerdown', () => {
            this.scene.start('MainMenuScene');
        });
    }
}
```

### Example 4: EndingRegistryData.ts Types
```typescript
// Source: follows DeathRegistryData.ts pattern

export interface EndingEntry {
    id: string;                  // e.g., "ending-redemption"
    title: string;               // e.g., "The Tinker's Farewell"
    subtitle: string;            // e.g., "The Clerk Remembers / Pip Walks Away"
    epilogueText: string;        // ~150-250 word narrator epilogue
    galleryHint: string;         // Teaser for undiscovered endings in gallery
}

export interface EndingRegistry {
    version: number;
    totalEndings: number;        // 4
    endings: EndingEntry[];
}
```

### Example 5: Preloader + main.ts Registration
```typescript
// Preloader.ts -- add:
this.load.json('endings-registry', 'assets/data/endings-registry.json');

// main.ts -- add EndingScene to scene array:
import { EndingScene } from './scenes/EndingScene';
// in config.scene array:
scene: [Boot, Preloader, MainMenuScene, Game, RoomScene, DeathScene, DeathGalleryScene, EndingScene],
```

### Example 6: MainMenuScene Endings Gallery Link
```typescript
// In MainMenuScene.showMainMenu() -- add after Death Gallery link:
if (MetaGameState.getInstance().getEndingsDiscovered().length > 0) {
    const endingsText = this.createMenuItem('Endings Gallery', 480, y, () => {
        this.scene.start('EndingsGalleryScene', { returnTo: 'MainMenuScene' });
    });
    this.menuItems.push(endingsText);
    y += 50;
}
```

**Note:** An `EndingsGalleryScene` (browsable endings gallery) is OPTIONAL for this phase. The minimum requirement (ENDS-04) is that endings are tracked in MetaGameState -- the gallery UI is a nice-to-have. The planner should determine if EndingsGalleryScene is included in this phase or deferred.

### Example 7: Modified throne_room_act3.json accept-throne puzzle
```json
{
    "id": "accept-throne",
    "trigger": { "verb": "use", "subject": "cracked-throne" },
    "conditions": [
        { "type": "flag-set", "flag": "curse-broken" },
        { "type": "flag-not-set", "flag": "throne_accepted" },
        { "type": "flag-not-set", "flag": "throne_declined" }
    ],
    "actions": [
        { "type": "set-flag", "flag": "throne_accepted" },
        {
            "type": "narrator-say",
            "text": "You sit on the ruins of the throne. [existing text...]"
        },
        { "type": "evaluate-ending" }
    ],
    "once": true
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `game-complete` flag set at rite | 4 distinct endings evaluated at throne choice | Phase 12 (this phase) | Players have a reason to replay and explore different paths |
| No ending scene | EndingScene with epilogue and credits | Phase 12 (this phase) | Game has a satisfying conclusion instead of just stopping |
| MetaGameState had endings field but unused | MetaGameState.recordEnding() + getEndingsDiscovered() active | Phase 12 (this phase) | Cross-playthrough ending tracking enabled |
| Clerk ally path had no narrative consequence | clerk_remembers vs clerk_outwitted split ending text | Phase 12 (this phase) | The most emotionally significant choice in Act 3 has a payoff |

**Already implemented (requires no new work):**
- MetaGameState `recordEnding()` / `getEndingsDiscovered()` / `endingsDiscovered[]` field
- `throne_accepted` / `throne_declined` flag-setting puzzles in throne_room_act3.json
- `clerk_remembers` / `clerk_outwitted` / `clerk_allied` flags in dungeon.json
- PuzzleEngine condition evaluation (all needed condition types exist)
- EventBus pattern for cross-system events

**New work required:**
- `evaluate-ending` action type in PuzzleEngine + `determineEnding()` method
- `trigger-ending` EventBus event + RoomScene handler
- `EndingScene` Phaser scene
- `endings-registry.json` with 4 authored endings (epilogue text, titles, hints)
- `EndingRegistryData.ts` types
- Preloader + main.ts registration
- Modify accept-throne + decline-throne puzzles to call `evaluate-ending`
- Remove bare `game-complete` flag from perform-rite (replaced by ending flow)
- Optional: `EndingsGalleryScene` for browsing discovered endings

## Open Questions

1. **EndingsGalleryScene: in-scope or deferred?**
   - What we know: ENDS-04 requires tracking, not necessarily a gallery UI. Death Gallery (Phase 10) established the pattern.
   - What's unclear: Whether a browsable endings gallery is needed for phase completion or is deferred to future polish.
   - Recommendation: Include a minimal `EndingsGalleryScene` (simpler than DeathGalleryScene -- only 4 entries, no pagination needed). It's low effort given the established pattern and makes ENDS-04 more meaningful.

2. **Timing of EndingScene vs. typewriter completion**
   - What we know: The throne-choice narrator text is ~100 words. The player must read it before EndingScene starts. The `evaluate-ending` action fires synchronously after narrator-say.
   - What's unclear: Best UX for the handoff -- fade after a fixed delay, or wait for player click.
   - Recommendation: 1500ms fixed delay after the throne-choice text appears (giving time to read), then fade out. Simpler than a click-to-continue flow, consistent with the game's auto-advance style.

3. **clock-fixed and mirror_truth_revealed as epilogue variants**
   - What we know: These flags exist and represent meaningful player choices. The flag registry documents them as "ending variant detail."
   - What's unclear: Whether the epilogue text should branch based on these secondary flags.
   - Recommendation: Add one sentence to each ending's epilogue that references the clock repair or mirror truth IF the relevant flag is set. Implement as conditional string concatenation in EndingScene.create(), not as separate ending entries. Keep the 4-ending matrix clean.

4. **Game-complete state after ending**
   - What we know: Currently, perform-rite sets a `game-complete` flag. This flag is not currently used anywhere in the codebase.
   - What's unclear: Whether this flag needs to persist in GameState for anything (e.g., post-game new game+ mode).
   - Recommendation: Remove `game-complete` from perform-rite actions (it served as a placeholder). The ending is now signaled by `trigger-ending` event + EndingScene launch. No persistent `game-complete` flag is needed.

## Sources

### Primary (HIGH confidence)
- `src/game/systems/PuzzleEngine.ts` -- executeAction() switch, evaluateConditions(), EventBus.emit pattern
- `src/game/state/MetaGameState.ts` -- recordEnding(), getEndingsDiscovered(), endingsDiscovered[] field; confirmed implemented and tested
- `src/game/scenes/DeathScene.ts` -- Scene overlay pattern, DeathSceneData interface, button layout, badge tween
- `src/game/scenes/DeathGalleryScene.ts` -- Registry-driven gallery, paginated grid, overlay details pattern
- `src/game/scenes/RoomScene.ts` -- triggerDeathHandler pattern, EventBus wiring, scene.pause/launch flow, shutdown cleanup
- `src/game/scenes/MainMenuScene.ts` -- createMenuItem() pattern, conditional gallery link (MetaGameState gating)
- `src/game/scenes/Preloader.ts` -- JSON loading pattern (this.load.json), scene registration pattern
- `src/game/main.ts` -- Scene array registration
- `public/assets/data/rooms/throne_room_act3.json` -- All existing puzzles (prepare-rite, perform-rite, accept-throne, decline-throne); confirmed flag names and conditions
- `public/assets/data/rooms/dungeon.json` -- clerk_remembers, clerk_outwitted, clerk_allied flag-setting puzzles
- `src/game/types/PuzzleData.ts` -- PuzzleAction union type; confirmed structure for adding new action type
- `src/game/types/DeathRegistryData.ts` -- Template for EndingRegistryData.ts
- `.planning/milestones/v1.0-phases/08-content-production/story-bible.md` -- Flag registry (68 flags), Act 3 breakdown, Clerk redemption arc, throne decision, NPC roster

### Secondary (MEDIUM confidence)
- `.planning/phases/10-death-gallery/10-RESEARCH.md` -- Established pattern for registry-driven gallery, MetaGameState integration, scene navigation

### Tertiary (LOW confidence)
- None -- all findings verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies; all patterns exist in codebase
- Architecture: HIGH -- Direct extension of PuzzleEngine (one action type) + DeathScene pattern reuse
- Ending conditions: HIGH -- Flags verified in source room JSONs; 4-ending matrix is simple and deterministic
- Ending epilogue authoring: MEDIUM -- Content quality is a writing task; technical structure is HIGH confidence
- Throne timing fix: HIGH -- Problem clearly identified in throne_room_act3.json analysis; solution is explicit

**Research date:** 2026-02-21
**Valid until:** Indefinite (no external dependency version concerns; purely internal architecture)
