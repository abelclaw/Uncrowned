# Phase 8: Content Production - Research

**Researched:** 2026-02-21
**Domain:** Adventure game content authoring, narrative design, puzzle dependency graphs, AI art pipeline, data-driven game content at scale
**Confidence:** HIGH (engine data formats fully understood; content design patterns well-established; art pipeline MEDIUM)

## Summary

Phase 8 transforms the complete but placeholder-populated engine into a full 5-hour fantasy adventure game. This is fundamentally a content authoring phase, not an engineering phase -- the engine is done, and every system (rooms, items, puzzles, deaths, NPCs, dialogue, audio) is driven by JSON data files and ink scripts. The work is: (1) design the complete story arc and puzzle dependency graph, (2) author all room JSON files, item definitions, ink dialogue scripts, death scenarios, and puzzle chains, (3) generate scene art via the Flux pipeline, (4) generate/source audio assets, and (5) validate the full game is completable with no unwinnable states.

The strategy (already decided) is demo-first: author a 30-60 minute demo chapter to validate pacing, tone, and puzzle difficulty, then scale to the full 5-hour game across multiple acts. This is critical because content errors compound -- a bad pacing decision in Act 1 affects every subsequent act.

**Primary recommendation:** Structure work as: story bible/puzzle dependency graph first, then demo chapter (complete with art and audio), then full game content in act-by-act batches. Every batch must be validated for completeness, winnability, and tone consistency before moving to the next.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NARR-01 | Complete fantasy adventure story with beginning, middle, and satisfying end | Story bible structure, three-act framework, puzzle dependency graph methodology, demo-first validation approach |
| NARR-02 | Story provides ~5 hours of gameplay content across multiple acts | Content scope estimation (30-40 rooms, 60-80 puzzles, 40+ deaths, 10-15 NPCs), act-based production batching, room JSON authoring patterns |
</phase_requirements>

## Content Scope Estimation

### Room/Content Scale for 5 Hours

Based on King's Quest series analysis and modern adventure game benchmarks:

| Metric | Demo Chapter (30-60 min) | Full Game (~5 hours) | Basis |
|--------|--------------------------|----------------------|-------|
| Rooms | 5-8 | 30-40 | ~6-8 rooms/hour of gameplay; puzzles add dwell time |
| Inventory items | 5-8 | 25-35 | KQ1 had 24 items for ~3 hrs; KQ5 had 88 for ~8 hrs |
| Puzzles (total interactions) | 10-15 | 60-80 | KQ1 had ~48; includes take/use/combine/env/conversation |
| Death scenarios | 5-8 | 40-60 | KQ games averaged 1-2 deaths per room; signature feature |
| NPCs | 2-3 | 10-15 | Each NPC needs ink dialogue, personality, puzzle-relevant knowledge |
| Item combinations | 2-3 | 10-15 | Authored combinations only, not a crafting system |
| Flags/game state variables | 15-25 | 80-120 | Puzzle conditions, NPC states, story progression gates |

**Confidence:** MEDIUM -- These are estimates based on genre analysis. Actual numbers emerge from the story design.

### King's Quest Series Reference Data

| Game | Puzzles | Items | Approx. Playtime |
|------|---------|-------|-------------------|
| KQ1 SCI | 49 | 24 | ~3-4 hours |
| KQ2 | 55 | 35 | ~4-5 hours |
| KQ5 | 88 | -- | ~6-8 hours |
| KQ6 | 128 | 68 | ~8-12 hours |

**Source:** King's Quest Omnipedia Puzzle Statistics (HIGH confidence)

## Engine Data Formats (Complete Reference)

All content is authored in these exact formats. The engine is complete; no code changes needed.

### Room JSON Structure

Each room is a single JSON file at `public/assets/data/rooms/{room_id}.json`. Key from `RoomData` interface:

```typescript
interface RoomData {
    id: string;                    // Unique room ID (snake_case)
    name: string;                  // Display name
    description?: string;          // Bare "look" response
    background: {
        layers: BackgroundLayer[]; // Parallax layers [{key, scrollFactor}]
        worldWidth: number;        // 1920 for scrolling rooms, 960 for single-screen
    };
    walkableArea: Array<{x, y}>;   // Convex polygon points
    exits: ExitData[];             // Room connections
    hotspots: HotspotData[];       // Interactive scene objects
    playerSpawn: {x, y};           // Default entry position
    items?: RoomItemData[];        // Pickable items placed in room
    puzzles?: PuzzleDefinition[];  // Puzzle triggers evaluated by PuzzleEngine
    deathTriggers?: PuzzleDefinition[]; // Death triggers (same format, checked after puzzles)
    deaths?: Record<string, DeathDefinition>; // Death scenarios {deathId: {title, narratorText}}
    dynamicDescriptions?: Record<string, string>; // Flag-based room description overrides
    npcs?: RoomNpcData[];          // NPC placement [{id, position, interactionPoint, zone}]
    audio?: RoomAudioData;         // {music?: string, ambient?: [{key, volume}]}
}
```

