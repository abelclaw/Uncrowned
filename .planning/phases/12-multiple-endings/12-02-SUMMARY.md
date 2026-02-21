---
phase: 12-multiple-endings
plan: 02
subsystem: gameplay
tags: [phaser-scene, endings, event-bus, game-loop, json-data, typescript]

# Dependency graph
requires:
  - phase: 12-multiple-endings
    provides: EndingRegistryData types, endings-registry.json, PuzzleEngine evaluate-ending action, trigger-ending EventBus event
  - phase: 10-death-gallery
    provides: DeathScene pattern (overlay vs replacement), MetaGameState persistence
provides:
  - EndingScene with epilogue display, discovery counter, and navigation buttons
  - RoomScene trigger-ending handler with MetaGameState recording and fadeOut transition
  - throne_room_act3.json reauthored to route through ending system instead of game-complete flag
affects: [12-03, EndingsGalleryScene, MetaGameState cross-playthrough tracking]

# Tech tracking
tech-stack:
  added: []
  patterns: [scene.start() for full scene replacement (vs scene.launch overlay), 1500ms fadeOut for dramatic ending transition]

key-files:
  created:
    - src/game/scenes/EndingScene.ts
  modified:
    - src/game/scenes/RoomScene.ts
    - src/game/scenes/Preloader.ts
    - src/game/main.ts
    - public/assets/data/rooms/throne_room_act3.json

key-decisions:
  - "EndingScene uses scene.start() (full replacement) not scene.launch() (overlay) since the game is over"
  - "1500ms fadeOut duration for dramatic pacing before EndingScene starts"
  - "evaluate-ending placed in accept-throne and decline-throne puzzles (not perform-rite) to ensure throne choice flags are set before ending evaluation"

patterns-established:
  - "EndingScene replacement pattern: RoomScene records MetaGameState, hides UI, fades out 1500ms, then scene.start('EndingScene', data)"
  - "Game-over flow: perform-rite breaks curse -> throne choice sets flag -> evaluate-ending determines ending -> trigger-ending event -> EndingScene"

requirements-completed: [ENDS-02, ENDS-03, ENDS-04]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 12 Plan 02: EndingScene, RoomScene Wiring, and Throne Room Reauthoring Summary

**Full-screen EndingScene with epilogue display, RoomScene trigger-ending handler using MetaGameState, and throne_room_act3.json reauthored from game-complete flags to evaluate-ending actions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T22:43:23Z
- **Completed:** 2026-02-21T22:46:44Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created EndingScene.ts rendering ending title, subtitle, ~200-word epilogue text, "THE END" credits, discovery counter, Play Again and Main Menu buttons following DeathScene UI patterns
- Added trigger-ending EventBus handler in RoomScene that records ending in MetaGameState, hides UI, fades out with 1500ms duration, then starts EndingScene via scene.start()
- Reauthored throne_room_act3.json: removed game-complete flag from both perform-rite puzzles, added evaluate-ending as last action in accept-throne and decline-throne puzzles
- Registered EndingScene in Preloader (endings-registry.json load) and main.ts scene array

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EndingScene and register in Preloader + main.ts** - `2192afc` (feat)
2. **Task 2: Wire RoomScene trigger-ending handler and reauthor throne_room_act3.json** - `2a235aa` (feat)

## Files Created/Modified
- `src/game/scenes/EndingScene.ts` - Full-screen ending scene with epilogue, discovery counter, Play Again/Main Menu buttons
- `src/game/scenes/RoomScene.ts` - Added trigger-ending handler with MetaGameState recording and 1500ms fadeOut
- `src/game/scenes/Preloader.ts` - Added endings-registry.json preload
- `src/game/main.ts` - Added EndingScene to scene array
- `public/assets/data/rooms/throne_room_act3.json` - Removed game-complete, added evaluate-ending to throne choice puzzles

## Decisions Made
- EndingScene uses scene.start() for full replacement (not scene.launch overlay) since the game is complete and RoomScene should not remain paused
- 1500ms fadeOut provides slightly longer dramatic pause than standard 500ms room transitions, matching the gravity of ending the game
- evaluate-ending placed in accept-throne and decline-throne (not perform-rite) following research Pitfall 1 guidance to ensure throne choice flags are set before ending evaluation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete end-to-end ending flow operational: rite -> throne choice -> evaluate-ending -> trigger-ending -> EndingScene
- EndingsGalleryScene (plan 03) can now read from MetaGameState.getEndingsDiscovered() and endings-registry.json
- All 4 endings are reachable through the 2x2 flag matrix (clerk_remembers x throne_accepted)

## Self-Check: PASSED

- All 6 files verified present on disk
- Both task commits (2192afc, 2a235aa) verified in git history

---
*Phase: 12-multiple-endings*
*Completed: 2026-02-21*
