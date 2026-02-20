# Feature Research

**Domain:** Browser-based King's Quest-style graphic adventure game with LLM-powered text parser
**Researched:** 2026-02-20
**Confidence:** HIGH (core adventure game features are well-documented; LLM integration patterns are MEDIUM confidence)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Scene rendering with pixel art backgrounds** | Defines the genre visually; players expect illustrated rooms to explore | HIGH | Each scene needs a unique background. Flux-generated art must be consistent in style across all scenes. Budget ~40-60 scenes for 5 hours of gameplay |
| **Animated player character with movement** | A static character feels broken. Walking animation across the scene is the most basic interaction | MEDIUM | Minimum: 4-frame walk cycle in 4 directions, idle animation, and a few interaction poses. Sprite sheet at ~20 FPS |
| **Text input parser** | Defines this as a "parser" adventure vs point-and-click. The core interaction model | HIGH | LLM-powered parser is the project's central innovation. Must handle "get rock", "use key on door", "talk to wizard", and natural language variants |
| **Inventory system** | Inventory puzzles are the backbone of adventure games. Without inventory, there are no puzzles | MEDIUM | Visual inventory panel showing collected items. Must support: pick up, examine, use on scene object, combine two items. Classic grid or list UI |
| **Room/scene navigation** | Players must be able to move between connected locations. This is how exploration works | MEDIUM | Scene graph connecting rooms with exits (north, south, enter door, etc.). Must be clear which exits exist. Character walks to edge and transitions |
| **Scene descriptions and "look" command** | Players type "look" and expect to learn about their surroundings. Fundamental to text parser games | LOW | LLM generates contextual descriptions based on scene state. Must reflect items already taken, NPCs present, and puzzle state |
| **Object interaction (examine, take, use)** | Core verbs. Players expect to examine anything interesting, take portable objects, and use items on things | MEDIUM | Each scene needs interactable objects with examine text, take behavior, and use-on logic. LLM handles natural language mapping to these actions |
| **NPC dialogue** | Adventure games need characters to talk to. Information gathering, humor, and story delivery all happen through dialogue | HIGH | NPCs respond to player text input. LLM generates in-character responses. Must stay on-script for puzzle-critical information while being flexible for flavor |
| **Save/load system** | Players will close the browser tab. Losing hours of progress is unacceptable | MEDIUM | localStorage or IndexedDB. Save full game state: current scene, inventory, puzzle flags, NPC states. Support multiple save slots. Auto-save per room |
| **Death sequences with safe reset** | This IS King's Quest. Frequent deaths are a feature, not a bug. The project description explicitly calls this out | MEDIUM | Narrator delivers a humorous death message. Player resets to last safe state (auto-save before the deadly action). No progress lost beyond the current room |
| **Story arc (beginning, middle, end)** | Players expect a complete narrative. A sandbox with no ending feels unfinished | HIGH | Content creation is the bottleneck, not tech. Needs written story outline, scene-by-scene puzzle flow, and satisfying conclusion. ~5 hours = massive scope |
| **Narrator text output** | The narrator IS the game's voice. All scene descriptions, responses, and death messages flow through the narrator | MEDIUM | Dark comedy tone. LLM generates narrator text with consistent personality. System prompt defines voice: sarcastic, literary, mocking-but-affectionate (Space Quest / Stanley Parable style) |
| **Sound effects and ambient audio** | Silent games feel eerie in a bad way. Ambient sound grounds the player in the scene | MEDIUM | Per-scene ambient loops (forest sounds, dungeon drips, tavern murmur). Interaction SFX (pickup, door open, death sting). Web Audio API handles layering and crossfades |
| **Background music** | Sets mood and signals scene changes. Players notice its absence more than its presence | MEDIUM | Looping tracks per area (town, forest, dungeon, castle). Crossfade on scene transition. Can be procedural/generated or licensed royalty-free chiptune |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **LLM-powered natural language parser (Ollama)** | Unlike classic parsers that reject "I don't understand that", the LLM understands intent from free-form English. "Maybe I should try picking up that shiny thing" works as well as "get gem". This is THE differentiator | HIGH | Ollama runs locally. Parser must: (1) extract intent from natural language, (2) map to game actions, (3) handle ambiguity gracefully, (4) reject impossible actions with in-character narrator responses. Latency target: <2 seconds per input |
| **Dynamic narrator personality** | Instead of static text, the narrator reacts to player behavior patterns. Repeat a dumb action? Narrator gets increasingly exasperated. Try something creative? Narrator is impressed. This creates emergent comedy | HIGH | LLM generates narrator responses conditioned on action history. System prompt defines personality. Must maintain consistency across sessions. Track "relationship" state with player |
| **Death collection/gallery** | Transform deaths from punishment into collectibles. Track unique death types, display them in a gallery. Encourages exploration of failure states | LOW | Simple counter + description storage. UI page showing discovered deaths with thumbnails and narrator quips. "You've found 23 of 47 ways to die!" |
| **Inventory combination puzzles** | Combining two inventory items to create a third. Classic King's Quest mechanic but rare in modern games. Satisfying "aha!" moments | MEDIUM | Needs combination recipe system. LLM can hint at possible combinations through narrator. "Those two items seem like they'd get along." Must avoid moon logic -- combinations should be intuitive |
| **Conversation puzzles** | Must say the right thing to an NPC to progress. Not just "exhaust all dialogue options" but actual puzzle-solving through word choice | HIGH | LLM evaluates whether player's dialogue achieves the puzzle goal (persuade, deceive, extract information). Hard to get right: must be fair but not trivial. Needs clear success/failure signals |
| **Contextual narrator responses for "wrong" actions** | Instead of "You can't do that", the narrator roasts you. "You try to eat the door. The door is unimpressed. So am I." Every failed action becomes entertainment | MEDIUM | LLM generates unique rejection text based on the specific ridiculous action attempted. Must not repeat. Huge replay value and screenshot/share potential |
| **Adaptive hint system via narrator** | When player is stuck, narrator gradually provides hints in-character. "You seem lost. Perhaps the answer is staring you in the face... literally." Escalates from vague to specific | MEDIUM | Track time-since-last-progress and failed-action-count per puzzle. LLM generates hints at 3 tiers: vague nudge, moderate pointer, near-explicit. Stays in narrator voice throughout |
| **Scene art generated by Flux** | AI-generated pixel art gives unique visual identity and enables rapid content creation. Each scene is visually distinct without requiring a dedicated artist | HIGH | Flux model generates scene backgrounds. Challenge: style consistency across 40-60 scenes. Needs careful prompt engineering and possibly post-processing. This is a production pipeline, not a runtime feature |
| **Easter eggs and hidden interactions** | Reward players for trying absurd things. Type "xyzzy" and get a response. Try to "dance" in every room. Secret areas | LOW | LLM naturally handles unexpected input. Curate a list of easter egg triggers with special responses. Low effort, high delight |
| **Examine-everything depth** | Every visible object in a scene has a unique, witty examine response. Players who examine the mundane are rewarded with humor | MEDIUM | Increases content volume significantly but the LLM can assist. Each scene needs an object list with examine text (or LLM generation guidelines). The narrator voice makes even "It's a rock" funny |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Fully procedural/generated story** | "Let the LLM write the whole game!" Seems like it would enable infinite content | LLMs produce inconsistent, incoherent narratives over long sessions. AI Dungeon proved this: 40% state error rate per turn compounds catastrophically. Puzzles require authored logic; generated puzzles are either trivial or unsolvable. 5 hours of authored content beats 50 hours of mush | **Author the story, puzzles, and scene graph by hand. Use LLM for parser, narrator voice, and dynamic flavor text only.** The LLM enhances authored content; it does not replace it |
| **Multiplayer/co-op** | "Adventure games with friends!" Social gaming is trendy | Massively increases complexity (state sync, turn order, shared inventory). Adventure games are inherently single-player pacing experiences. Conversation puzzles become chaos with multiple inputs. The narrator voice works because it addresses ONE player | **Single-player only.** Share the experience by watching someone play or sharing death galleries |
| **Open world / non-linear exploration** | "Let me go anywhere!" Modern game expectations | Adventure games need gating to prevent sequence-breaking puzzles. A fully open world means every puzzle must account for any inventory state. King's Quest games were "open" but carefully gated by item requirements. Untested state combinations create bugs | **Semi-linear structure with hub-and-spoke areas.** Each chapter opens a new hub with multiple rooms to explore, but chapters are sequential. Within a hub, exploration order is flexible |
| **Voice acting / text-to-speech** | "Modern games have voice acting!" Feels more polished | Enormous production cost for 5 hours of content. TTS sounds uncanny and undermines the dark comedy tone. The narrator's voice works better in the player's head, like reading a novel. Text lets players read at their own pace | **Text-only with excellent typography.** Use a typewriter-style text reveal animation. The narrator text IS the voice. Invest in writing quality, not audio quality |
| **Combat system** | "King's Quest had some action sequences!" True but they were universally hated | Combat is antithetical to the cerebral puzzle-solving that makes adventure games work. It requires entirely separate game mechanics (health, damage, reflexes). Every dev hour on combat is an hour stolen from puzzles and narrative | **Replace combat with clever puzzle encounters.** Boss encounters are conversation puzzles or logic puzzles, not reflex tests. A dragon is defeated by wit, not swordplay |
| **Crafting system** | "Inventory combinations = crafting!" Similar mechanics surface-level | Crafting implies grinding, resource gathering, and dozens of recipes. Adventure game item combinations are authored puzzle solutions, not a system. Crafting dilutes the "aha!" moment into busywork | **Authored inventory combinations only.** Each combination is a specific puzzle solution, not a generalizable system. Maybe 10-15 unique combinations total across the game |
| **Branching storylines with multiple endings** | "Player choice matters!" Narrative games often feature this | Multiplies content by the number of branches. For a 5-hour game, 3 endings means essentially writing 3 games. Branching early creates exponential complexity. Testing all paths is a nightmare | **Single main story with minor variations.** Narrator acknowledges player choices and style. Maybe one "good" ending and one "bad" ending based on a simple virtue score (did you steal things, did you help people). Not a branching tree |
| **Real-time elements / timed puzzles** | "Add urgency!" Some Sierra games had timed sequences | Timed puzzles in text-input games are hostile. Players can't type fast enough. LLM response latency adds to pressure unfairly. Accessibility nightmare. Frustration, not fun | **No real-time pressure.** The game waits for the player. Urgency comes from narrative tension ("The dragon is waking up!") not actual timers |
| **Point-and-click interface alongside text parser** | "Why not both?" Seems like it adds accessibility | Maintaining two input systems doubles UI complexity and testing surface. Point-and-click undermines the LLM parser differentiator -- players will default to clicking, never experiencing the natural language magic. Verb coins and context menus add visual clutter | **Text parser only, with clickable scene objects as shortcuts.** Clicking an object types "examine [object]" into the parser. This teaches the parser vocabulary without replacing it |
| **Procedural NPC dialogue** | "NPCs should talk about anything!" Infinite conversation seems cool | NPCs that can discuss anything discuss nothing well. Players probe boundaries, find hallucinations, break immersion. Key information gets lost in chatter. NPC "personality" drifts across conversations | **Authored NPC dialogue trees with LLM flavor.** Each NPC has scripted knowledge and puzzle-critical lines. LLM adds natural language variation to delivery, handles off-topic questions with in-character deflections ("I don't want to talk about that. Have you seen the fountain?") |

