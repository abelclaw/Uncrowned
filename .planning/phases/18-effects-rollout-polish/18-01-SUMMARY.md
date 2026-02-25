---
phase: 18-effects-rollout-polish
plan: 01
subsystem: effects
tags: [quality-settings, particles, postfx, canvas-fallback, mobile, localStorage]

# Dependency graph
requires:
  - phase: 16-weather-ambient
    provides: EffectsManager singleton with weather/ambient/lighting particle systems
  - phase: 13-mobile-responsive
    provides: isMobile() detection in MobileKeyboardManager
provides:
  - QualitySettings singleton with high/low/off levels persisted to localStorage
  - Quality-aware particle scaling in EffectsManager
  - Canvas renderer detection and graceful degradation
  - Mobile auto-downgrade to half particle counts
  - MainMenuScene quality toggle UI
affects: [18-effects-rollout-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [quality-multiplier scaling, Canvas/WebGL detection, localStorage settings persistence]

key-files:
  created:
    - src/game/systems/QualitySettings.ts
  modified:
    - src/game/systems/EffectsManager.ts
    - src/game/scenes/RoomScene.ts
    - src/game/scenes/MainMenuScene.ts

key-decisions:
  - "Reuse isMobile() from MobileKeyboardManager instead of reimplementing (same systems/ directory, no circular dependency)"
  - "Canvas renderer skips all particles and PostFX but still applies lighting overlay Rectangle"
  - "Mobile devices on 'high' quality auto-downgrade to 0.5x particle multiplier"

patterns-established:
  - "Quality multiplier pattern: getQualityMultiplier() returns 0/0.5/1.0, applied to all particle quantities"
  - "Settings persistence: kqgame-quality localStorage key with try/catch for incognito mode"

requirements-completed: [PERF-01, PERF-02, PERF-03]

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 18 Plan 01: Quality Settings Summary

**Quality settings singleton with high/low/off toggle, Canvas/mobile graceful degradation, and MainMenuScene quality control**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T16:09:52Z
- **Completed:** 2026-02-22T16:13:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- QualitySettings singleton with high/low/off levels persisted to localStorage key `kqgame-quality`
- EffectsManager scales all particle counts by quality multiplier (0, 0.5, or 1.0)
- Canvas renderer detection skips all particles and PostFX; lighting overlay Rectangle still applies
- Mobile devices auto-downgrade to half particle counts when quality is 'high'
- MainMenuScene shows clickable "Quality: High/Low/Off" toggle that persists across reloads

## Task Commits

Each task was committed atomically:

1. **Task 1: Create QualitySettings singleton and integrate into EffectsManager** - `290a988` (feat)
2. **Task 2: Add quality toggle to MainMenuScene** - `452f184` (feat)

## Files Created/Modified
- `src/game/systems/QualitySettings.ts` - Singleton managing quality level with Canvas/mobile detection
- `src/game/systems/EffectsManager.ts` - Quality-aware particle scaling and PostFX gating
- `src/game/scenes/RoomScene.ts` - Canvas renderer detection log on create()
- `src/game/scenes/MainMenuScene.ts` - Quality toggle menu item cycling high/low/off

## Decisions Made
- Reused `isMobile()` from `MobileKeyboardManager` (same `systems/` directory) instead of reimplementing -- avoids code duplication with no circular dependency risk
- Canvas renderer skips all particles and PostFX but still applies the lighting overlay Rectangle (works on Canvas, provides minimum visual atmosphere)
- Mobile devices on 'high' quality auto-downgrade to 0.5x particle multiplier -- mobile users get reduced particles without needing to manually set quality to 'low'

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- QualitySettings is ready for use by 18-02 (room effects rollout) and 18-03 (polish)
- EffectsManager will automatically respect quality settings when new rooms with effects are added
- Quality toggle accessible from main menu on every game launch

---
*Phase: 18-effects-rollout-polish*
*Completed: 2026-02-22*

## Self-Check: PASSED

All files exist, all commits verified.
