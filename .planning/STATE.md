# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The text parser must feel magical -- players type natural language commands and the game understands them.
**Current focus:** v2.0 Art & Polish -- Phase 10: Death Gallery

## Current Position

Milestone: v2.0 Art & Polish
Phase: 10 of 13 (Death Gallery)
Plan: 1 of 2 in current phase
Status: In Progress
Last activity: 2026-02-21 -- Completed 10-01: Death registry data, recording pipeline, counter/badge

Progress: [███░░░░░░░] ~28% (v2.0)

## Performance Metrics

**v1.0 Totals (archived):**
- Phases: 8, Plans: 22, Commits: 95, Files: 207, LOC: 35,394

**v2.0:**
- Total plans completed: 4
- Phases: 5 (Phases 9-13)
- Requirements: 32

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 09 | 03 | 6min | 3 | 131 |
| 10 | 01 | 5min | 2 | 5 |

## Accumulated Context

### Decisions

All v1.0 decisions archived in .planning/milestones/v1.0-ROADMAP.md

Recent decisions affecting current work:
- v2.0 roadmap: Art pipeline + schema foundation first (longest lead time, cross-cutting prerequisite)
- v2.0 roadmap: Death gallery before hints (validates MetaGameState with low risk)
- v2.0 roadmap: Mobile last (needs all UI surfaces stable before responsive layout)
- 09-01: MetaGameState uses own localStorage key (kqgame-meta) independent of save slots
- 09-01: Migration chain uses sequential version-to-version functions in migrations/ directory
- 09-01: Export envelope format: { format: 'kqgame-save', version: 1, gameState, metaState }
- 09-01: parseImportData returns gameState as JSON string so deserialize() handles migration
- 09-02: Workflow node IDs PROMPT=6 (CLIPTextEncode), SEED=10 (RandomNoise) for script injection
- 09-02: All rooms 960x540 output; shared parallax layers 1920x540; generate at 1024x1024 native
- 09-02: Act palette hints injected into room prompts for visual consistency
- 09-02: Parallax strategy resolved: 2 shared layers per act (sky + mid) + 1 unique ground per room
- 09-03: Placeholder PNGs at correct dimensions until ComfyUI available for real Flux generation
- 09-03: Background key convention: bg-shared-actN-{layer}, bg-rooms-{roomId}
- 09-03: Lazy loading gates only visual rendering; navigation/exits/hotspots remain synchronous
- 09-03: Item sprites stored in Map for cleanup on pickup; NPC sprites similarly managed
- [Phase 10]: Death registry uses actual room JSON roomIds (corrected 5 plan mapping errors via cross-reference)
- [Phase 10]: DeathSceneData interface uses optional fields for backward compatibility

### Pending Todos

None.

### Blockers/Concerns

- Flux pixel art LoRA needs empirical testing on 3 rooms before bulk generation
- iOS Safari visualViewport keyboard behavior needs real-device verification (Phase 13)
- Parallax layer decomposition strategy resolved in 09-02: shared per-act sky+mid, unique per-room ground

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 10-01-PLAN.md
Resume file: None