### Exit Data

```typescript
interface ExitData {
    id: string;                    // e.g. "to-cave"
    zone: {x, y, width, height};   // Click/overlap detection rectangle
    targetRoom: string;            // Room ID to transition to
    spawnPoint: {x, y};            // Player spawn in target room
    transition: 'fade' | 'slide-left' | 'slide-right';
    direction?: string;            // "east", "west" etc. for parser
    label?: string;                // "cave", "village" for parser
}
```

### Hotspot Data

```typescript
interface HotspotData {
    id: string;                    // Unique within room
    name: string;                  // Display name
    zone: {x, y, width, height};   // Clickable area
    interactionPoint: {x, y};      // Player walks here first
    responses?: {                  // Verb-specific narrator text
        look?: string;
        take?: string;
        use?: string;
        talk?: string;
        open?: string;
        push?: string;
        pull?: string;
        default?: string;          // Fallback for unhandled verbs
    };
}
```

### Room Item Data

```typescript
interface RoomItemData {
    id: string;                    // Must match items.json entry
    name: string;
    zone: {x, y, width, height};
    interactionPoint: {x, y};
    responses?: HotspotResponses;  // Same as hotspot responses
}
```

### Item Definitions (items.json)

Global item registry at `public/assets/data/items.json`:

```json
{
    "items": [
        {
            "id": "rusty-key",
            "name": "Rusty Key",
            "description": "A key so corroded it might unlock a door or give you tetanus. Possibly both.",
            "combinable": false
        }
    ]
}
```

### Puzzle Definitions

```typescript
interface PuzzleDefinition {
    id: string;
    trigger: {
        verb: string;              // "take", "use", "combine", "push", "look", etc.
        subject?: string;          // Primary target ID
        target?: string;           // Secondary target for "use X on Y"
    };
    conditions: PuzzleCondition[]; // ALL must be true
    actions: PuzzleAction[];       // Execute in order when conditions met
    once?: boolean;                // Fire only once per playthrough
}
```

**Condition types:**
- `{type: "has-item", item: "key"}` -- Player has item in inventory
- `{type: "not-has-item", item: "key"}` -- Player does not have item
- `{type: "flag-set", flag: "door-unlocked"}` -- Game flag is set
- `{type: "flag-not-set", flag: "door-unlocked"}` -- Game flag not set
- `{type: "in-room", room: "cave_entrance"}` -- Player is in specific room
- `{type: "item-not-taken", item: "rusty-key"}` -- Item not yet picked up from room

**Action types:**
- `{type: "add-item", item: "key"}` -- Add item to inventory
- `{type: "remove-item", item: "key"}` -- Remove item from inventory
- `{type: "set-flag", flag: "door-unlocked"}` -- Set game state flag
- `{type: "remove-flag", flag: "door-unlocked"}` -- Remove flag
- `{type: "narrator-say", text: "..."}` -- Display narrator text
- `{type: "show-message", text: "..."}` -- Display system message
- `{type: "trigger-death", deathId: "bee-death"}` -- Trigger death scenario
- `{type: "remove-hotspot", hotspot: "old-tree"}` -- Remove scene element
- `{type: "add-hotspot", hotspot: "hidden-path"}` -- Add scene element
- `{type: "open-exit", exit: "to-depths"}` -- Make hidden exit accessible

### Death Definitions

Inline in room JSON under `deaths`:

```json
{
    "deaths": {
        "bee-death": {
            "title": "Death by Enthusiasm",
            "narratorText": "You shove the beehive because... why? What possible good outcome did you envision?"
        }
    }
}
```

Death triggers use the same PuzzleDefinition format under `deathTriggers`.

### NPC Definitions

Global registry at `public/assets/data/npcs/npcs.json`:

```json
{
    "npcs": [
        {
            "id": "old_man",
            "name": "Old Man",
            "personality": "A cryptic, slightly unhinged hermit who speaks in riddles...",
            "knowledge": ["cave", "key", "bottle", "village history", "forest dangers"],
            "dialogueKey": "dialogue-old_man",
            "defaultGreeting": "The old man stares at you with unsettling intensity."
        }
    ]
}
```

Room placement in room JSON under `npcs`:

```json
{
    "npcs": [
        {
            "id": "old_man",
            "position": {"x": 700, "y": 400},
            "interactionPoint": {"x": 670, "y": 430},
            "zone": {"x": 680, "y": 370, "width": 40, "height": 80},
            "conditions": [{"type": "flag-not-set", "flag": "old_man_gone"}]
        }
    ]
}
```

