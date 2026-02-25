---
phase: 12-multiple-endings
plan: 01
subsystem: gameplay
tags: [puzzle-engine, endings, narrative, json-data, typescript]

# Dependency graph
requires:
  - phase: 10-death-gallery
    provides: DeathRegistryData pattern, MetaGameState persistence
provides:
  - EndingRegistryData TypeScript interfaces (EndingEntry, EndingRegistry)
  - endings-registry.json with 4 fully-authored endings
  - PuzzleEngine evaluate-ending action type
  - PuzzleEngine.determineEnding() 2x2 flag matrix method
  - trigger-ending EventBus event emission
affects: [12-02, 12-03, EndingScene, RoomScene, throne_room_act3 puzzles]

# Tech tracking
tech-stack:
  added: []
  patterns: [evaluate-ending action type in PuzzleEngine, 2x2 flag matrix for ending determination]

key-files:
  created:
    - src/game/types/EndingRegistryData.ts
    - public/assets/data/endings-registry.json
  modified:
    - src/game/types/PuzzleData.ts
    - src/game/systems/PuzzleEngine.ts

key-decisions:
  - "determineEnding() checks clerk_remembers first (priority over clerk_outwitted if both set)"
  - "evaluate-ending action type is parameterless -- ending determined internally from GameState flags"
  - "Epilogue text copied exactly from research document to preserve authored narrator voice"

patterns-established:
  - "evaluate-ending action: PuzzleEngine internally determines ending from flag state, no parameters needed in action JSON"
  - "EndingRegistry follows DeathRegistry pattern: version, totalEndings count, array of entries"

requirements-completed: [ENDS-01, ENDS-02]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 12 Plan 01: Ending Determination Engine and Content Data Summary

**PuzzleEngine evaluate-ending action type with 2x2 flag matrix (clerk_remembers x throne_accepted) and 4 fully-authored endings in endings-registry.json**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T22:38:47Z
- **Completed:** 2026-02-21T22:41:01Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created EndingRegistryData TypeScript interfaces following the established DeathRegistryData pattern
- Authored endings-registry.json with 4 complete endings: redemption, bureaucratic, wanderer-king, reluctant-ruler -- each with title, subtitle, ~200-word narrator epilogue, and gallery hint
- Extended PuzzleAction union type with evaluate-ending action
- Added determineEnding() method to PuzzleEngine implementing the 2x2 flag matrix (clerk_remembers x throne_accepted)
- PuzzleEngine now emits trigger-ending EventBus event with the determined ending ID

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EndingRegistryData types and endings-registry.json** - `badcdd9` (feat)
2. **Task 2: Extend PuzzleAction and PuzzleEngine with evaluate-ending** - `0be8191` (feat)

## Files Created/Modified
- `src/game/types/EndingRegistryData.ts` - EndingEntry and EndingRegistry interfaces
- `public/assets/data/endings-registry.json` - 4 authored endings with epilogue text, titles, subtitles, gallery hints
- `src/game/types/PuzzleData.ts` - PuzzleAction union extended with evaluate-ending
- `src/game/systems/PuzzleEngine.ts` - evaluate-ending case in executeAction + determineEnding() private method

## Decisions Made
- determineEnding() checks clerk_remembers first as priority if both clerk flags are somehow set (defensive, should not happen in normal play)
- evaluate-ending action type is parameterless -- the ending is derived from GameState flags, not passed as a parameter
- Epilogue text copied verbatim from the pre-authored research document to preserve the narrator's sardonic voice

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EndingRegistryData types ready for EndingScene to import
- endings-registry.json ready for Preloader to load
- PuzzleEngine evaluate-ending action ready for throne_room_act3 puzzles to reference
- trigger-ending EventBus event ready for RoomScene handler (Plan 02)

## Self-Check: PASSED

- All 5 files verified present on disk
- Both task commits (badcdd9, 0be8191) verified in git history

---
*Phase: 12-multiple-endings*
*Completed: 2026-02-21*
