---
phase: 08-content-production
plan: 01
subsystem: content-design
tags: [narrative-design, puzzle-dependency, story-bible, room-map, adventure-game, dark-comedy]

# Dependency graph
requires:
  - phase: 07-audio-polish
    provides: Complete engine with audio, ready for content production
provides:
  - Complete story bible with 4-act structure, 36 items, 11 NPCs, 43 deaths, 69 flags
  - Puzzle dependency graph validated for winnability across all 4 acts
  - Room connection map for 36 rooms with gated connections and one-way door verification
affects: [08-02, 08-03, 08-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [ron-gilbert-puzzle-dependency-charts, act-based-content-structure, diamond-shaped-puzzle-chains]

key-files:
  created:
    - .planning/phases/08-content-production/story-bible.md
    - .planning/phases/08-content-production/puzzle-dependency-graph.md
    - .planning/phases/08-content-production/room-map.md
  modified: []

key-decisions:
  - "Kingdom of Erelhain setting with petrification curse as central conflict"
  - "Protagonist named Pip -- reluctant hero, traveling tinker mistaken for prophesied savior"
  - "The Clerk as immortal bureaucrat antagonist who is secretly the original curse-caster"
  - "Rite of Administrative Closure as climax -- bureaucratic form-filing breaks the curse"
  - "4-act structure: Demo (7 rooms), Royal Mess (7 rooms), Screaming Caverns (12 rooms), Rite (10 rooms)"
  - "Alternative puzzle solutions where reasonable (bridge toll OR riddle, Clerk memory OR argument)"
  - "Clock tower time puzzle optional but beneficial -- game completable without it"

patterns-established:
  - "Puzzle dependency graph per act with ASCII art visualization and formal validation"
  - "Act gates as convergence points requiring multiple chain completions"
  - "Cross-act item persistence tracked explicitly (torch, decree, crystal)"
  - "Room IDs in snake_case, consistent across all three design documents"

requirements-completed: [NARR-01, NARR-02]

# Metrics
duration: 9min
completed: 2026-02-21
---

# Phase 08 Plan 01: Story Bible, Puzzle Dependency Graph, and Room Map Summary

**Complete narrative design for The Crumbling Crown: 4-act dark comedy adventure with 36 rooms, 36 items, 11 NPCs, 43 deaths, and validated puzzle dependency chains**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-21T15:20:56Z
- **Completed:** 2026-02-21T15:30:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Authored complete story bible establishing the Kingdom of Erelhain, protagonist Pip, the petrification curse, and the bureaucratic Rite of Administrative Closure
- Created puzzle dependency graph for all 4 acts using Ron Gilbert method, validated for no circular dependencies and no unwinnable states
- Built room connection map for 36 rooms with gated connections, one-way door verification, and cross-act boundaries
- Incorporated all existing content (3 rooms, 5 items, 1 NPC, 3 deaths) naturally into the Demo Chapter

## Task Commits

Each task was committed atomically:

1. **Task 1: Author complete story bible** - `7e40ad2` (feat)
2. **Task 2: Create puzzle dependency graph and room map** - `58eec34` (feat)

## Files Created/Modified
- `.planning/phases/08-content-production/story-bible.md` - Complete narrative design: story overview, 4-act breakdown, 36 items, 11 NPCs, 43 deaths, 69 flags, room summary table (597 lines)
- `.planning/phases/08-content-production/puzzle-dependency-graph.md` - Puzzle dependency chains per act with ASCII visualization, act gates, winnability validation (490 lines)
- `.planning/phases/08-content-production/room-map.md` - Room connection map with compass directions, gated connections, one-way door checks, full game overview (222 lines)

## Decisions Made
- **Kingdom of Erelhain** as setting -- crumbling fantasy kingdom with petrification curse provides visual timer and escalating stakes
- **Pip as protagonist** -- traveling tinker mistaken for prophecy fulfillment, deliberately unheroic for dark comedy tone
- **The Clerk as antagonist** -- immortal bureaucrat who unknowingly cast the curse centuries ago, redeemable through memory restoration or bureaucratic argument
- **Bureaucratic climax** -- the Rite of Administrative Closure is literally filing a government form, matching the game's satirical tone
- **36 items (slightly over 25-35 target)** -- extra item ensures complete puzzle coverage without gaps
- **69 flags (below 80-120 target)** -- remaining flags will be set by individual room hotspot interactions and dynamic descriptions in room JSONs
- **Optional clock tower puzzle** -- slows curse but is not required for completion, prevents soft-lock if player misses it
- **Two Clerk resolution paths** -- show memory crystal (emotional) OR argue with curse contract clauses (intellectual), both produce same outcome

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Story bible provides authoritative reference for all room JSON authoring in Plan 02 (Demo Chapter)
- Puzzle dependency graph provides exact conditions/actions for every puzzle definition
- Room map provides exit connections for every room JSON
- All three documents use consistent IDs ready for direct use in JSON authoring

## Self-Check: PASSED

- FOUND: .planning/phases/08-content-production/story-bible.md
- FOUND: .planning/phases/08-content-production/puzzle-dependency-graph.md
- FOUND: .planning/phases/08-content-production/room-map.md
- FOUND: .planning/phases/08-content-production/08-01-SUMMARY.md
- FOUND: 7e40ad2 (Task 1 commit)
- FOUND: 58eec34 (Task 2 commit)

---
*Phase: 08-content-production*
*Completed: 2026-02-21*