### Ink Dialogue Scripts

Source `.ink` files at `public/assets/data/ink-source/{npc_id}.ink`. Compiled `.ink.json` at `public/assets/data/dialogue/{npc_id}.ink.json`.

Available EXTERNAL functions for ink scripts (bound by DialogueManager):

```
EXTERNAL hasItem(itemId)      -- Check if player has item
EXTERNAL hasFlag(flagName)    -- Check if game flag is set
EXTERNAL setFlag(flagName)    -- Set a game flag
EXTERNAL addItem(itemId)      -- Give player an item
EXTERNAL removeItem(itemId)   -- Remove item from inventory
EXTERNAL visitedRoom(roomId)  -- Check if room was visited
EXTERNAL getDeathCount()      -- Get total death count
```

Ink tag conventions (parsed by DialogueUI):
- `#speaker:Old Man` -- Speaker name display
- `#emotion:suspicious` -- NPC emotion state

### Audio Configuration

Room-level audio in room JSON under `audio`:

```json
{
    "audio": {
        "music": "music-forest",
        "ambient": [
            {"key": "amb-forest-birds", "volume": 0.8},
            {"key": "amb-wind-light", "volume": 0.3}
        ]
    }
}
```

SFX event registry at `public/assets/data/audio-registry.json`:

```json
{
    "sfxEvents": {
        "item-picked-up": "sfx-item-pickup",
        "go-command": "sfx-door-transition",
        "trigger-death": "sfx-death-sting",
        "start-dialogue": "sfx-dialogue-start",
        "command-submitted": "sfx-command-blip"
    }
}
```

### Preloader Registration

Every new asset must be registered in `src/game/scenes/Preloader.ts`:

```typescript
// Room data
this.load.json('room-{room_id}', 'assets/data/rooms/{room_id}.json');

// NPC dialogue
this.load.json('dialogue-{npc_id}', 'assets/data/dialogue/{npc_id}.ink.json');

// Background images (per room or shared)
this.load.image('{key}', 'assets/backgrounds/{filename}.png');

// Music
this.load.audio('music-{area}', 'assets/audio/music/{area}.wav');

// Ambient
this.load.audio('amb-{name}', 'assets/audio/ambient/{name}.wav');
```

### Starting Room Configuration

Default starting room is set in `src/game/state/GameStateTypes.ts`:

```typescript
export function getDefaultState(): GameStateData {
    return {
        currentRoom: 'forest_clearing', // Change to game's starting room
        // ...
    };
}
```

## Architecture Patterns

### Pattern 1: Puzzle Dependency Graph Design

**What:** Before authoring any room JSON, design the complete puzzle dependency graph showing how items, puzzles, NPCs, and story gates interconnect.

**When to use:** Always. This is the single most important content design artifact.

**Structure (Ron Gilbert method):**
```
[START] -> [Get Key] -> [Unlock Door] ----\
                                            \
[START] -> [Talk to NPC] -> [Learn Hint] -> [Solve Cave Puzzle] -> [ACT 1 GATE]
                                            /
[START] -> [Get Mushroom + Stick] --------/
```

**Key principles:**
1. Diamond shape: start narrow, expand to 2-4 parallel puzzle chains, contract to gate
2. Acts provide closure: bottleneck between acts allows inventory management
3. No dead ends: every item obtainable regardless of puzzle order within an act
4. Work backwards from goals: decide what the player achieves, then derive prerequisites

**Source:** Ron Gilbert's Puzzle Dependency Charts (HIGH confidence)

### Pattern 2: Act-Based Content Structure

**What:** Divide the game into 3-4 acts, each with its own hub area, puzzle set, and narrative arc.

**Recommended structure for 5-hour game:**

| Act | Duration | Rooms | Focus |
|-----|----------|-------|-------|
| Demo (Act 1a) | 30-60 min | 5-8 | Tutorial, establish tone, first puzzle chain |
| Act 1b | 30-60 min | 5-8 | Expand world, introduce key NPCs |
| Act 2 | 90-120 min | 10-14 | Main quest complications, hardest puzzles |
| Act 3 | 60-90 min | 8-12 | Climax, resolution, final puzzles |

**Each act contains:**
- A hub room connecting to 3-5 explorable rooms
- 2-4 parallel puzzle chains that converge at the act gate
- 2-3 NPCs with dialogue trees relevant to current puzzles
- 5-10 death scenarios unique to the act's environments
- Story progression gates (flags) that unlock the next act

### Pattern 3: Room Authoring Workflow

**What:** Systematic process for authoring each room JSON.

