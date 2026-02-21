# Requirements: KQGame

**Defined:** 2026-02-20
**Core Value:** The text parser must feel magical -- players type natural language commands and the game understands them, creating that classic adventure game feeling of conversing with a world.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Game Engine

- [x] **ENG-01**: Game renders pixel art scene backgrounds on HTML5 Canvas at consistent resolution
- [x] **ENG-02**: Player character displays with walk cycle animation and interaction poses
- [x] **ENG-03**: Player moves to clicked location via pathfinding over walkable areas
- [x] **ENG-04**: Scenes have defined exits that transition to other scenes
- [x] **ENG-05**: Scene transitions use fade/slide animations between rooms
- [x] **ENG-06**: Assets preload with a loading screen before gameplay starts
- [x] **ENG-07**: Scenes support parallax scrolling backgrounds for depth
- [x] **ENG-08**: Game loop runs at consistent frame rate via requestAnimationFrame

### Text Parser

- [x] **PARSE-01**: Player can type natural language commands in a text input bar
- [x] **PARSE-02**: Keyword/regex fallback parser handles standard verbs (look, take, use, go, talk, open, push, pull) without LLM
- [ ] **PARSE-03**: LLM parser (Ollama) interprets ambiguous/complex natural language into structured game actions
- [ ] **PARSE-04**: Hybrid parser uses regex for simple commands and LLM for complex/ambiguous input
- [ ] **PARSE-05**: LLM prompt includes current scene context, inventory, and nearby objects for accurate parsing
- [ ] **PARSE-06**: Parser response time is under 2 seconds for LLM path, instant for regex path
- [x] **PARSE-07**: Game remains fully playable if Ollama is unavailable (graceful fallback)

### Inventory & Items

- [x] **INV-01**: Player can pick up items from scenes and add them to inventory
- [x] **INV-02**: Player can examine items in inventory to read descriptions
- [x] **INV-03**: Player can use inventory items on scene hotspots
- [x] **INV-04**: Player can combine two inventory items to create new items
- [x] **INV-05**: Inventory panel displays all held items visually

### Puzzles

- [x] **PUZ-01**: Inventory combination puzzles -- combine or use items to solve problems
- [x] **PUZ-02**: Environmental/logic puzzles -- observe patterns, manipulate scene elements
- [ ] **PUZ-03**: Conversation-based puzzles -- gather info from NPCs, persuade, negotiate
- [x] **PUZ-04**: All puzzles defined in data files (JSON), not hardcoded in engine
- [x] **PUZ-05**: Puzzle condition/action system evaluates game state flags and triggers results
- [ ] **PUZ-06**: Puzzles advance the story and connect to player goals (no arbitrary filler)
- [x] **PUZ-07**: Every puzzle has a logical solution that feels inevitable in hindsight

### Narrative & Story

- [ ] **NARR-01**: Complete fantasy adventure story with beginning, middle, and satisfying end
- [ ] **NARR-02**: Story provides ~5 hours of gameplay content across multiple acts
- [x] **NARR-03**: Dark comedy narrator provides sardonic commentary throughout
- [x] **NARR-04**: Narrator text displays with typewriter effect in dialogue box
- [x] **NARR-05**: Scene descriptions available via "look" command
- [ ] **NARR-06**: Narrator references past events and player actions (dynamic personality)
- [ ] **NARR-07**: Narrative scripted with inkjs for complex branching dialogue and story state

### NPCs & Dialogue

- [ ] **NPC-01**: NPCs exist in scenes with authored knowledge and personalities
- [ ] **NPC-02**: Player can talk to NPCs via text commands
- [ ] **NPC-03**: NPC dialogue supports branching conversation trees
- [ ] **NPC-04**: NPCs provide information, hints, and advance the plot

### Death System

- [x] **DEATH-01**: Frequent death scenarios triggered by specific player actions
- [x] **DEATH-02**: Each death has a unique, funny narrator commentary (dark comedy)
- [x] **DEATH-03**: Game auto-saves on every room transition
- [x] **DEATH-04**: Death instantly resets to last auto-save -- no progress lost beyond current room
- [x] **DEATH-05**: Player can never reach an unwinnable game state ("dead man walking" prevention)

### Audio