## Feature Dependencies

```
[Scene Rendering]
    |--requires--> [Scene Art Pipeline (Flux)]
    |--requires--> [Scene Graph / Room Navigation]

[Text Input Parser (LLM)]
    |--requires--> [Ollama Local Setup]
    |--requires--> [Game State Manager]
    |--enables---> [Object Interaction]
    |--enables---> [NPC Dialogue]
    |--enables---> [Conversation Puzzles]
    |--enables---> [Contextual Narrator Responses]

[Inventory System]
    |--requires--> [Object Interaction (take)]
    |--enables---> [Inventory Combination Puzzles]
    |--enables---> [Use Item on Scene Object]

[Death Sequences]
    |--requires--> [Save/Load System (auto-save)]
    |--requires--> [Narrator Text Output]
    |--enables---> [Death Collection Gallery]

[NPC Dialogue]
    |--requires--> [Text Input Parser]
    |--requires--> [Game State Manager]
    |--enables---> [Conversation Puzzles]

[Adaptive Hint System]
    |--requires--> [Narrator Text Output]
    |--requires--> [Puzzle State Tracking]
    |--requires--> [Progress Timer]

[Story Arc]
    |--requires--> [Scene Graph]
    |--requires--> [All Puzzle Systems]
    |--requires--> [Scene Art for all locations]

[Sound/Music]
    |--independent (can be layered in at any phase)
```

