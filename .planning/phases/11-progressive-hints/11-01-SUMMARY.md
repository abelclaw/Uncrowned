---
phase: 11-progressive-hints
plan: 01
subsystem: gameplay
tags: [hints, progressive-hints, game-state, migration, text-parser]

# Dependency graph
requires:
  - phase: 04-text-parser
    provides: "VerbTable, CommandDispatcher, GameAction types"
  - phase: 05-puzzle-engine
    provides: "PuzzleEngine, PuzzleDefinition, puzzle-solved flag convention"
  - phase: 09-art-pipeline
    provides: "GameState v2 schema with migration chain"
provides:
  - "HintSystem class with tier escalation and auto-escalation"
  - "GameState v3 schema with hintTiers and failedAttempts"
  - "v2-to-v3 migration for backward-compatible save loading"
  - "'hint' verb in VerbTable and CommandDispatcher"
  - "PuzzleHint type and puzzleHints field on RoomData"
affects: [11-progressive-hints-plan-02, room-data-authoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration chain: v1->v2->v3 sequential version-to-version functions"
    - "Hint auto-escalation: failed attempts >= 3 -> tier 1, >= 5 -> tier 2"
    - "Hint relevance scoring: unsolved puzzles ranked by failed attempt count"

key-files:
  created:
    - src/game/systems/HintSystem.ts
    - src/game/state/migrations/v2-to-v3.ts
    - src/game/__tests__/HintSystem.test.ts
  modified:
    - src/game/types/GameAction.ts
    - src/game/types/RoomData.ts
    - src/game/state/GameStateTypes.ts
    - src/game/state/GameState.ts
    - src/game/state/migrations/index.ts
    - src/game/parser/VerbTable.ts
    - src/game/systems/CommandDispatcher.ts
    - src/game/__tests__/migrations.test.ts
    - src/game/__tests__/GameState.test.ts
    - src/game/__tests__/SaveManager.test.ts

key-decisions:
  - "Hint auto-escalation thresholds: 3 failed attempts -> tier 1, 5 -> tier 2"
  - "Hint relevance scoring prioritizes puzzles with most failed attempts"
  - "PuzzleHint type uses fixed 3-element tuple for tier text"

patterns-established:
  - "Progressive hint pattern: HintSystem reads puzzleHints from RoomData, tracks tiers in GameState"
  - "Failed attempt tracking: CommandDispatcher detects trigger match + condition failure for once-puzzles"

requirements-completed: [HINT-01, HINT-02, HINT-03, HINT-04]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 11 Plan 01: Progressive Hints Runtime Summary

**HintSystem with 3-tier escalation, auto-escalation from failed attempts, GameState v3 migration, and hint verb integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T22:04:18Z
- **Completed:** 2026-02-21T22:09:56Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- HintSystem class selects most relevant unsolved puzzle and returns appropriate tier hint (0->1->2, capped)
- Auto-escalation from failed puzzle attempts (3+ -> tier 1, 5+ -> tier 2) without player requesting hints
- GameState v3 schema with hintTiers and failedAttempts fields, full v1->v2->v3 migration chain
- "hint" verb registered with natural language synonyms (help, stuck, clue, "what do I do", "I'm stuck")
- 11 HintSystem unit tests + updated migration and version tests (152 total tests pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: GameState v3 schema, migration, HintSystem class, and type extensions** - `f7b195c` (feat)
2. **Task 2: VerbTable registration and CommandDispatcher integration** - `74e2833` (feat)
3. **Task 3: Unit tests for HintSystem and v2-to-v3 migration** - `e9b1f01` (test)

## Files Created/Modified
- `src/game/systems/HintSystem.ts` - Progressive hint selection with tier escalation and auto-escalation
- `src/game/state/migrations/v2-to-v3.ts` - Save migration adding hintTiers and failedAttempts
- `src/game/__tests__/HintSystem.test.ts` - 11 unit tests for hint system
- `src/game/types/GameAction.ts` - Added 'hint' to Verb union type
- `src/game/types/RoomData.ts` - Added PuzzleHint interface and puzzleHints field
- `src/game/state/GameStateTypes.ts` - Bumped to v3, added hintTiers/failedAttempts fields
- `src/game/state/GameState.ts` - Added hint tracking accessors (getHintTier, setHintTier, etc.)
- `src/game/state/migrations/index.ts` - Registered v2->v3 migration
- `src/game/parser/VerbTable.ts` - Added hint verb with synonyms and patterns
- `src/game/systems/CommandDispatcher.ts` - Integrated HintSystem, added failed attempt tracking
- `src/game/__tests__/migrations.test.ts` - Added v2->v3 and chain tests
- `src/game/__tests__/GameState.test.ts` - Updated version expectations to 3
- `src/game/__tests__/SaveManager.test.ts` - Updated version expectations to 3

## Decisions Made
- Hint auto-escalation thresholds: 3 failed attempts -> tier 1, 5 -> tier 2 (provides gradual assistance)
- Hint relevance scoring: puzzles with most failed attempts get prioritized (players get help where they struggle most)
- PuzzleHint uses fixed 3-element tuple `[string, string, string]` for tiers (enforces exactly 3 tiers at type level)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing test version expectations from 2 to 3**
- **Found during:** Task 3 (Unit tests)
- **Issue:** GameState.test.ts and SaveManager.test.ts had 7 tests hardcoding `version: 2` expectations that broke after schema bump to v3
- **Fix:** Updated all version assertions to expect `3` or `CURRENT_SAVE_VERSION`, and updated test names to be version-agnostic
- **Files modified:** `src/game/__tests__/GameState.test.ts`, `src/game/__tests__/SaveManager.test.ts`
- **Verification:** Full test suite (152 tests) passes
- **Committed in:** `e9b1f01` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for correctness after version bump. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- HintSystem infrastructure is complete and tested
- Plan 02 will author actual puzzleHints content into room JSON files
- Rooms without puzzleHints return sardonic fallback text ("Everything in this room seems to be in order...")

## Self-Check: PASSED

All 4 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 11-progressive-hints*
*Completed: 2026-02-21*
