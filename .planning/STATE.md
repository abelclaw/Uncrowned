# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The text parser must feel magical -- players type natural language commands and the game understands them.
**Current focus:** v2.0 Art & Polish -- Phase 11: Progressive Hints (Complete)

## Current Position

Milestone: v2.0 Art & Polish
Phase: 11 of 13 (Progressive Hints)
Plan: 2 of 2 in current phase (COMPLETE)
Status: Phase Complete
Last activity: 2026-02-21 -- Completed 11-02: Puzzle hint content for all 24 rooms (41 hint chains, 123 texts)

Progress: [██████░░░░] ~50% (v2.0)

## Performance Metrics

**v1.0 Totals (archived):**
- Phases: 8, Plans: 22, Commits: 95, Files: 207, LOC: 35,394

**v2.0:**
- Total plans completed: 6
- Phases: 5 (Phases 9-13)
- Requirements: 32

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 09 | 03 | 6min | 3 | 131 |
| 10 | 01 | 5min | 2 | 5 |
| 10 | 02 | 3min | 2 | 4 |
| 11 | 01 | 5min | 3 | 13 |
| 11 | 02 | 35min | 2 | 24 |

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
- [Phase 10]: Renamed internal field to deathRegistry to avoid Phaser Scene.registry base class conflict
- [Phase 10]: Gallery button in DeathScene uses subdued styling to keep Try Again as primary action
- 11-01: Hint auto-escalation thresholds: 3 failed attempts -> tier 1, 5 -> tier 2
- 11-01: Hint relevance scoring prioritizes puzzles with most failed attempts
- 11-01: PuzzleHint uses fixed 3-element tuple for tier text
- 11-02: Skipped simple takes (item-not-taken only) -- 11 rooms have no hintable puzzles
- 11-02: Canonical/first puzzle ID used for dedup of alternate syntaxes
- 11-02: Guardian riddle hints: tier 1-2 hint at sources, only tier 3 reveals answers
- 11-02: Hint voice: Tier 1=coy, Tier 2=exasperated/naming objects, Tier 3=bluntly explicit

### Pending Todos

None.

### Blockers/Concerns

- Flux pixel art LoRA needs empirical testing on 3 rooms before bulk generation
- iOS Safari visualViewport keyboard behavior needs real-device verification (Phase 13)
- Parallax layer decomposition strategy resolved in 09-02: shared per-act sky+mid, unique per-room ground

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 11-02-PLAN.md (Phase 11 complete)
Resume file: None