### Dependency Notes

- **Text Parser requires Ollama**: The entire input pipeline depends on the LLM being available and responsive. If Ollama is down, the game is unplayable. Need a graceful fallback or clear error state.
- **Inventory requires Object Interaction**: Players must be able to "take" things before inventory matters. Object interaction is the foundation.
- **Death Sequences require Auto-Save**: Without auto-save, frequent deaths become punishment instead of comedy. The save system must be rock-solid before deaths are fun.
- **Conversation Puzzles require both NPC Dialogue and Parser**: These are the hardest feature to get right because they depend on LLM understanding intent AND matching it against puzzle requirements.
- **Story Arc requires everything else**: Content creation is last-mile. All systems must be working before you can author the full game.
- **Sound/Music is independent**: Can be added at any phase without blocking or being blocked. Good candidate for "polish" phase.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept.

- [ ] **Scene rendering with 3-5 rooms** -- Enough to prove the visual pipeline works
- [ ] **Text parser with LLM (Ollama)** -- THE core innovation. Must work for basic verbs: look, take, use, go, talk
- [ ] **Inventory system (take, examine, use)** -- At least one inventory puzzle solvable
- [ ] **Narrator with consistent dark comedy voice** -- System prompt nailed down, generating witty responses
- [ ] **One complete puzzle chain** -- Item A + Item B solves obstacle, leading to new area
- [ ] **One death sequence with auto-save reset** -- Prove the death-as-comedy loop works
- [ ] **Scene navigation between rooms** -- Walk to exits, transition to connected rooms
- [ ] **Basic save/load (localStorage)** -- Don't lose progress on refresh

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **NPC dialogue with 2-3 characters** -- Trigger: core parser loop is fun and responsive
- [ ] **Inventory combination puzzles** -- Trigger: basic inventory works smoothly
- [ ] **Death collection gallery** -- Trigger: multiple death types exist and are funny
- [ ] **Adaptive hint system** -- Trigger: playtesters get stuck (they will)
- [ ] **Sound effects and ambient audio** -- Trigger: visual experience feels empty
- [ ] **Background music** -- Trigger: sound effects are in place
- [ ] **Contextual narrator roasts for wrong actions** -- Trigger: players are typing creative nonsense

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Full 5-hour story with 40-60 scenes** -- Defer because content authoring is the slowest bottleneck. Validate the engine first with a short demo (30-60 minutes)
- [ ] **Conversation puzzles** -- Defer because these are the hardest LLM feature. Get basic NPC dialogue right first
- [ ] **Easter eggs and hidden interactions** -- Defer because these are dessert, not dinner
- [ ] **Multiple save slots** -- Defer because localStorage single-slot works for MVP
- [ ] **Scene art style consistency pass** -- Defer because early Flux output will be inconsistent; batch-fix later

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Text parser (LLM) | HIGH | HIGH | P1 |
| Scene rendering | HIGH | HIGH | P1 |
| Inventory system | HIGH | MEDIUM | P1 |
| Scene navigation | HIGH | MEDIUM | P1 |
| Narrator voice | HIGH | MEDIUM | P1 |
| Save/load | HIGH | LOW | P1 |
| Death sequences + reset | HIGH | MEDIUM | P1 |
| Object interaction | HIGH | MEDIUM | P1 |
| Story arc (full game) | HIGH | VERY HIGH | P1 (but phased) |
| NPC dialogue | HIGH | HIGH | P2 |
| Sound effects | MEDIUM | MEDIUM | P2 |
| Background music | MEDIUM | MEDIUM | P2 |
| Inventory combinations | MEDIUM | MEDIUM | P2 |
| Adaptive hint system | MEDIUM | MEDIUM | P2 |
| Death gallery | MEDIUM | LOW | P2 |
| Contextual wrong-action responses | MEDIUM | LOW | P2 |
| Conversation puzzles | MEDIUM | HIGH | P3 |
| Easter eggs | LOW | LOW | P3 |
| Examine-everything depth | MEDIUM | HIGH (content) | P3 |
| Flux art pipeline (full game) | HIGH | HIGH | P3 (scales with content) |

