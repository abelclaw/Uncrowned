# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The text parser must feel magical -- players type natural language commands and the game understands them.
**Current focus:** Phase 6 complete: NPCs and Dialogue -- ready for Phase 7

## Current Position

Phase: 6 of 8 (NPCs and Dialogue) -- PHASE COMPLETE
Plan: 3 of 3 in current phase (06-03 complete)
Status: Phase 6 Complete
Last activity: 2026-02-21 -- Completed 06-03-PLAN.md (Dialogue System Integration)

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 2.7min
- Total execution time: 0.69 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: --
- Trend: --

*Updated after each plan completion*
| Phase 01 P01 | 4min | 2 tasks | 16 files |
| Phase 01 P02 | 2min | 2 tasks | 6 files |
| Phase 02 P01 | 3min | 2 tasks | 10 files |
| Phase 02 P02 | 1min | 2 tasks | 6 files |
| Phase 03 P01 | 4min | 3 tasks | 7 files |
| Phase 03 P02 | 3min | 2 tasks | 7 files |
| Phase 04 P02 | 3min | 2 tasks | 6 files |
| Phase 04 P01 | 6min | 2 tasks | 10 files |
| Phase 04 P04 | 1min | 2 tasks | 2 files |
| Phase 04 P03 | 3min | 2 tasks | 7 files |
| Phase 04 P05 | 3min | 3 tasks | 6 files |
| Phase 05 P01 | 2min | 2 tasks | 3 files |
| Phase 05 P02 | 2min | 2 tasks | 3 files |
| Phase 06 P01 | 2min | 2 tasks | 6 files |
| Phase 06 P02 | 3min | 2 tasks | 8 files |
| Phase 06 P03 | 3min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Features-before-content -- build complete engine with placeholder scenes, validate fun, then scale to full content
- [Roadmap]: Deterministic parser first (Phase 3) before LLM (Phase 5) -- proves gameplay works without AI dependency
- [Roadmap]: Demo chapter before full game within Phase 8 -- validate experience at small scale before committing to 5 hours
- [Phase 01]: 960x540 game resolution (2x of 480x270 native pixel art, scales cleanly to 1080p/4K)
- [Phase 01]: Graphics primitives for progress bar (no image dependency in Boot scene)
- [Phase 01]: Scroll factor values 0/0.1/0.4/1.0 for sky/mountains/trees/ground -- clear depth separation
- [Phase 01]: 1920x540 background images (2x game width) for horizontal scroll room
- [Phase 01]: Python PIL for placeholder image generation -- fast, no npm dependency added
- [Phase 02]: Standalone navmesh library (not phaser-navmesh plugin) -- lighter, no core-js, no stale plugin concern
- [Phase 02]: Convex rectangular walkable areas for placeholder rooms -- upgrade to concave decomposition when real art demands it
- [Phase 02]: Player sprite depth 50 -- between background (0-10) and future foreground (90+)
- [Phase 02]: Animation existence check before creation -- prevents duplicate errors on scene restart
- [Phase 02]: Exit overlap detection in update() loop -- more robust than walk-to-exit-point approach
- [Phase 02]: SceneTransition supports fade and slide -- room JSONs define transition type per exit
- [Phase 02]: Hotspots checked before exits in click handler -- more specific interactions take priority
- [Phase 02]: DEBUG flag at RoomScene top -- togglable exit/hotspot debug rectangles
- [Phase 03]: Go commands prioritize exit resolution over hotspot partial matching
- [Phase 03]: Unresolved nouns return raw string (type:'unknown') for future inventory extension
- [Phase 03]: Vitest as project dev dependency for TDD infrastructure
- [Phase 03]: TextInputBar is HTML overlay below canvas (not Phaser DOM element) for reliable focus/input handling
- [Phase 03]: Option A (destroy/recreate) for TextInputBar lifecycle across scene restarts
- [Phase 03]: CommandDispatcher double-resolution (ID, name, partial) for robust subject matching
- [Phase 03]: Sardonic dark comedy narrator voice established for all game text
- [Phase 04]: Combine verb separated from Use verb -- 'combine X with Y' is now a dedicated verb, not a use synonym
- [Phase 04]: Inventory item resolution ordered after hotspots but before directions in NounResolver
- [Phase 04]: NarratorDisplay enhances existing element (no DOM creation) -- composable with TextInputBar
- [Phase 04]: Map-based localStorage mock for Node 25 compatibility (built-in Storage API incomplete)
- [Phase 04]: vi.mock() for Phaser-dependent EventBus in PuzzleEngine pure-logic tests
- [Phase 04]: Phaser text objects for menu (not HTML) -- full-screen scenes use native Phaser rendering
- [Phase 04]: DeathScene as overlay via scene.launch -- RoomScene stays loaded underneath
- [Phase 04]: Direct deathCount mutation via cast rather than adding GameState method -- minimal change
- [Phase 04]: Evaluation order puzzles before death triggers -- prevents dying when player has correct solution
- [Phase 04]: Use X on Y resolution: X inventory-first, Y room-first -- matches natural language pattern
- [Phase 04]: Items only consumed by explicit puzzle actions, never by failed attempts -- prevents unwinnable states
- [Phase 04]: Combine handler checks both orderings (A+B and B+A) -- prevents frustrating order sensitivity
- [Phase 04]: Auto-save records destination room (not current) -- death restores to room-entry state
- [Phase 04]: NarratorDisplay typewriter threshold at 50 chars -- longer responses get typewriter, shorter get instant
- [Phase 04]: Room items registered as hotspot zones for unified click handling, filtered by GameState taken state
- [Phase 04]: Event-driven integration pattern: systems communicate via EventBus events, not direct coupling
- [Phase 05]: Raw fetch over ollama npm package -- single endpoint wrapper doesn't justify 15KB dependency
- [Phase 05]: AbortSignal.any combines timeout + manual abort for race condition prevention on rapid input
- [Phase 05]: GAME_ACTION_SCHEMA excludes save/load meta-commands from LLM verb space
- [Phase 05]: NounResolver reused from parser module -- no duplication of noun resolution logic
- [Phase 05]: Separate OllamaClient instances in Preloader and HybridParser -- no shared state needed beyond availability boolean
- [Phase 05]: Thinking indicator ('...') shown via showInstant before async parse -- instant feedback while LLM processes
- [Phase 05]: Post-await isTransitioning re-check prevents stale action dispatch after scene change during LLM wait
- [Phase 06]: Named import { Story } from 'inkjs' -- verified constructor available as named export
- [Phase 06]: Map<string,string> for internal npcStoryStates, Record<string,string> for serialization -- Map for runtime, plain object for JSON
- [Phase 06]: DialogueUI reuses NarratorDisplay with 50-char typewrite threshold -- matches existing RoomScene pattern
- [Phase 06]: inkjs Compiler class for pre-compilation -- reliable ink authoring pipeline vs hand-written JSON
- [Phase 06]: Ink else-if uses nested conditionals with - else: blocks, not extra conditions in same block
- [Phase 06]: dialogue- cache key prefix links NpcDefinition.dialogueKey to Preloader asset registration
- [Phase 06]: Dialogue mode input routing before HybridParser.parse() -- numbers go directly to ink choices without parser/LLM overhead
- [Phase 06]: NPC zones rendered as synthetic hotspots reusing existing click pipeline -- no separate click handler needed
- [Phase 06]: Narrator_history runs as non-interactive one-shot conversation (start, continueAll, end) without entering dialogue mode

### Pending Todos

None yet.

### Blockers/Concerns

- LLM parsing latency needs hardware-specific benchmarks early in Phase 5
- Flux pixel art LoRA not yet identified -- art pipeline validation needed before Phase 8 content production
- inkjs + LLM dialogue hybrid pattern undocumented -- needs design work in Phase 6

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 06-03-PLAN.md (Dialogue System Integration) -- Phase 6 fully complete
Resume file: None
