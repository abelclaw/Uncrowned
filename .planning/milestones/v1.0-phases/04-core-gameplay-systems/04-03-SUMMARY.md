---
phase: 04-core-gameplay-systems
plan: 03
subsystem: gameplay
tags: [command-dispatcher, puzzle-engine, inventory, save-load, death-triggers, room-data, json, data-driven]

# Dependency graph
requires:
  - phase: 04-01
    provides: GameState singleton, PuzzleEngine, SaveManager, type definitions
  - phase: 04-02
    provides: Extended parser with inventory/save/load/combine verbs, NounResolver inventory resolution
provides:
  - Overhauled CommandDispatcher with PuzzleEngine integration and evaluation order (meta -> puzzles -> deaths -> verbs)
  - Extended RoomData types with items, puzzles, deathTriggers, deaths, dynamicDescriptions
  - Master items.json registry with 5 item definitions
  - 3 enriched room JSONs with gameplay content (puzzles, death triggers, items)
  - Inventory-aware verb handlers (look, take, use) with dynamic descriptions
  - Save/load command handlers via SaveManager
  - Combine command handler with reversed-order matching
affects: [04-05 scene-wiring, 05-llm-parser, 06-dialogue, 08-content-production]

# Tech tracking
tech-stack:
  added: [jsdom (dev dependency for DOM-dependent tests)]
  patterns: [evaluation-order dispatch (meta -> puzzles -> deaths -> verbs), triple-resolution noun matching (ID/name/partial), inventory-first subject resolution for use commands]

key-files:
  created:
    - public/assets/data/items.json
  modified:
    - src/game/systems/CommandDispatcher.ts
    - src/game/types/RoomData.ts
    - public/assets/data/rooms/forest_clearing.json
    - public/assets/data/rooms/cave_entrance.json
    - public/assets/data/rooms/village_path.json
    - package.json

key-decisions:
  - "Evaluation order: puzzles before death triggers -- prevents dying when player has correct solution"
  - "Use X on Y resolution: X inventory-first, Y room-first -- matches natural 'use key on door' pattern"
  - "Items only consumed by explicit puzzle actions, never by failed attempts"
  - "Combine handler checks both orderings (A+B and B+A) to prevent frustrating order-sensitivity"
  - "Dynamic descriptions checked via flag iteration on bare look command"

patterns-established:
  - "CommandDispatcher evaluation order: meta-commands -> puzzles -> death triggers -> verb handlers"
  - "Triple-resolution noun matching: exact ID -> name match -> partial word match (used in findHotspot, findRoomItem, findItemBySubject, findExit)"
  - "Room JSON enrichment pattern: items[], puzzles[], deathTriggers[], deaths{}, dynamicDescriptions{}"
  - "Fallback take handler: if no puzzle defined for take action, simple add-item + narrator response"

requirements-completed: [INV-01, INV-02, INV-03, INV-04, PUZ-01, PUZ-02, DEATH-01, DEATH-02, NARR-03, NARR-05]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 4 Plan 3: CommandDispatcher Overhaul and Room Data Enrichment Summary

**Overhauled CommandDispatcher with PuzzleEngine integration, inventory/save/load commands, and 3 enriched room JSONs with puzzles, items, death triggers, and dynamic descriptions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T00:05:00Z
- **Completed:** 2026-02-21T13:10:15Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- CommandDispatcher overhauled from 13-line stateless handlers to 654-line full gameplay routing hub with PuzzleEngine, GameState, and SaveManager integration
- Critical evaluation order implemented: meta-commands -> puzzles -> death triggers -> verb handlers (prevents dying when player has correct solution items)
- All 12 verb types handled: look, go, take, use, talk, open, push, pull, inventory, save, load, combine
- 3 room JSONs enriched with gameplay content: forest_clearing (rusty-key, stick, beehive death), cave_entrance (mushroom, bottle, key-door puzzle, combine puzzle, poison death), village_path (torch-look, wander death)
- Master items.json created with 5 item definitions matching sardonic narrator voice
- All 104 tests passing, zero TypeScript errors, all JSON validates

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend RoomData types and create enriched room JSON data** - `f58e0fc` (feat)
2. **Task 2: Overhaul CommandDispatcher with PuzzleEngine, inventory, and save/load integration** - `99349c0` (feat)

## Files Created/Modified
- `src/game/types/RoomData.ts` - Extended with RoomItemData, DeathDefinition, and optional fields (items, puzzles, deathTriggers, deaths, dynamicDescriptions)
- `src/game/systems/CommandDispatcher.ts` - Full overhaul with PuzzleEngine integration, meta-commands, inventory-aware verb handlers
- `public/assets/data/items.json` - Master item registry with 5 definitions (rusty-key, glowing-mushroom, stick, makeshift-torch, mysterious-bottle)
- `public/assets/data/rooms/forest_clearing.json` - Enriched with rusty-key/stick items, take puzzles, beehive death trigger, dynamic descriptions
- `public/assets/data/rooms/cave_entrance.json` - Enriched with bottle/mushroom items, key-door puzzle, combine puzzle, poison death
- `public/assets/data/rooms/village_path.json` - Enriched with torch-look puzzle and wander-off-path death trigger
- `package.json` - Added jsdom dev dependency

## Decisions Made
- **Puzzles before death triggers**: Research Pitfall #3 says check solutions first to prevent false deaths. If player has the right items, the puzzle match short-circuits death trigger evaluation.
- **Use X on Y resolution order**: X resolves inventory-first (check GameState.hasItem), Y resolves room-first (check hotspots). Matches the natural "use key on door" pattern where key is in inventory and door is in the room.
- **Items never consumed on failed attempts**: Only explicit puzzle actions (remove-item) consume items. Failed "use" attempts give descriptive text but leave inventory unchanged. This prevents Sierra-style unwinnable states.
- **Combine handler checks both orderings**: "combine stick with mushroom" and "combine mushroom with stick" both work. The handler tries the original order first, then reversed, so puzzle definitions only need one ordering.
- **Fallback take for items without puzzles**: If a room item exists but has no matching take-puzzle, the handler does a simple add-item + narrator response. This ensures items are always takeable even if the planner forgot to add a puzzle.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Plan was interrupted by rate limit during initial execution. Resumed successfully with Task 1 committed and Task 2 code already in working tree. No rework required.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CommandDispatcher is ready for scene wiring in Plan 04-05 (connect RoomScene to dispatcher)
- All room JSONs have complete gameplay content for playtesting
- PuzzleEngine integration proven through dispatcher evaluation chain
- Save/load commands ready for menu integration
- Dynamic descriptions will respond to flag changes as puzzles are solved

## Self-Check: PASSED

All 7 key files verified present. Both task commits (f58e0fc, 99349c0) verified in git log. 104 tests passing. TypeScript compiles clean. All JSON validates.

---
*Phase: 04-core-gameplay-systems*
*Plan: 03*
*Completed: 2026-02-21*