**Priority key:**
- P1: Must have for launch (playable demo)
- P2: Should have, add when possible (complete experience)
- P3: Nice to have, future consideration (polish and scale)

## Competitor Feature Analysis

| Feature | King's Quest (Sierra, 1984-1998) | Thimbleweed Park (2017) | AI Dungeon (2019-present) | Intra (2025) | Our Approach |
|---------|----------------------------------|------------------------|---------------------------|--------------|--------------|
| Input method | Text parser (early) / Point-and-click (later) | Point-and-click with verb bar | Free text to LLM | Free text to LLM | Free text to LLM via Ollama (local) |
| Puzzle style | Inventory, environment, some logic | Inventory, dialogue, logic | None (freeform narrative) | Action resolution with difficulty | Inventory, dialogue, logic, and NPC conversation |
| Death mechanic | Frequent, often unfair, sometimes funny | Rare (LucasArts philosophy) | N/A (narrative continues) | N/A | Frequent, always funny, always safe reset (best of Sierra + modern fairness) |
| Narrator | Text descriptions, sometimes snarky (Space Quest) | Fully voiced narrator | LLM-generated narration | LLM-generated narration | LLM-generated dark comedy narrator (Space Quest meets Stanley Parable) |
| Art style | Pixel art (EGA/VGA era) | High-res pixel art | Text only | Text only | Flux-generated pixel art backgrounds + sprite character |
| Story structure | Linear with open exploration zones | Linear with parallel puzzles | Procedural/emergent (incoherent) | Semi-structured emergent | Authored linear story with hub-and-spoke exploration per chapter |
| NPC interaction | Limited keyword-based | Dialogue trees | Freeform LLM chat | Freeform with NPC perspectives | Authored knowledge + LLM natural language delivery |
| Save system | Manual save anywhere | Auto-save + manual | Cloud persistence | Session-based | Auto-save per room + manual slots |
| Hint system | None (call the Sierra hint line!) | None built-in | N/A | N/A | Adaptive in-character narrator hints |
| Sound/Music | MIDI music, basic SFX | Full soundtrack + voice | None | None | Ambient audio + chiptune music, no voice acting |

