# Roadmap: KQGame

## Overview

KQGame is built features-before-content: a complete adventure game engine validated with placeholder scenes, then scaled to a full 5-hour adventure. The dependency chain flows from rendering foundation through scene navigation, deterministic text parser, core gameplay systems (inventory, puzzles, narrator, death, save/load, UI), LLM enhancement layer, NPC dialogue, audio/polish, and finally content production. The text parser -- the core differentiator -- is built in two phases: a deterministic fallback first (proving the game is fun without AI), then LLM enhancement on top. Content production starts with a 30-60 minute demo chapter to validate the experience, then scales to the full game.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Rendering** - Game loop, pixel-perfect canvas rendering, asset loading, event bus, and project scaffolding
- [x] **Phase 2: Scene System and Player Movement** - Navigable scenes with animated player character, pathfinding, transitions, and room navigation
- [x] **Phase 3: Text Parser (Deterministic)** - Text input bar with keyword/regex parser that handles all standard adventure game verbs
- [x] **Phase 4: Core Gameplay Systems** - Inventory, puzzle engine, narrator, death system, save/load, and game state management
- [ ] **Phase 5: LLM Integration** - Ollama-powered natural language parsing layered over the deterministic fallback
- [ ] **Phase 6: NPCs and Dialogue** - NPC characters with conversation trees, inkjs narrative scripting, and conversation puzzles
- [ ] **Phase 7: Audio and Polish** - Sound effects, music, ambient audio, and UI refinement
- [ ] **Phase 8: Content Production** - Complete 5-hour fantasy adventure: story, scenes, puzzles, deaths, art pipeline; demo chapter first, then full game

## Phase Details

### Phase 1: Foundation and Rendering
**Goal**: A pixel-perfect HTML5 Canvas renders scenes and runs a stable game loop that all future systems build on
**Depends on**: Nothing (first phase)
**Requirements**: ENG-01, ENG-06, ENG-07, ENG-08
**Success Criteria** (what must be TRUE):
  1. Opening the game in a browser shows a pixel art scene rendered on canvas without blur or scaling artifacts
  2. A loading screen displays while assets are being fetched, then gameplay begins
  3. Parallax background layers scroll at different rates when the camera moves
  4. The game runs at a smooth, consistent frame rate without stuttering or freezing
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffolding, pixel-perfect game config, Boot/Preloader/Game scene chain, EventBus
- [x] 01-02-PLAN.md -- Parallax scrolling backgrounds, placeholder art assets, visual verification

### Phase 2: Scene System and Player Movement
**Goal**: Player navigates between interconnected rooms with an animated character that walks to clicked locations
**Depends on**: Phase 1
**Requirements**: ENG-02, ENG-03, ENG-04, ENG-05
**Success Criteria** (what must be TRUE):
  1. Player character walks to any clicked point within the walkable area with a visible walk cycle animation
  2. Clicking a scene exit transitions the player to the connected room with a fade or slide animation
  3. Multiple placeholder scenes are navigable in sequence (player can walk between rooms and back)
  4. Player character displays interaction poses (not just walking) when near interactable hotspots
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md -- Player entity with animations, NavigationSystem with navmesh pathfinding, room data types, placeholder assets
- [x] 02-02-PLAN.md -- RoomScene with click-to-move pipeline, SceneTransition with fade effects, multi-room navigation

### Phase 3: Text Parser (Deterministic)
**Goal**: Player types text commands and the game reliably understands standard adventure game verbs without any LLM dependency
**Depends on**: Phase 2
**Requirements**: PARSE-01, PARSE-02, PARSE-07
**Success Criteria** (what must be TRUE):
  1. A text input bar is always visible during gameplay and accepts typed commands
  2. Standard verbs (look, take, use, go, talk, open, push, pull) are recognized and produce correct game actions
  3. The game is fully playable using only the keyword/regex parser -- no command requires an LLM to execute
  4. Unrecognized commands produce a clear, in-character "I don't understand" response (not a crash or silence)
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md -- TDD: GameAction types, TextParser with VerbTable and NounResolver, test suite
- [x] 03-02-PLAN.md -- TextInputBar UI, CommandDispatcher, room JSON text content, RoomScene wiring

### Phase 4: Core Gameplay Systems
**Goal**: The complete adventure game loop works: player picks up items, solves puzzles, dies humorously, saves progress, and hears the narrator's sardonic voice
**Depends on**: Phase 3
**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05, PUZ-01, PUZ-02, PUZ-04, PUZ-05, PUZ-07, DEATH-01, DEATH-02, DEATH-03, DEATH-04, DEATH-05, NARR-03, NARR-04, NARR-05, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Player can pick up items, view them in a visual inventory panel, examine them for descriptions, use them on scene hotspots, and combine two items to create a new item
  2. Inventory and environmental puzzles defined in JSON data files evaluate game state flags and trigger results when conditions are met
  3. Dangerous actions trigger unique death scenes with funny narrator commentary, then instantly reset to the last auto-save with no progress lost beyond the current room
  4. The narrator displays sardonic text with a typewriter effect and provides scene descriptions via the "look" command
  5. Player can manually save to multiple slots, load from any slot, start a new game from the main menu, and the game auto-saves on every room transition
