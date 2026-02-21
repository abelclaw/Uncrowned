---
phase: 10-death-gallery
plan: 01
subsystem: game-data, scene
tags: [phaser, death-registry, metagame, gallery, json]

# Dependency graph
requires:
  - phase: 09-art-pipeline
    provides: MetaGameState with recordDeath(), Preloader asset loading pipeline
provides:
  - death-registry.json with all 43 deaths and gallery metadata
  - DeathRegistryData TypeScript interfaces (DeathRegistryEntry, DeathRegistry)
  - Death recording wired into RoomScene triggerDeathHandler
  - Discovery counter and New badge in DeathScene
affects: [10-02-death-gallery-ui, gallery-scene]

# Tech tracking
tech-stack:
  added: []
  patterns: [death-registry-json, discovery-counter, new-death-badge-animation]

key-files:
  created:
    - public/assets/data/death-registry.json
    - src/game/types/DeathRegistryData.ts
  modified:
    - src/game/scenes/RoomScene.ts
    - src/game/scenes/DeathScene.ts
    - src/game/scenes/Preloader.ts

key-decisions:
  - "Death registry uses actual room JSON roomIds (corrected 5 plan mapping errors via cross-reference)"
  - "DeathSceneData interface uses optional fields for backward compatibility"
  - "Gallery hints written in narrator's sardonic tone for consistency"

patterns-established:
  - "Death recording before scene launch: MetaGameState.recordDeath() called in triggerDeathHandler before DeathScene.launch"
  - "Optional interface extension: new fields added as optional to maintain backward compatibility"

requirements-completed: [GALR-01, GALR-04, GALR-05, GALR-06]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 10 Plan 01: Death Registry & Recording Pipeline Summary

**Death registry JSON with 43 entries, MetaGameState recording wired into death flow, discovery counter and animated New badge in DeathScene**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T21:36:17Z
- **Completed:** 2026-02-21T21:41:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created death-registry.json containing all 43 deaths with id, roomId, roomName, title, narratorText, category, and galleryHint fields
- Wired MetaGameState.recordDeath() into RoomScene.triggerDeathHandler so deaths are permanently tracked across playthroughs
- Added discovery counter ("X/43 deaths discovered") and animated "NEW DEATH DISCOVERED!" badge to DeathScene
- Maintained backward compatibility with optional DeathSceneData interface fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Create death registry JSON and TypeScript types** - `c10a6bf` (feat)
2. **Task 2: Wire death recording into RoomScene and add counter/badge to DeathScene** - `01bb630` (feat)

## Files Created/Modified
- `public/assets/data/death-registry.json` - Master registry of all 43 deaths with gallery metadata and cryptic hints
- `src/game/types/DeathRegistryData.ts` - TypeScript interfaces DeathRegistryEntry and DeathRegistry
- `src/game/scenes/Preloader.ts` - Added death-registry.json preload
- `src/game/scenes/RoomScene.ts` - Added MetaGameState import, recordDeath() call, extended DeathScene launch data
- `src/game/scenes/DeathScene.ts` - Extended DeathSceneData interface, discovery counter, animated New badge

## Decisions Made
- Corrected 5 roomId mappings from plan against actual room JSON data (lost-death in village_path not cave_depths, mushroom-poison in cavern_west_wing not cavern_library, dark-water in cavern_east_wing not crystal_chamber, barrier-zap in crystal_chamber not cavern_east_wing, petrify-slow in castle_courtyard_act3 not petrified_forest)
- DeathSceneData interface uses optional fields (deathId, isNewDeath, discoveredCount, totalDeaths) so older code paths still work
- Gallery hints written in the narrator's sardonic voice matching the game's tone

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected 5 death-to-room ID mappings**
- **Found during:** Task 1 (death registry creation)
- **Issue:** Plan listed incorrect roomIds for 5 deaths (lost-death, mushroom-poison, dark-water, barrier-zap, petrify-slow)
- **Fix:** Cross-referenced all room JSON files to extract actual death locations and used correct roomIds
- **Files modified:** public/assets/data/death-registry.json
- **Verification:** Ran verification script confirming all 43 death IDs exist in their mapped room JSONs
- **Committed in:** c10a6bf (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential correctness fix. Without it, registry would have incorrect room mappings. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Death registry data and recording pipeline complete, ready for gallery UI (Plan 02)
- DeathScene already displays counter and badge, providing visual feedback loop
- MetaGameState.getDeathsDiscovered() available for gallery scene to check unlocked deaths

## Self-Check: PASSED

- FOUND: public/assets/data/death-registry.json
- FOUND: src/game/types/DeathRegistryData.ts
- FOUND: .planning/phases/10-death-gallery/10-01-SUMMARY.md
- FOUND: commit c10a6bf (Task 1)
- FOUND: commit 01bb630 (Task 2)

---
*Phase: 10-death-gallery*
*Completed: 2026-02-21*
