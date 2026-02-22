---
phase: 17-lighting-transitions
plan: 02
subsystem: vfx
tags: [phaser, transitions, postfx, vignette, pixelate, wipe, iris, camera-effects]

# Dependency graph
requires:
  - phase: 17-lighting-transitions
    plan: 01
    provides: EffectsManager with lighting/PostFX pipeline and LightingData type
provides:
  - TransitionType union with 7 themed transition effects
  - SceneTransition wipeToRoom, pixelateToRoom, irisToRoom methods
  - Act-boundary detection via ACT_ROOMS mapping with cinematic iris override
  - RoomScene playTransitionIn() handling all 7 entry animations
  - Per-exit transition configuration in room JSON data
affects: [room-json-authoring, scene-transitions, act-boundaries]

# Tech tracking
tech-stack:
  added: []
  patterns: [vignette-iris-close, pixelate-postfx-tween, wipe-rectangle-tween, act-boundary-detection]

key-files:
  created: []
  modified:
    - src/game/types/RoomData.ts
    - src/game/systems/SceneTransition.ts
    - src/game/scenes/RoomScene.ts
    - public/assets/data/rooms/cave_entrance.json
    - public/assets/data/rooms/village_square.json

key-decisions:
  - "Vignette PostFX for iris effect: simpler than Graphics mask approach, achieves iris-close visual with strength tween"
  - "Act-boundary override always uses iris+1500ms regardless of exit JSON transition setting"
  - "Per-type entry durations: 500ms for wipe/pixelate, 700ms for iris-open (slightly longer for dramatic reveal)"

patterns-established:
  - "Transition-in dispatch: playTransitionIn() switch on transitionFrom field for symmetric entry/exit animations"
  - "PostFX tween pattern: addPixelate/addVignette -> tween property -> remove on complete"
  - "Wipe overlay pattern: full-screen Rectangle at depth 1000, scrollFactor 0, width-tweened for reveal"

requirements-completed: [TRNS-01, TRNS-02, TRNS-03]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 17 Plan 02: Scene Transitions Summary

**7 themed room transition effects (fade, slide, wipe, pixelate, iris) with act-boundary detection auto-upgrading to cinematic iris transitions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T15:52:11Z
- **Completed:** 2026-02-22T15:55:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- TransitionType union with 7 values exported from RoomData.ts, backward-compatible with existing room JSONs
- SceneTransition extended with wipeToRoom (rectangle sweep), pixelateToRoom (PostFX pixelation + fade), and irisToRoom (vignette strength ramp)
- Act-boundary detection via ACT_ROOMS mapping: crossing act lines auto-overrides to iris transition with 1500ms cinematic duration
- RoomScene playTransitionIn() handles symmetric entry animations for all 7 transition types
- Two demo rooms configured: cave_entrance uses pixelate on forest exit, village_square uses iris on watchtower exit

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand TransitionType and implement themed transition effects in SceneTransition** - `efa066e` (feat)
2. **Task 2: Update RoomScene transition-in logic and configure 2 demo exits** - `a69ec3b` (feat)

## Files Created/Modified
- `src/game/types/RoomData.ts` - Added TransitionType union (7 values), updated ExitData.transition field type
- `src/game/systems/SceneTransition.ts` - Added wipeToRoom, pixelateToRoom, irisToRoom methods; ACT_ROOMS mapping; isActChange(); act-boundary override in transitionToRoom()
- `src/game/scenes/RoomScene.ts` - Extracted playTransitionIn() method with switch for all 7 transition entry animations
- `public/assets/data/rooms/cave_entrance.json` - Changed to-forest exit transition from slide-left to pixelate
- `public/assets/data/rooms/village_square.json` - Changed to-watchtower exit transition from slide-right to iris

## Decisions Made
- Used Phaser PostFX vignette for iris effect instead of Graphics circle mask -- significantly simpler, tweening vignette.strength from 0 to 1 creates convincing iris-close, and 1 to 0 creates iris-open
- Act-boundary crossings ALWAYS override to iris+1500ms regardless of exit JSON configuration, ensuring consistent dramatic effect when crossing between acts
- Entry animation durations: 500ms for wipe/pixelate (snappy), 700ms for iris-open (slightly more dramatic)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 transition types implemented for both exit and entry animations
- Phase 17 (Lighting & Transitions) is now fully complete
- Any room JSON can configure transitions per-exit by setting the `transition` field to any TransitionType value
- Act boundaries are automatically detected and produce cinematic transitions

## Self-Check: PASSED

All 5 files verified present. Both task commits (efa066e, a69ec3b) verified in git log.

---
*Phase: 17-lighting-transitions*
*Completed: 2026-02-22*
