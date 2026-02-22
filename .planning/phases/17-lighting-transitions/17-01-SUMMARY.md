---
phase: 17-lighting-transitions
plan: 01
subsystem: vfx
tags: [phaser, postfx, lighting, vignette, bloom, particles]

# Dependency graph
requires:
  - phase: 16-vfx-foundation
    provides: EffectsManager singleton with init/onRoomEnter/cleanup lifecycle and RoomEffectsData type
provides:
  - LightingData type with tint, brightness, vignette, torchFlicker, postfx fields
  - EffectsManager applyLighting/clearLighting methods with full PostFX pipeline
  - Data-driven per-room lighting via room JSON effects.lighting field
  - 2 demo room lighting configs (cave dark torchflicker, courtyard warm bloom)
affects: [17-02, room-json-authoring, effects-system]

# Tech tracking
tech-stack:
  added: []
  patterns: [camera-postfx-pipeline, tint-overlay-rectangle, timer-based-flicker]

key-files:
  created: []
  modified:
    - src/game/types/RoomData.ts
    - src/game/systems/EffectsManager.ts
    - public/assets/data/rooms/cave_entrance.json
    - public/assets/data/rooms/castle_courtyard.json

key-decisions:
  - "grayscale() for desaturate PostFX: Phaser 3.90 ColorMatrix has grayscale() not desaturate(), adapted plan accordingly"
  - "Boolean postFX tracking: used postFXActive flag instead of Controller[] array since clearLighting calls postFX.clear() wholesale"
  - "Lighting overlay depth 70: below ambient (75) and weather (80) so particles float above tint"

patterns-established:
  - "Lighting overlay pattern: full-screen Rectangle with setScrollFactor(0) for camera-relative tint"
  - "Timer-based flicker: Phaser TimerEvent oscillating overlay alpha around base value for torch effect"
  - "PostFX lifecycle: apply on room enter, clear on room change via postFX.clear()"

requirements-completed: [LITE-01, LITE-02, LITE-03, LITE-04]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 17 Plan 01: Ambient Lighting & PostFX Summary

**Per-room ambient lighting with tint overlays, vignette PostFX, torch flicker timers, and bloom/glow/desaturate camera effects driven by room JSON config**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T15:46:07Z
- **Completed:** 2026-02-22T15:49:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- LightingData type on RoomEffectsData with tint, brightness, vignette, torchFlicker, and postfx fields
- EffectsManager extended with applyLighting/clearLighting handling full PostFX pipeline and tint overlay
- Torch flicker via Phaser TimerEvent oscillating overlay alpha for cave atmosphere
- Two demo rooms: dark cave with torch flicker and warm courtyard with bloom PostFX

## Task Commits

Each task was committed atomically:

1. **Task 1: Add LightingData type and lighting/PostFX methods to EffectsManager** - `8816a73` (feat)
2. **Task 2: Configure lighting in 2 demo rooms and verify integration** - `1d1afbb` (feat)

## Files Created/Modified
- `src/game/types/RoomData.ts` - Added PostFXType union, LightingData interface, lighting field on RoomEffectsData
- `src/game/systems/EffectsManager.ts` - Added applyLighting(), clearLighting(), flicker timer, PostFX pipeline, LIGHTING_DEPTH constant
- `public/assets/data/rooms/cave_entrance.json` - Added lighting config: tint #332244, brightness 0.4, vignette 0.6, torchFlicker
- `public/assets/data/rooms/castle_courtyard.json` - Added effects.lighting config: tint #ffcc88, brightness 0.85, vignette 0.2, bloom PostFX

## Decisions Made
- Used `grayscale()` instead of `desaturate()` for the desaturate PostFX effect -- Phaser 3.90 Display.ColorMatrix does not have a `desaturate()` method, but `grayscale()` achieves the same color-draining effect
- Used a boolean `postFXActive` flag instead of tracking individual `Phaser.FX.Controller[]` because `FX.ColorMatrix` does not extend `FX.Controller` in Phaser's type definitions, and `postFX.clear()` handles bulk cleanup
- Lighting overlay depth 70 sits below ambient (75) and weather (80) so particles visually float above tint

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Phaser API mismatch: desaturate() does not exist on ColorMatrix**
- **Found during:** Task 1 (applyLighting implementation)
- **Issue:** Plan specified `colorMatrix.desaturate()` but Phaser 3.90 ColorMatrix only has `grayscale()`, `saturate()`, and `desaturateLuminance()`
- **Fix:** Used `colorMatrix.grayscale()` which achieves the same visual effect of draining color
- **Files modified:** src/game/systems/EffectsManager.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 8816a73

**2. [Rule 1 - Bug] FX.ColorMatrix not assignable to FX.Controller type**
- **Found during:** Task 1 (postFXPipeline array tracking)
- **Issue:** `Phaser.FX.ColorMatrix` extends `Display.ColorMatrix`, not `FX.Controller`, so storing in `Controller[]` caused TS2345
- **Fix:** Replaced `Controller[]` tracking with boolean `postFXActive` flag; cleanup uses `postFX.clear()` which removes all effects
- **Files modified:** src/game/systems/EffectsManager.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 8816a73

---

**Total deviations:** 2 auto-fixed (2 bugs from Phaser API type mismatches)
**Impact on plan:** Both fixes necessary for TypeScript compilation. Visual behavior unchanged from plan intent. No scope creep.

## Issues Encountered
None beyond the Phaser API deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Lighting system complete and data-driven via room JSON
- Ready for Plan 02 (room transition effects) which can layer transition animations on top of the lighting system
- Any room JSON can now add an `effects.lighting` field to get ambient lighting without code changes

## Self-Check: PASSED

All 5 files verified present. Both task commits (8816a73, 1d1afbb) verified in git log.

---
*Phase: 17-lighting-transitions*
*Completed: 2026-02-22*
