# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The text parser must feel magical -- players type natural language commands and the game understands them.
**Current focus:** v2.1 Art & Effects -- Phase 14: Art Pipeline Tuning

## Current Position

Milestone: v2.1 Art & Effects
Phase: 14 of 18 (Art Pipeline Tuning)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-21 -- Roadmap created for v2.1 milestone (5 phases, 24 requirements)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**v1.0 Totals (archived):**
- Phases: 8, Plans: 22, Commits: 95, Files: 207, LOC: 35,394

**v2.0 Totals (archived):**
- Phases: 5 (Phases 9-13), Plans: 12, Commits: 58
- Files: 209 changed, 23,793 insertions, 3,946 deletions
- Requirements: 27/32 complete (5 art requirements pending ComfyUI hardware)

**v2.1:**
- Total plans completed: 0
- Phases: 5 (Phases 14-18), Requirements: 24

## Accumulated Context

### Decisions

All v1.0 decisions archived in .planning/milestones/v1.0-ROADMAP.md
All v2.0 decisions archived in .planning/milestones/v2.0-ROADMAP.md

### Pending Todos

None.

### Blockers/Concerns

- Flux art generation requires ComfyUI + GPU hardware (user has local GPU)
- Art style target: between classic 16-bit and modern pixel art
- Critical: Must generate at 1024x576 (not 1024x1024) to avoid 44% vertical crop
- Critical: Sprite background removal needed -- Flux generates white/colored backgrounds, not transparent
- LoRA strength values (0.65 bg, 0.85 sprites) are starting estimates needing empirical testing
- Player spritesheet may need hand-assembly -- Flux cannot generate coherent multi-frame sheets

## Session Continuity

Last session: 2026-02-21
Stopped at: Roadmap created for v2.1, ready to plan Phase 14
Resume file: None