**Plans**: 5 plans

Plans: 5/5 complete
- [x] 04-01-PLAN.md -- TDD: GameState singleton, PuzzleEngine condition/action evaluator, SaveManager, type definitions
- [x] 04-02-PLAN.md -- NarratorDisplay typewriter effect, InventoryPanel HTML UI, parser verb/noun extensions
- [x] 04-03-PLAN.md -- CommandDispatcher overhaul with PuzzleEngine integration, enriched room JSON data with items/puzzles/deaths
- [x] 04-04-PLAN.md -- MainMenuScene and DeathScene overlay Phaser scenes
- [x] 04-05-PLAN.md -- Full RoomScene integration, auto-save wiring, gameplay loop verification

### Phase 5: LLM Integration
**Goal**: Natural language commands like "maybe I should pick up that shiny thing" work seamlessly, making the text parser feel magical
**Depends on**: Phase 4
**Requirements**: PARSE-03, PARSE-04, PARSE-05, PARSE-06
**Success Criteria** (what must be TRUE):
  1. Ambiguous or conversational commands (e.g., "I wonder what happens if I try the rusty key on that old chest") are correctly interpreted into game actions
  2. The LLM prompt includes current scene context, inventory, and nearby objects so parsing is accurate to the game state
  3. LLM responses return in under 2 seconds; simple regex-parseable commands bypass the LLM entirely for instant response
  4. If Ollama is unavailable or slow, the game seamlessly falls back to the keyword parser with no error shown to the player
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: NPCs and Dialogue
**Goal**: NPCs populate the world with personalities, branching conversations, and puzzle-relevant information driven by inkjs narrative scripting
**Depends on**: Phase 5
**Requirements**: NPC-01, NPC-02, NPC-03, NPC-04, PUZ-03, PUZ-06, NARR-06, NARR-07
**Success Criteria** (what must be TRUE):
  1. NPCs appear in scenes with distinct personalities and authored knowledge that the player can engage through text commands
  2. NPC conversations branch based on player choices and game state, tracked through inkjs story variables
  3. Conversation-based puzzles require gathering information from NPCs or persuading them to advance the story
  4. The narrator references past player actions and events, showing dynamic awareness of the player's history
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Audio and Polish
**Goal**: The game world feels alive with sound and the experience is polished for players
**Depends on**: Phase 4 (can begin in parallel with Phases 5-6 for audio work)
**Requirements**: AUD-01, AUD-02, AUD-03, AUD-04
**Success Criteria** (what must be TRUE):
  1. Player actions produce appropriate sound effects (item pickup, door opening, death sting, etc.)
  2. Background music plays per scene or area and transitions smoothly when moving between rooms
  3. Ambient audio (wind, forest sounds, water) creates atmosphere in each scene
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Content Production
**Goal**: A complete 5-hour fantasy adventure is authored, art-generated, and playtested -- starting with a 30-60 minute demo chapter to validate the experience, then scaling to the full game
**Depends on**: Phases 6, 7
**Requirements**: NARR-01, NARR-02
**Success Criteria** (what must be TRUE):
  1. A player can play from beginning to satisfying end across a complete fantasy adventure story spanning approximately 5 hours
  2. All three puzzle types (inventory, environmental, conversation) appear throughout the game with logical solutions that feel inevitable in hindsight
  3. Death scenarios are frequent and varied across the entire game, with unique narrator commentary for each one
  4. No player can reach an unwinnable game state -- every puzzle remains solvable regardless of prior actions
  5. Scene art generated via the Flux pipeline maintains visual consistency across the entire game
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD
- [ ] 08-04: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
(Phase 7 can begin after Phase 4 completes, in parallel with Phases 5-6)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Rendering | 2/2 | Complete    | 2026-02-21 |
| 2. Scene System and Player Movement | 2/2 | Complete | 2026-02-21 |
| 3. Text Parser (Deterministic) | 2/2 | Complete | 2026-02-21 |
| 4. Core Gameplay Systems | 0/5 | Not started | - |
| 5. LLM Integration | 0/2 | Not started | - |
| 6. NPCs and Dialogue | 0/2 | Not started | - |
| 7. Audio and Polish | 0/2 | Not started | - |
| 8. Content Production | 0/4 | Not started | - |