**Steps per room:**
1. **Narrative:** Write room description and dynamic descriptions (flag-based variants)
2. **Geography:** Define walkableArea polygon, exits with connections, playerSpawn
3. **Hotspots:** Place 2-4 interactive elements with verb responses (all 7 verbs + default)
4. **Items:** Place 0-2 takeable items with responses and matching items.json entries
5. **Puzzles:** Define puzzle triggers with conditions/actions from the dependency graph
6. **Deaths:** Design 1-3 death scenarios per room with unique narrator commentary
7. **NPCs:** Place NPCs with zone/position, link to dialogue key
8. **Audio:** Assign music and ambient tracks
9. **Art prompt:** Write Flux generation prompt for room background

### Pattern 4: Death Design Philosophy

**What:** Deaths are comedy, not punishment. Every death must be: (1) funny, (2) clearly the player's fault, (3) instantly recoverable.

**Death density target:** 1-2 unique deaths per room minimum. Players should discover deaths organically by trying dangerous things.

**Categories for variety:**
- Environmental hazard (falling, drowning, fire, animals)
- Wrong item usage (drinking poison, eating inedible things)
- Ignoring warnings (going where told not to)
- Creative experimentation (trying absurd things)
- NPC-related (angering the wrong person)

**Narrator voice for deaths:** Each death gets a unique 2-4 sentence narrator response. Dark comedy, never mean-spirited. Reference specific player action. No repeated patterns.

### Pattern 5: Unwinnable State Prevention

**What:** Systematic approach to ensure no player can reach a state where the game cannot be completed.

**Rules:**
1. **Items never consumed by failed attempts.** Only successful puzzle actions remove items.
2. **No permanent consequences from wrong choices.** Death resets to room entry.
3. **Items obtainable regardless of order.** Within an act, all items available regardless of which puzzles solved first.
4. **Key items cannot be destroyed.** Only puzzle-solving removes key items, and only when they are no longer needed.
5. **Act gates verify prerequisites.** Transition to next act only possible when all required items/flags are present.
6. **One-way doors checked.** Any room that cannot be re-entered must not contain needed items.

**Validation approach:** For each puzzle, trace backwards through the dependency graph: can the player always reach the prerequisites from any valid game state?

### Anti-Patterns to Avoid

- **Moon logic puzzles:** Every solution must be logical in hindsight. "Use rubber chicken with pulley" is iconic but bad design. Test: can a player reason their way to the solution?
- **Pixel hunting:** Hotspot zones must be visually obvious in the room art. No hidden items in invisible 3x3 pixel areas.
- **Read the designer's mind:** Multiple approaches should work where reasonable. The LLM parser helps here -- it understands intent.
- **Inventory overload:** No act should require the player to hold more than 8-10 items simultaneously. Consume items through puzzles to make space.
- **NPC info dumps:** Break critical information across multiple dialogue exchanges and visits. Don't frontload everything in one conversation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ink compilation | Manual JSON editing of ink output | `inkjs` Compiler class in build pipeline | Hand-editing compiled ink JSON is error-prone; ink source is human-readable |
| Pixel art backgrounds | Manual pixel art drawing | Flux/mflux pipeline with consistent prompting | 30-40 unique backgrounds would take months by hand |
| Audio assets | Recording/composing from scratch | AI music generation + placeholder WAVs from Python script | Focus on content authoring, not audio production |
| Winnability testing | Manual playthrough checking | Systematic dependency graph validation + automated flag reachability | Manual testing misses edge cases in 80+ flag states |
| Room graph visualization | Mental tracking of room connections | Simple text-based or markdown room map | Lost connections create dead ends |

## Art Pipeline: Flux via mflux

### Setup (macOS Apple Silicon)

```bash
# Install mflux
uv tool install --upgrade mflux --with hf_transfer
```

### Generation Command

Using Z-Image Turbo (best all-rounder, fast, 6B):

```bash
mflux-generate-z-image-turbo \
  --prompt "pixel art adventure game background, {room description}, retro 16-bit style, vibrant colors, detailed environment, side-view perspective, no characters" \
  --width 1920 \
  --height 540 \
  --seed 42 \
  --steps 9 \
  -q 8
```

Or using FLUX.2 4B distilled:

```bash
mflux-generate-flux2-4b-distilled \
  --prompt "pixel art adventure game background, {room description}" \
  --width 1920 \
  --height 540 \
  --seed 42 \
  --steps 4 \
  -q 8
```

### Consistency Strategy

- **Fixed prompt prefix:** All rooms share "pixel art adventure game background, 16-bit retro style, [area-theme]"
- **Area-based themes:** Forest rooms share "lush green forest, dappled sunlight"; cave rooms share "dark stone cavern, bioluminescent accents"
- **Fixed seed range per area:** Use seeds 100-199 for forest, 200-299 for cave, etc. for tonal consistency
- **Resolution:** 1920x540 (matches existing backgrounds for parallax scrolling rooms) or 960x540 for single-screen rooms
- **Post-processing:** May need manual touch-up for walkable area clarity and hotspot visibility

