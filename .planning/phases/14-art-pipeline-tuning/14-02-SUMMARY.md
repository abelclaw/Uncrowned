---
phase: 14-art-pipeline-tuning
plan: 02
subsystem: art-pipeline
tags: [comfyui, lora, test-matrix, calibration]

# Dependency graph
requires:
  - phase: 14-01
    provides: "AssetTypeConfig, per-type LoRA strengths, injectConfig()"
provides:
  - "--test-lora CLI mode for structured LoRA strength comparison grid"
  - "Dry-run preview of 27-image test matrix"
affects: [style-guide-calibration, phase-15-batch-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [test-matrix-generation, structured-output-comparison]

key-files:
  created: []
  modified:
    - scripts/generate-art.ts

key-decisions:
  - "Fixed seed per room for deterministic comparison across LoRA strengths"
  - "3 rooms per act (9 total) covers forest, cave, and twilight environments"
  - "3 LoRA strengths (0.6, 0.7, 0.8) bracket the expected optimal range"

patterns-established:
  - "test-lora matrix: act/room/strength triple with structured folder output"

requirements-completed: [ARTX-02]

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 14 Plan 02: LoRA Test Matrix CLI Mode Summary

**`--test-lora` CLI flag generates a 9-room x 3-strength comparison grid (27 backgrounds) for human visual review and LoRA calibration**

## Performance

- **Duration:** 2 min (code task only)
- **Started:** 2026-02-22
- **Completed:** 2026-02-22
- **Tasks:** 1 of 2 (Task 2 deferred — requires ComfyUI hardware)
- **Files modified:** 1

## Accomplishments
- Added `--test-lora` CLI flag to generate-art.ts that generates a structured comparison grid
- Test matrix covers 9 rooms (3 per act) at 3 LoRA strengths (0.6, 0.7, 0.8) = 27 total images
- Fixed seeds per room ensure only LoRA strength varies between comparisons
- Dry-run mode (`--test-lora --dry-run`) previews the full matrix with prompts and output paths
- Output organized as `test-output/lora-comparison/{act}/{roomId}-lora-{strength}.png`

## Task Commits

1. **Task 1: Add --test-lora CLI mode** - `75a7e1e` (feat)
2. **Task 2: Visual review checkpoint** - DEFERRED (requires ComfyUI + GPU hardware)

## Files Created/Modified
- `scripts/generate-art.ts` - Added TEST_ROOMS constant, LORA_STRENGTHS_TO_TEST, runTestLoraMatrix(), --test-lora CLI flag parsing, dry-run support

## Deferred Checkpoint

Task 2 is a human-verify checkpoint requiring:
1. ComfyUI running with Flux GGUF model and pixel art LoRA loaded
2. Run `npx tsx scripts/generate-art.ts --test-lora` to generate 27 comparison images
3. Visual review of test-output/lora-comparison/ to select optimal LoRA strength per asset type
4. Update `scripts/style-guide.json` loraStrength values with empirically chosen values

This can be done at any time when ComfyUI hardware is available. The code is complete and verified via dry-run.

## Issues Encountered
None

## Self-Check: PASSED (code only)

- `--test-lora --dry-run` lists 27 test entries correctly
- `--help` shows --test-lora flag
- test-output/ in .gitignore
- LoRA calibration values in style-guide.json remain at starting estimates until hardware review

---
*Phase: 14-art-pipeline-tuning*
*Completed: 2026-02-22 (code); LoRA calibration deferred*
