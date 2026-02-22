# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The text parser must feel magical -- players type natural language commands and the game understands them.
**Current focus:** v2.1 Art & Effects -- Phase 14: Art Pipeline Tuning

## Current Position

Milestone: v2.1 Art & Effects
Phase: 14 of 18 (Art Pipeline Tuning)
**Current Plan:** 2
**Total Plans in Phase:** 2
Status: Executing
Last activity: 2026-02-22 -- Completed 14-01 (per-type config and background removal)

**Progress:** [█░░░░░░░░░] 10%

## Performance Metrics

**v1.0 Totals (archived):**
- Phases: 8, Plans: 22, Commits: 95, Files: 207, LOC: 35,394

**v2.0 Totals (archived):**
- Phases: 5 (Phases 9-13), Plans: 12, Commits: 58
- Files: 209 changed, 23,793 insertions, 3,946 deletions
- Requirements: 27/32 complete (5 art requirements pending ComfyUI hardware)

**v2.1:**
- Total plans completed: 1
- Phases: 5 (Phases 14-18), Requirements: 24

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 14 | 01 | 3min | 2 | 2 |

## Accumulated Context

### Decisions

All v1.0 decisions archived in .planning/milestones/v1.0-ROADMAP.md
All v2.0 decisions archived in .planning/milestones/v2.0-ROADMAP.md

- [14-01] Runtime workflow injection: inject per-type config into deep-cloned workflow at runtime, keep comfyui-workflow.json stable
- [14-01] Sharp threshold for bg removal: raw pixel threshold + defringe over AI matting library
- [14-01] 512x512 for items: reduces compute, improves subject centering for 32x32 final assets

### Pending Todos

None.

### Blockers/Concerns

- Flux art generation requires ComfyUI + GPU hardware (user has local GPU)
- Art style target: between classic 16-bit and modern pixel art
- RESOLVED: Backgrounds now generate at 1024x576 natively (14-01)
- RESOLVED: Sprite background removal implemented with threshold + defringe (14-01)
- LoRA strength values (bg=0.7, sprite=0.85, item=0.9, npc=0.85) are starting estimates needing empirical testing in 14-02
- Player spritesheet may need hand-assembly -- Flux cannot generate coherent multi-frame sheets

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 14-01-PLAN.md (per-type config and background removal)
Resume file: None