**Confidence:** MEDIUM -- mflux pixel art quality needs validation. Retro Diffusion (FLUX-based, specialized for pixel art) may produce better results but is a cloud service. The local mflux pipeline should be tested with a few rooms before committing to full production.

## Common Pitfalls

### Pitfall 1: Content Debt Spiral

**What goes wrong:** Authoring rooms without a complete story/puzzle plan, leading to disconnected content that needs massive rework.
**Why it happens:** Temptation to "just start writing rooms" before the story is designed.
**How to avoid:** Complete the story bible and puzzle dependency graph BEFORE authoring any room JSON.
**Warning signs:** Rooms that exist but connect to nothing; items with no puzzle that uses them; NPCs with no story purpose.

### Pitfall 2: Tone Drift

**What goes wrong:** Early rooms have sharp, funny writing. By room 30, the narrator voice becomes bland or inconsistent.
**Why it happens:** Fatigue in writing hundreds of unique responses.
**How to avoid:** Establish a style guide with 5-10 example responses per verb type. Review periodically. Batch-write all room descriptions for an act together.
**Warning signs:** Responses that feel generic ("You can't do that") instead of specific and funny.

### Pitfall 3: Unwinnable States at Scale

**What goes wrong:** Complex flag interactions create states where required items are unreachable.
**Why it happens:** With 80+ flags, manual reasoning about all state combinations is impossible.
**How to avoid:** Each puzzle's required items must be obtainable without solving that puzzle first (no circular dependencies). Items only consumed by successful puzzle actions, never by failed attempts. Death always resets to room entry state.
**Warning signs:** Puzzles that require an item from a room the player cannot return to.

### Pitfall 4: Preloader Bloat

**What goes wrong:** Loading 30-40 room JSONs, 40+ images, and 30+ audio files in a single Preloader causes a long initial load.
**Why it happens:** The current Preloader loads everything upfront (appropriate for 3 placeholder rooms, not for 30-40 production rooms).
**How to avoid:** Group assets by act/area. Consider lazy-loading rooms as the player approaches adjacent areas, or accept a longer initial load for the simpler architecture.
**Warning signs:** Initial load time exceeding 5-10 seconds.

### Pitfall 5: Ink Script Complexity Explosion

**What goes wrong:** NPC dialogue scripts become tangled messes of conditional branches that are hard to maintain.
**Why it happens:** Adding "just one more flag check" to existing conversations.
**How to avoid:** Keep each NPC's ink script focused on their knowledge areas. Use knot-per-topic structure (greeting, topic_a, topic_b, farewell). Limit EXTERNAL function calls to essential state checks.
**Warning signs:** Ink files exceeding 200 lines; nested conditionals more than 3 levels deep.

### Pitfall 6: Hotspot Zone Misalignment with Art

**What goes wrong:** Clickable zones don't match where objects appear in the generated background art.
**Why it happens:** Room JSON authored before art is finalized; art changes after zones are placed.
**How to avoid:** Author room JSON with approximate zones using placeholder art, then adjust zones after final art is generated. Use the DEBUG=true flag in RoomScene to visualize zones.
**Warning signs:** Players clicking on visible objects and getting "you don't see that here."

## Content Authoring Workflow

### Phase 1: Story Bible and Puzzle Dependency Graph

1. **Story outline:** 1-2 page narrative arc (beginning, inciting incident, complications, climax, resolution)
2. **Act breakdown:** Define 3-4 acts with clear narrative goals and puzzle gates
3. **Room map:** Text-based map showing all rooms and connections
4. **Puzzle dependency graph:** Every puzzle, its prerequisites, and what it unlocks
5. **Item master list:** All items with descriptions, which puzzles they solve
6. **NPC roster:** All NPCs with personalities, knowledge, and dialogue topics
7. **Death catalog:** Every death scenario tied to specific rooms and actions

### Phase 2: Demo Chapter Production

1. **Author rooms:** 5-8 room JSONs with full content (hotspots, items, puzzles, deaths)
2. **Author items:** items.json entries for all demo items
3. **Author NPC dialogue:** ink scripts for 2-3 demo NPCs
4. **Generate art:** Flux backgrounds for all demo rooms
5. **Source audio:** Music and ambient for demo areas
6. **Register in Preloader:** All new assets
7. **Update starting room:** GameStateTypes.ts default room
8. **Playtest:** Complete walkthrough, verify winnability, check tone

### Phase 3: Full Game Production (per act)

