---
phase: 14-art-pipeline-tuning
plan: 01
subsystem: art-pipeline
tags: [comfyui, sharp, flux, lora, background-removal, pixel-art]

# Dependency graph
requires:
  - phase: 09-art-pipeline-schema-foundation
    provides: "generate-art.ts, style-guide.json, comfyui-workflow.json, art-manifest.json"
provides:
  - "Per-asset-type config injection (resolution, LoRA, guidance, steps)"
  - "White background removal with threshold-based pixel manipulation"
  - "Edge defringe pass for clean sprite alpha"
  - "AssetTypeConfig interface and getAssetTypeConfig() mapping"
  - "injectConfig() for runtime workflow node modification"
affects: [14-02-PLAN, art-generation, sprite-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-type-workflow-injection, threshold-background-removal, edge-defringe]

key-files:
  created: []
  modified:
    - scripts/generate-art.ts
    - scripts/style-guide.json

key-decisions:
  - "Runtime workflow injection instead of modifying comfyui-workflow.json on disk"
  - "Threshold-based raw pixel background removal (sharp) over AI matting (@imgly)"
  - "8-neighbor edge defringe with alpha < 200 threshold for semi-transparent pixels"
  - "Items generate at 512x512 to reduce compute and improve centering"

patterns-established:
  - "AssetTypeConfig: per-category config lookup via getAssetTypeConfig(category, styleGuide)"
  - "injectConfig: modify deep-cloned workflow nodes 3, 4, 5, 9, 11 at runtime"
  - "Background removal pipeline: removeWhiteBackground -> defringeEdges -> resize"

requirements-completed: [ARTX-01, ARTX-04]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 14 Plan 01: Per-Type Config and Background Removal Summary

**Per-asset-type generation config (16:9 backgrounds at 1024x576, items at 512x512) with sprite white-to-transparent background removal and edge defringe via sharp raw pixel manipulation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T11:17:05Z
- **Completed:** 2026-02-22T11:20:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Backgrounds now generate at 1024x576 (16:9) natively instead of 1024x1024, eliminating the 44% vertical composition loss from cropping
- Per-type LoRA strength (bg=0.7, sprite=0.85, item=0.9, npc=0.85) injected into workflow at runtime
- Sprite background removal converts white/near-white pixels to transparent using configurable threshold
- Edge defringe pass replaces semi-transparent edge pixel colors with nearest opaque neighbor colors, eliminating white halo artifacts

## Task Commits

Each task was committed atomically:

1. **Task 1: Per-asset-type config system and 16:9 resolution fix** - `2a2f9f8` (feat)
2. **Task 2: Sprite background removal with edge defringe** - `0dc32fe` (feat)

## Files Created/Modified
- `scripts/generate-art.ts` - Added AssetTypeConfig, getAssetTypeConfig(), injectConfig(), removeWhiteBackground(), defringeEdges(), updated processSprite() and generateImage()
- `scripts/style-guide.json` - Per-type generationResolution, per-type loraStrength, backgroundRemoval config section

## Decisions Made
- **Runtime injection over template modification:** The workflow JSON file on disk remains unchanged with its 1024x1024 defaults. The generate script deep-clones and injects per-type values at runtime via injectConfig(). This keeps the template stable and avoids accidental commits of type-specific values.
- **Sharp threshold over AI matting:** Used sharp's raw pixel buffer access for white-to-transparent conversion rather than @imgly/background-removal-node. The LoRA produces clean white backgrounds on pixel art, making a simple threshold approach sufficient without adding a 200MB model dependency.
- **512x512 for items:** Items generate at 512x512 instead of 1024x1024 to reduce compute and improve subject centering, since items downscale to 32x32 final size.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Per-type config system ready for empirical LoRA calibration in Phase 14 Plan 02
- Background removal pipeline ready for testing with actual Flux-generated sprites when ComfyUI hardware is available
- All LoRA strength values are starting estimates tagged with a note for Plan 02 calibration

## Self-Check: PASSED

- All files exist on disk (generate-art.ts, style-guide.json, 14-01-SUMMARY.md)
- All commits verified in git log (2a2f9f8, 0dc32fe)
- comfyui-workflow.json unchanged on disk
- Dry-run runs successfully with correct per-type values

---
*Phase: 14-art-pipeline-tuning*
*Completed: 2026-02-22*