- [ ] **AUD-01**: Sound effects play for player interactions (item pickup, door open, etc.)
- [ ] **AUD-02**: Background music plays per scene or area
- [ ] **AUD-03**: Ambient audio creates atmosphere (forest sounds, wind, etc.)
- [ ] **AUD-04**: Music transitions smoothly between scenes

### Save/Load & UI

- [x] **UI-01**: Multiple save slots for manual saving
- [x] **UI-02**: Auto-save on room transitions (separate from manual saves)
- [x] **UI-03**: Text input command bar always visible during gameplay
- [x] **UI-04**: Dialogue/narrator text box displays text with clear formatting
- [x] **UI-05**: Main menu with new game, load game, and settings
- [x] **UI-06**: Death screen overlay with narrator text and retry option

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Features

- **V2-01**: Progressive hint system -- narrator gives escalating hints when player is stuck
- **V2-02**: Death gallery -- collectible achievement for each discovered death
- **V2-03**: Export/import save files for sharing between devices
- **V2-04**: Mobile-responsive layout with virtual keyboard
- **V2-05**: Narrator voice synthesis (text-to-speech)
- **V2-06**: Multiple endings based on player choices

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiplayer | Single-player adventure game -- multiplayer adds complexity with no value |
| Cloud LLM APIs (OpenAI, Claude) | Must work entirely locally -- no API keys, no internet needed |
| Combat system | Adventure game -- puzzles and exploration, not fighting |
| Procedural story generation | LLMs produce incoherent narratives over long sessions -- authored story only |
| Mobile native app | Browser-first; mobile web can work with v2 responsive layout |
| Real-time elements | Adventure games use "Hollywood time" -- no timed puzzles or action sequences |
| Voice acting | Text and narrator only for v1 |
| Desktop packaging (Electron) | Unnecessary -- browser works everywhere |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENG-01 | Phase 1 | Complete |
| ENG-02 | Phase 2 | Complete |
| ENG-03 | Phase 2 | Complete |
| ENG-04 | Phase 2 | Complete |
| ENG-05 | Phase 2 | Complete |
| ENG-06 | Phase 1 | Complete |
| ENG-07 | Phase 1 | Complete |
| ENG-08 | Phase 1 | Complete |
| PARSE-01 | Phase 3 | Complete |
| PARSE-02 | Phase 3 | Complete |
| PARSE-03 | Phase 5 | Pending |
| PARSE-04 | Phase 5 | Pending |
| PARSE-05 | Phase 5 | Pending |
| PARSE-06 | Phase 5 | Pending |
| PARSE-07 | Phase 3 | Complete |
| INV-01 | Phase 4 | Complete |
| INV-02 | Phase 4 | Complete |
| INV-03 | Phase 4 | Complete |
| INV-04 | Phase 4 | Complete |
| INV-05 | Phase 4 | Complete |
| PUZ-01 | Phase 4 | Complete |
| PUZ-02 | Phase 4 | Complete |
| PUZ-03 | Phase 6 | Pending |
| PUZ-04 | Phase 4 | Complete |
| PUZ-05 | Phase 4 | Complete |
| PUZ-06 | Phase 6 | Pending |
| PUZ-07 | Phase 4 | Complete |
| NARR-01 | Phase 8 | Pending |
| NARR-02 | Phase 8 | Pending |
| NARR-03 | Phase 4 | Complete |
| NARR-04 | Phase 4 | Complete |
| NARR-05 | Phase 4 | Complete |
| NARR-06 | Phase 6 | Pending |
| NARR-07 | Phase 6 | Pending |
| NPC-01 | Phase 6 | Pending |
| NPC-02 | Phase 6 | Pending |
| NPC-03 | Phase 6 | Pending |
| NPC-04 | Phase 6 | Pending |
| DEATH-01 | Phase 4 | Complete |
| DEATH-02 | Phase 4 | Complete |
| DEATH-03 | Phase 4 | Complete |
| DEATH-04 | Phase 4 | Complete |
| DEATH-05 | Phase 4 | Complete |
| AUD-01 | Phase 7 | Pending |
| AUD-02 | Phase 7 | Pending |
| AUD-03 | Phase 7 | Pending |
| AUD-04 | Phase 7 | Pending |
| UI-01 | Phase 4 | Complete |
| UI-02 | Phase 4 | Complete |
| UI-03 | Phase 4 | Complete |
| UI-04 | Phase 4 | Complete |
| UI-05 | Phase 4 | Complete |
| UI-06 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation*