Repeat Phase 2 workflow for each remaining act, plus:
1. **Cross-act flag validation:** Verify act gates work correctly
2. **Narrator history updates:** Expand narrator_history.ink for new rooms/events
3. **Cumulative playtest:** Full game walkthrough from start to current act

## Code Examples

### Complete Room JSON (Production Quality)

```json
{
    "id": "throne_room",
    "name": "The Throne Room",
    "description": "A once-grand throne room, now draped in cobwebs thick enough to use as hammocks. The throne itself leans at an angle that suggests either an earthquake or terrible carpentry.",
    "background": {
        "layers": [
            {"key": "bg-throne-back", "scrollFactor": 0.2},
            {"key": "bg-throne-mid", "scrollFactor": 0.6},
            {"key": "bg-throne-front", "scrollFactor": 1}
        ],
        "worldWidth": 1920
    },
    "walkableArea": [
        {"x": 80, "y": 400}, {"x": 880, "y": 400},
        {"x": 880, "y": 520}, {"x": 80, "y": 520}
    ],
    "exits": [
        {
            "id": "to-hallway",
            "zone": {"x": 0, "y": 370, "width": 80, "height": 180},
            "targetRoom": "castle_hallway",
            "spawnPoint": {"x": 840, "y": 440},
            "transition": "slide-left",
            "direction": "west",
            "label": "hallway"
        }
    ],
    "hotspots": [
        {
            "id": "throne",
            "name": "Crooked Throne",
            "zone": {"x": 430, "y": 320, "width": 100, "height": 120},
            "interactionPoint": {"x": 480, "y": 430},
            "responses": {
                "look": "The throne tilts at a jaunty 15 degrees. Royal cushions have been colonized by moths who clearly have better taste in seating than the last king.",
                "use": "You sit on the throne. It creaks ominously. For a brief, glorious moment, you are royalty. Then the armrest falls off.",
                "take": "You try to lift the throne. It weighs approximately one metric regret. You leave it where it is.",
                "push": "You shove the throne upright. It slowly tilts back. You've discovered perpetual disappointment.",
                "talk": "You address the empty throne. 'Your majesty?' The echo makes it sound like you're asking a question you definitely should not.",
                "default": "You contemplate the throne. It contemplates the void."
            }
        },
        {
            "id": "portrait",
            "name": "Royal Portrait",
            "zone": {"x": 650, "y": 280, "width": 60, "height": 80},
            "interactionPoint": {"x": 680, "y": 430},
            "responses": {
                "look": "A portrait of the last king. He has the expression of someone who just realized his throne is crooked and has been for years.",
                "take": "It's bolted to the wall. The last king was paranoid about portrait theft. In fairness, he was right to be.",
                "push": "You push the portrait. It swings aside, revealing... a brick wall. How disappointingly realistic.",
                "default": "The portrait stares at you with regal disapproval."
            }
        }
    ],
    "items": [
        {
            "id": "royal-seal",
            "name": "Royal Seal",
            "zone": {"x": 460, "y": 380, "width": 25, "height": 20},
            "interactionPoint": {"x": 475, "y": 430},
            "responses": {
                "look": "A heavy wax seal stamp bearing the royal crest. The crest appears to be a disgruntled badger wearing a crown.",
                "use": "Stamp what? The air? Actually, that might be the most productive use of royalty in years."
            }
        }
    ],
    "puzzles": [
        {
            "id": "take-royal-seal",
            "trigger": {"verb": "take", "subject": "royal-seal"},
            "conditions": [{"type": "item-not-taken", "item": "royal-seal"}],
            "actions": [
                {"type": "add-item", "item": "royal-seal"},
                {"type": "narrator-say", "text": "You pocket the royal seal. Technically, this is treason. But technically, there's no king to commit treason against. Loopholes are wonderful things."}
            ],
            "once": true
        },
        {
            "id": "use-seal-on-decree",
            "trigger": {"verb": "use", "subject": "royal-seal", "target": "blank-decree"},
            "conditions": [
                {"type": "has-item", "item": "royal-seal"},
                {"type": "has-item", "item": "blank-decree"},
                {"type": "flag-not-set", "flag": "decree-sealed"}
            ],
            "actions": [
                {"type": "set-flag", "flag": "decree-sealed"},
                {"type": "remove-item", "item": "royal-seal"},
                {"type": "remove-item", "item": "blank-decree"},
                {"type": "add-item", "item": "sealed-decree"},
                {"type": "narrator-say", "text": "You press the seal into the wax with satisfying authority. The decree now bears the royal crest. You've just forged a royal document. Your mother would be so disappointed."}
            ],
            "once": true
        }
    ],
    "deathTriggers": [
        {
            "id": "sit-on-broken-throne",
            "trigger": {"verb": "use", "subject": "throne"},
            "conditions": [{"type": "flag-set", "flag": "throne-weakened"}],
            "actions": [{"type": "trigger-death", "deathId": "throne-collapse"}]
        }
    ],
    "deaths": {
        "throne-collapse": {
            "title": "Death by Ambition",
            "narratorText": "You sit on the throne a second time. This time, it doesn't just creak -- it collapses entirely, taking you and several centuries of termite damage down with it. On the bright side, you died doing what you loved: making terrible decisions."
        }
    },
    "dynamicDescriptions": {
        "decree-sealed": "The throne room feels emptier now that you've taken the royal seal. The portrait of the last king seems to be judging you slightly less than before. Progress."
    },
    "npcs": [
        {
            "id": "ghost_king",
            "position": {"x": 480, "y": 360},
            "interactionPoint": {"x": 450, "y": 430},
            "zone": {"x": 460, "y": 330, "width": 40, "height": 80},
            "conditions": [{"type": "flag-set", "flag": "used-spirit-glass"}]
        }
    ],
    "audio": {
        "music": "music-castle",
        "ambient": [
            {"key": "amb-wind-drafty", "volume": 0.4},
            {"key": "amb-creaking", "volume": 0.2}
        ]
    },
    "playerSpawn": {"x": 120, "y": 450}
}
```

