---
phase: 12-multiple-endings
plan: 03
subsystem: gameplay
tags: [endings-gallery, ui, scene, narrator-cues, meta-progression, json-data]

# Dependency graph
requires:
  - phase: 12-multiple-endings
    provides: EndingRegistryData types, endings-registry.json, MetaGameState.getEndingsDiscovered()
  - phase: 10-death-gallery
    provides: DeathGalleryScene pattern, MetaGameState persistence
provides:
  - EndingsGalleryScene with discovered/locked ending display and detail overlay
  - MainMenuScene conditional Endings Gallery menu item
  - endingInfluence metadata on key decision-point puzzles in dungeon, clock_tower, mirror_hall
  - Narrator cues hinting at ending significance in decision-point rooms
affects: [13-mobile-responsive, MainMenuScene, endings meta-progression loop]

# Tech tracking
tech-stack:
  added: []
  patterns: [EndingsGalleryScene follows DeathGalleryScene pattern (simpler - no pagination), endingInfluence metadata field for content author documentation]

key-files:
  created:
    - src/game/scenes/EndingsGalleryScene.ts
  modified:
    - src/game/scenes/MainMenuScene.ts
    - src/game/main.ts
    - public/assets/data/rooms/dungeon.json
    - public/assets/data/rooms/clock_tower.json
    - public/assets/data/rooms/mirror_hall.json

key-decisions:
  - "EndingsGalleryScene uses simple vertical list (no grid/pagination) since only 4 endings exist"
  - "endingInfluence field is metadata-only -- PuzzleEngine does not read it, exists for content authors"
  - "Both clock repair puzzle variants (gear-spring-first and oil-first) get endingInfluence marking"

patterns-established:
  - "endingInfluence: true on puzzle definitions marks decision points that affect ending determination"
  - "Gallery scenes follow consistent pattern: dark bg, title, counter, cards, detail overlay, back button"

requirements-completed: [ENDS-04, ENDS-05]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 12 Plan 03: Endings Gallery UI and Ending-Influence Room Markers Summary

**EndingsGalleryScene with 4-ending vertical list, MainMenuScene conditional link, and endingInfluence narrator cues on 5 decision-point puzzles across 3 rooms**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T22:43:29Z
- **Completed:** 2026-02-21T22:46:56Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created EndingsGalleryScene displaying 4 endings in a vertical list with discovered/locked states and full epilogue detail overlay
- Updated MainMenuScene to conditionally show "Endings Gallery" when at least one ending is discovered, with proper y-spacing after Death Gallery
- Added endingInfluence: true metadata to 5 puzzles across dungeon (show-memory-crystal, outwit-clerk), clock_tower (repair-clock, repair-clock-oil-first), and mirror_hall (mirror-truth)
- Appended subtle narrator cues to each decision-point puzzle's narrator text hinting at ending significance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EndingsGalleryScene and wire from MainMenuScene + main.ts** - `d2bf5e8` (feat)
2. **Task 2: Add ending-influence metadata and narrator cues to key decision-point rooms** - `1ca212b` (feat)

## Files Created/Modified
- `src/game/scenes/EndingsGalleryScene.ts` - Endings gallery scene with vertical list layout, detail overlay, back navigation
- `src/game/scenes/MainMenuScene.ts` - Conditional Endings Gallery menu item after Death Gallery, y-spacing fix
- `src/game/main.ts` - EndingsGalleryScene import and scene array registration
- `public/assets/data/rooms/dungeon.json` - endingInfluence on show-memory-crystal and outwit-clerk puzzles + narrator cues
- `public/assets/data/rooms/clock_tower.json` - endingInfluence on repair-clock and repair-clock-oil-first puzzles + narrator cues
- `public/assets/data/rooms/mirror_hall.json` - endingInfluence on mirror-truth puzzle + narrator cue

## Decisions Made
- EndingsGalleryScene uses a simple vertical list (no grid, no pagination) since only 4 endings exist -- simpler than DeathGalleryScene's 43-death paginated grid
- The endingInfluence field is documentation/metadata only -- PuzzleEngine does not read it, and PuzzleDefinition interface does not need updating
- Both clock repair variants (gear-spring-first and oil-first) receive endingInfluence marking since both set the clock-fixed flag
- Added y += 50 after Death Gallery menu item in MainMenuScene to fix spacing for the new Endings Gallery item below it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Meta-progression loop complete: play -> discover ending -> view in gallery -> replay for different ending
- EndingsGalleryScene ready for responsive layout adjustments in Phase 13 (mobile)
- All 4 endings browsable from main menu when discovered
- Decision-point rooms now have narrator cues signaling ending significance

## Self-Check: PASSED

- All 7 files verified present on disk
- Both task commits (d2bf5e8, 1ca212b) verified in git history

---
*Phase: 12-multiple-endings*
*Completed: 2026-02-21*
