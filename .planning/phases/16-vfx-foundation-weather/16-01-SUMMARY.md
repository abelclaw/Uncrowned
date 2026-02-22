---
phase: 16-vfx-foundation-weather
plan: 01
subsystem: vfx
tags: [phaser-particles, weather, ambient, effects-manager, singleton]

# Dependency graph
requires: []
provides:
  - EffectsManager singleton with 8 particle presets (4 weather + 4 ambient)
  - RoomEffectsData type for data-driven room effects configuration
  - WeatherType and AmbientType string literal unions
affects: [17-lighting-transitions, 18-vfx-rollout]

# Tech tracking
tech-stack:
  added: []
  patterns: [procedural-particle-texture, data-driven-effects, singleton-lifecycle]

key-files:
  created:
    - src/game/systems/EffectsManager.ts
  modified:
    - src/game/types/RoomData.ts

key-decisions:
  - "Procedural 2x2 white pixel texture for all particles -- no asset file dependency"
  - "Weather at depth 80, ambient at depth 75 -- above player (50) but below UI (100)"
  - "randomZone helper function to work around Phaser 3.90 EmitZoneData type definition gap"
  - "Firefly flickering via alpha array [0, 0.8, 0.3, 0.9, 0] over lifespan"

patterns-established:
  - "EffectsManager lifecycle: init() in RoomScene.create(), onRoomEnter() per room, cleanup() on shutdown"
  - "Intensity scaling: quantity multiplied, frequency divided by intensity value"

requirements-completed: [WTHR-01, WTHR-02, WTHR-04]

# Metrics
duration: 7min
completed: 2026-02-22
---

# Phase 16 Plan 01: Effects Manager Summary

**EffectsManager singleton with 8 particle presets (rain/snow/fog/dust + fireflies/dust-motes/falling-leaves/embers) and RoomEffectsData type for data-driven room effects**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-22T14:38:14Z
- **Completed:** 2026-02-22T14:45:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- EffectsManager singleton created following AudioManager pattern with init/cleanup lifecycle
- RoomData interface extended with typed `effects` field (WeatherType, AmbientType, RoomEffectsData)
- 8 particle presets with distinct visual configurations and intensity scaling (0.1-1.0)
- All particles camera-relative (scrollFactor 0) with proper depth layering

## Task Commits

Both tasks were implemented in a single cohesive commit since ambient and weather presets share the same class and file:

1. **Task 1: Create RoomEffectsData type and EffectsManager with weather particle presets** - `6f51c17` (feat)
2. **Task 2: Add ambient particle presets to EffectsManager** - `6f51c17` (included in Task 1 commit)

## Files Created/Modified
- `src/game/systems/EffectsManager.ts` - Singleton VFX manager with 8 particle presets, procedural texture generation, intensity scaling
- `src/game/types/RoomData.ts` - Added WeatherType, AmbientType unions, RoomEffectsData interface, effects field on RoomData

## Decisions Made
- Procedural 2x2 white pixel texture for all particles (no external asset dependency)
- Weather emitters at depth 80, ambient at depth 75 (above player at 50, below UI at 100)
- Used `randomZone()` helper to cast emit zone objects due to Phaser 3.90 type definition gap for EmitZoneData union type
- Firefly flickering implemented via alpha value array `[0, 0.8, 0.3, 0.9, 0]` rather than tweens (simpler, no per-particle tween overhead)
- Used `scene.add.graphics()` for texture generation instead of `scene.make.graphics()` (API changed in Phaser 3.90)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Phaser 3.90 make.graphics API change**
- **Found during:** Task 1 (EffectsManager creation)
- **Issue:** `scene.make.graphics({ add: false })` fails in Phaser 3.90 -- `add` is not in the Options type
- **Fix:** Changed to `scene.add.graphics()` followed by immediate `destroy()` after texture generation
- **Files modified:** src/game/systems/EffectsManager.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 6f51c17

**2. [Rule 3 - Blocking] Fixed EmitZoneData type incompatibility**
- **Found during:** Task 1 (weather preset configuration)
- **Issue:** Phaser 3.90 EmitZoneData type union does not resolve correctly for inline `{ type: 'random', source: Rectangle }` objects
- **Fix:** Created `randomZone()` helper that casts emit zone objects to the correct ParticleEmitterConfig['emitZone'] type
- **Files modified:** src/game/systems/EffectsManager.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 6f51c17

---

**Total deviations:** 2 auto-fixed (2 blocking -- Phaser 3.90 API differences)
**Impact on plan:** Both auto-fixes were necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed Phaser type issues documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EffectsManager ready for Phase 16-02 (RoomScene wiring and room JSON effects configuration)
- Phase 17 (lighting/transitions) can build on the particle infrastructure
- Phase 18 (VFX rollout) can add effects to room JSONs using the RoomEffectsData type

## Self-Check: PASSED

- FOUND: src/game/systems/EffectsManager.ts
- FOUND: src/game/types/RoomData.ts
- FOUND: .planning/phases/16-vfx-foundation-weather/16-01-SUMMARY.md
- FOUND: commit 6f51c17

---
*Phase: 16-vfx-foundation-weather*
*Completed: 2026-02-22*