### Complete Ink Dialogue Script (Production Quality)

```ink
EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_ghost_king"):
    {getDeathCount() > 5:
        You again. At this rate, you'll be joining me permanently soon enough. #speaker:Ghost King #emotion:amused
    - else:
        Ah, the living one returns. How... persistent of you. #speaker:Ghost King
    }
- else:
    A ghost materializes on the throne. He looks exactly like the portrait, but more translucent and considerably more irritated. #speaker:Ghost King #emotion:annoyed
    ~ setFlag("met_ghost_king")
    Who dares disturb my eternal sulking?
}

What do you seek, mortal?
+ [Ask about the kingdom] -> kingdom_info
+ [Ask about the curse] -> curse_info
+ {hasItem("sealed-decree")} [Show the sealed decree] -> decree_reaction
+ {hasFlag("knows_about_artifact")} [Ask about the Crystal of Mundanity] -> artifact_details
+ [Leave] -> farewell

=== kingdom_info ===
This kingdom fell to a curse, which I'm sure surprises absolutely no one. #speaker:Ghost King
Every kingdom falls to a curse eventually. It's practically a tradition.
~ setFlag("knows_kingdom_history")
-> greeting

=== curse_info ===
{hasFlag("knows_kingdom_history"):
    The curse was placed by a wizard who was denied a parking spot at the royal feast. #speaker:Ghost King #emotion:serious
    I wish I were joking. I am not.
    The only way to break it is the Crystal of Mundanity. Yes, that's its real name.
    ~ setFlag("knows_about_artifact")
- else:
    You want to know about the curse? Ask me about the kingdom first. Context matters, even to ghosts. #speaker:Ghost King
}
-> greeting

=== decree_reaction ===
*The ghost king's eyes widen* #speaker:Ghost King #emotion:surprised
You... you sealed a decree with my seal? That's either brilliant or treasonous.
Since I'm dead, let's call it brilliant.
That decree will get you past the castle guards. They're bound to obey any document bearing the royal crest.
Even a forged one. Especially a forged one, honestly.
~ setFlag("ghost_approved_decree")
-> greeting

=== artifact_details ===
The Crystal of Mundanity sits in the Screaming Caverns, guarded by a test of... bureaucracy. #speaker:Ghost King #emotion:melancholy
I'm not making this up. The ancient guardians loved paperwork.
You'll need that sealed decree and a healthy tolerance for standing in line.
~ setFlag("knows_artifact_location")
-> greeting

=== farewell ===
Go then. Try not to die on the way out. #speaker:Ghost King #emotion:dismissive
*pause*
Actually, do die. I could use the company.
-> END
```

### Narrator History Ink Pattern (Expanded)