## Sources

- [Intra: Design notes on an LLM-driven text adventure](https://ianbicking.org/blog/2025/07/intra-llm-text-adventure) -- MEDIUM confidence (single developer's experience, but detailed and recent)
- [Sierra Deaths Were Great (and How to Make Them Greater)](https://slattstudio.com/2021/02/09/sierra-deaths-were-great-and-how-to-make-them-greater/) -- MEDIUM confidence (game design blog with specific recommendations)
- [How to Design Brillo Point and Click Adventure Game Puzzles](https://www.gamedeveloper.com/design/how-to-design-brillo-point-and-click-adventure-game-puzzles) -- MEDIUM confidence (Gamasutra/Game Developer, established industry source)
- [5 Graphic Adventure Game Goofs (and How to Fix Them)](https://www.gamedeveloper.com/design/5-graphic-adventure-game-goofs-and-how-to-fix-them-) -- MEDIUM confidence (industry publication)
- [Thimbleweed Park Blog: Dialog Puzzles](https://blog.thimbleweedpark.com/dialog_puzzles.html) -- HIGH confidence (Ron Gilbert, legendary adventure game designer)
- [King's Quest - Wikipedia](https://en.wikipedia.org/wiki/King's_Quest) -- HIGH confidence (factual series information)
- [10 Most Hilarious Deaths From Classic Sierra Adventure Games](https://www.thegamer.com/sierra-adventure-games-funniest-deaths/) -- LOW confidence (listicle, but useful examples)
- [Great moments in PC gaming: Dying in Sierra adventure games](https://www.pcgamer.com/great-moments-in-pc-gaming-dying-in-sierra-adventure-games/) -- MEDIUM confidence (PC Gamer, established outlet)
- [Audio for Web games - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) -- HIGH confidence (Mozilla official documentation)
- [Adventure Game Puzzle Design Feature](http://www.adventureclassicgaming.com/index.php/site/features/423/) -- MEDIUM confidence (niche but dedicated adventure game publication)
- [TextQuests: How Good are LLMs at Text-Based Video Games?](https://huggingface.co/blog/textquests) -- MEDIUM confidence (Hugging Face research blog)
- [Branching Conversation Systems and the Working Writer](https://www.gamedeveloper.com/design/branching-conversation-systems-and-the-working-writer-part-1-introduction) -- MEDIUM confidence (Game Developer industry publication)

---
*Feature research for: Browser-based King's Quest-style adventure game with LLM text parser*
*Researched: 2026-02-20*
