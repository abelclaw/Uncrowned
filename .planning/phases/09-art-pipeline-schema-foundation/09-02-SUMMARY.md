---
phase: 09-art-pipeline-schema-foundation
plan: 02
subsystem: art-pipeline
tags: [comfyui, flux, sharp, pixel-art, image-generation, build-script]

# Dependency graph
requires:
  - phase: none (standalone build tooling)
    provides: n/a
provides:
  - Art generation build script (generate-art.ts) for ComfyUI + sharp pipeline
  - Art manifest mapping all 36 rooms to prompts, seeds, and dimensions
  - ComfyUI API-format workflow template for Flux GGUF + LoRA
  - Style guide with per-act palettes, prompt templates, and seed strategy
affects: [09-03 (sprite generation uses same pipeline), art-generation (all future art tasks read manifest)]

# Tech tracking
tech-stack:
  added: [sharp@0.34.5 (devDependency)]
  patterns: [ComfyUI REST API workflow submission, sharp post-processing pipeline, art manifest as single source of truth]

key-files:
  created:
    - scripts/generate-art.ts
    - scripts/art-manifest.json
    - scripts/comfyui-workflow.json
    - scripts/style-guide.json
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Workflow node IDs: PROMPT_NODE_ID=6 (CLIPTextEncode), SEED_NODE_ID=10 (RandomNoise)"
  - "All 36 rooms use 960x540 output dimensions; shared backgrounds use 1920x540"
  - "Generation resolution 1024x1024 (Flux native), post-processed to target dimensions with sharp fit:cover"
  - "Act palette hints injected into room prompts for visual consistency across rooms in same act"

patterns-established:
  - "Art manifest pattern: centralized JSON mapping asset IDs to prompts, seeds, dimensions, output paths"
  - "ComfyUI workflow template pattern: stable JSON committed to repo with known node IDs for script injection"
  - "Dry-run pattern: --dry-run flag lists all generation entries without requiring ComfyUI"

requirements-completed: [ART-01, ART-07]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 9 Plan 2: Art Pipeline Tooling Summary

**ComfyUI + Flux GGUF + LoRA build script with art manifest for all 36 rooms, style guide with per-act palettes, and sharp post-processing pipeline**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T20:42:25Z
- **Completed:** 2026-02-21T20:47:27Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 6

## Accomplishments
- Build script (generate-art.ts) reads manifest, submits to ComfyUI REST API, downloads images, and post-processes with sharp
- Art manifest maps all 36 rooms + 6 shared parallax backgrounds + player sprite to descriptive prompts with unique seeds
- ComfyUI workflow template defines 15-node Flux GGUF + LoRA pipeline in API format
- Style guide defines per-act color palettes, prompt prefix/suffix templates, pixel density, and seed strategy
- CLI supports --type, --room, --dry-run, and --force flags for flexible generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Art style guide, manifest, and workflow template** - `8f16aba` (feat)
2. **Task 2: Art generation build script** - `11e9d1e` (feat)
3. **Task 3: Verify art pipeline tooling** - auto-approved checkpoint (no commit needed)

## Files Created/Modified
- `scripts/style-guide.json` - Per-act palettes, prompt templates, pixel density, LoRA config, parallax layer strategy
- `scripts/art-manifest.json` - Maps all 36 rooms + 6 shared backgrounds + player sprite to prompts, seeds, dimensions
- `scripts/comfyui-workflow.json` - 15-node ComfyUI API-format workflow for Flux GGUF + LoRA generation
- `scripts/generate-art.ts` - Build script: CLI parsing, ComfyUI API integration, sharp post-processing, progress logging
- `package.json` - Added sharp@^0.34.5 as devDependency
- `package-lock.json` - Lock file updated with sharp and dependencies

## Decisions Made
- Workflow node IDs (PROMPT=6, SEED=10) documented as constants in both workflow JSON comment and generate script
- All room backgrounds output at 960x540 (matching worldWidth); shared parallax layers at 1920x540
- Act palette text injected into each room prompt for visual consistency across rooms in the same act
- Player sprite included in manifest but items/npcs left as empty objects for Plan 09-03
- TypeScript errors from project tsconfig expected (build script uses tsx, not project compilation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript `tsc --noEmit` on generate-art.ts shows errors because the project tsconfig targets browser (no @types/node, bundler module resolution). This is expected -- the script runs via `npx tsx` which handles Node.js types internally. The plan anticipated this ("script may need a separate tsconfig or skipLibCheck").

## User Setup Required

**External services require manual configuration.** ComfyUI must be installed with Flux GGUF model and 2D Game Assets LoRA before running image generation. See the plan's `user_setup` section for complete setup steps:
- Install ComfyUI Desktop (or manual install)
- Install ComfyUI-GGUF custom node via ComfyUI Manager
- Download flux1-dev-Q5_0.gguf, clip_l.safetensors, t5xxl_fp16.safetensors, ae.safetensors, Flux-2D-Game-Assets-LoRA.safetensors

## Next Phase Readiness
- Art generation pipeline ready for use -- run `npx tsx scripts/generate-art.ts --type backgrounds` with ComfyUI active
- Plan 09-03 can use same pipeline for sprite generation (items, NPCs) by populating manifest entries
- Shared background generation available via `--type shared` flag

## Self-Check: PASSED

All files verified present on disk. All commits verified in git log.

---
*Phase: 09-art-pipeline-schema-foundation*
*Completed: 2026-02-21*