```ink
EXTERNAL hasFlag(flagName)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== room_commentary ===
// Death-count based commentary
{getDeathCount() > 10:
    You've died {getDeathCount()} times. At this point, the afterlife has a revolving door with your name on it.
- else:
    {getDeathCount() > 5:
        Death number {getDeathCount()}. You're really building quite the resume.
    }
}

// Act progression commentary
{hasFlag("decree_sealed") && hasFlag("ghost_approved_decree"):
    Armed with forged royal documents and a ghost's blessing. Your quest has taken a bureaucratic turn.
- else:
    {hasFlag("met_ghost_king"):
        The ghost king's words echo in your mind. Mostly the unhelpful ones.
    }
}

// Area-based commentary
{visitedRoom("throne_room") && visitedRoom("castle_hallway") && visitedRoom("castle_courtyard"):
    You've explored most of the castle. The architecture is as questionable as the king's taste in furniture.
}
-> END
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-drawn pixel art for all backgrounds | AI-generated via Flux + manual touch-up | 2024-2025 | 30-40 backgrounds feasible for small team |
| Hardcoded dialogue in game scripts | Ink language with compiled JSON | 2015+ | Non-programmers can author dialogue; state management built in |
| Linear puzzle chains | Diamond-shaped dependency graphs | 1990s (LucasArts) | Prevents boredom, enables parallel exploration |
| Unwinnable states as "challenge" | LucasArts philosophy: never punish exploration | 1990s | Modern players expect fairness; deaths are comedy, not punishment |
| Single upfront asset load | Area-based loading groups | Ongoing | Necessary once room count exceeds 10-15 |

## Open Questions

1. **Art pipeline quality validation**
   - What we know: mflux can generate images on Apple Silicon; Retro Diffusion specializes in pixel art on Flux architecture
   - What's unclear: Whether mflux with standard Flux/Z-Image models produces good enough pixel art, or whether Retro Diffusion's specialized model is needed
   - Recommendation: Generate 3-5 test backgrounds with mflux before committing to the full pipeline. If quality is insufficient, evaluate Retro Diffusion API or manual touch-up workflow

2. **Preloader scaling strategy**
   - What we know: Current Preloader loads all assets upfront (fine for 3 rooms)
   - What's unclear: Whether 30-40 rooms worth of assets causes unacceptable load times
   - Recommendation: Start with upfront loading. If load exceeds 10 seconds, implement area-based lazy loading as a separate task. Pixel art backgrounds are small (10-100KB each) so this may not be an issue.

3. **Background art layer strategy**
   - What we know: Current rooms use 4 shared parallax layers (sky, mountains, trees, ground)
   - What's unclear: Whether production rooms should have unique per-room backgrounds or continue sharing layers
   - Recommendation: Production rooms should have unique single-layer backgrounds (960x540 or 1920x540) rather than shared parallax layers. Parallax is impressive but multiplies art production by 3-4x per room. Reserve parallax for key establishing shots.

4. **Audio asset production**
   - What we know: Placeholder WAVs exist from Python generation script
   - What's unclear: Source for production-quality music and ambient audio
   - Recommendation: Use AI music generation tools or royalty-free chiptune/ambient libraries. Audio quality matters less than content volume for this genre. The existing placeholder audio generation script can be extended.

## Sources

### Primary (HIGH confidence)
- Engine source code: `src/game/types/RoomData.ts`, `PuzzleData.ts`, `ItemData.ts`, `NpcData.ts`, `GameAction.ts`, `GameStateTypes.ts` -- complete type definitions for all content formats
- Engine source code: `src/game/scenes/RoomScene.ts`, `systems/CommandDispatcher.ts`, `dialogue/DialogueManager.ts` -- complete content loading and evaluation pipeline
- Existing room JSONs: `public/assets/data/rooms/*.json` -- working examples of all content formats
- Existing ink scripts: `public/assets/data/ink-source/*.ink` -- working dialogue authoring patterns

### Secondary (MEDIUM confidence)
- [Ron Gilbert - Puzzle Dependency Charts](https://grumpygamer.com/puzzle_dependency_charts/) -- foundational adventure game design methodology
- [King's Quest Omnipedia - Puzzle Statistics](https://kingsquest.fandom.com/wiki/Puzzle_statistics) -- genre scope benchmarks
- [mflux GitHub](https://github.com/filipstrand/mflux) -- local Flux image generation on Apple Silicon
- [Retro Diffusion - Pixel Art AI](https://runware.ai/blog/retro-diffusion-creating-authentic-pixel-art-with-ai-at-scale) -- FLUX-based pixel art generation
- [Gamedeveloper.com - Puzzle Dependency Graph Primer](https://www.gamedeveloper.com/design/puzzle-dependency-graph-primer) -- practical puzzle design methodology
- [inkle - Writing with Ink](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) -- ink language reference

### Tertiary (LOW confidence)
- Content scope estimates (rooms per hour, items per act) -- extrapolated from genre analysis, not verified against specific modern titles
- mflux pixel art quality -- untested for this specific use case; needs validation

## Metadata

**Confidence breakdown:**
- Engine data formats: HIGH -- complete source code analysis, all types documented
- Content authoring patterns: HIGH -- well-established adventure game design methodology
- Scope estimation: MEDIUM -- based on genre analysis, actual numbers depend on story design
- Art pipeline: MEDIUM -- mflux is proven but pixel art quality unvalidated for this project
- Audio pipeline: LOW -- no specific tooling decision made yet

**Research date:** 2026-02-21
**Valid until:** Indefinite for engine formats (locked); 30 days for art pipeline (fast-moving)
