---
phase: 09-art-pipeline-schema-foundation
plan: 01
subsystem: state
tags: [save-versioning, migration, localStorage, export-import, singleton]

# Dependency graph
requires:
  - phase: 04-game-state-save-system
    provides: GameState singleton, SaveManager, GameStateTypes
provides:
  - CURRENT_SAVE_VERSION constant and versioned GameStateData interface
  - Sequential migration chain (v1->v2) with automatic version detection
  - MetaGameState singleton for cross-playthrough persistence (deaths, endings)
  - Save export/import with format validation and migration support
affects: [10-death-gallery-ui, 11-hint-system, 12-endings-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [migration-chain, meta-state-singleton, save-export-format]

key-files:
  created:
    - src/game/state/migrations/index.ts
    - src/game/state/migrations/v1-to-v2.ts
    - src/game/state/MetaGameState.ts
    - src/game/__tests__/migrations.test.ts
    - src/game/__tests__/MetaGameState.test.ts
  modified:
    - src/game/state/GameStateTypes.ts
    - src/game/state/GameState.ts
    - src/game/state/SaveManager.ts
    - src/game/__tests__/GameState.test.ts
    - src/game/__tests__/SaveManager.test.ts

key-decisions:
  - "MetaGameState uses its own localStorage key (kqgame-meta) independent of save slots"
  - "Migration chain uses sequential version-to-version functions for forward-only upgrades"
  - "Export format uses 'kqgame-save' identifier with version 1 envelope wrapping both states"
  - "parseImportData returns gameState as JSON string so deserialize() handles migration transparently"

patterns-established:
  - "Migration pattern: add versioned function in migrations/ dir, register in migrations/index.ts registry"
  - "MetaGameState singleton pattern: resetInstance() for testing, auto-save on record methods"
  - "Export envelope pattern: { format, version, exportedAt, gameState, metaState }"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 9 Plan 1: Save Schema Versioning Summary

**Versioned save schema with v1->v2 migration chain, MetaGameState cross-playthrough persistence, and save export/import with format validation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T20:42:26Z
- **Completed:** 2026-02-21T20:47:09Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Save schema versioned with CURRENT_SAVE_VERSION=2 and automatic migration on deserialize
- v1 saves (no version field) seamlessly upgrade to v2 with all data preserved and missing fields defaulted
- MetaGameState singleton persists deaths and endings to kqgame-meta localStorage key, survives save slot loads
- Save export/import with format validation, enabling cross-browser save transfer
- 33 new tests (137 total), zero type errors, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema versioning, migration chain, and MetaGameState (TDD)**
   - `75b6fa9` (test) - Failing tests for migrations, GameState version, MetaGameState
   - `ff66e83` (feat) - Implementation: GameStateTypes version, migrations, MetaGameState singleton

2. **Task 2: Save export/import with migration support (TDD)**
   - `e7c51a7` (test) - Failing tests for export/import and migration-aware loads
   - `ec610d0` (feat) - Implementation: createExportData, parseImportData, exportSaveToFile, importSaveFromFile

## Files Created/Modified
- `src/game/state/GameStateTypes.ts` - Added version field to GameStateData, CURRENT_SAVE_VERSION=2
- `src/game/state/GameState.ts` - deserialize() now runs migrate() automatically
- `src/game/state/migrations/index.ts` - Migration registry and sequential migrate() function
- `src/game/state/migrations/v1-to-v2.ts` - v1->v2 migration with field defaults
- `src/game/state/MetaGameState.ts` - Singleton for cross-playthrough deaths/endings persistence
- `src/game/state/SaveManager.ts` - Added createExportData, parseImportData, exportSaveToFile, importSaveFromFile
- `src/game/__tests__/migrations.test.ts` - 6 tests for migration chain
- `src/game/__tests__/MetaGameState.test.ts` - 11 tests for MetaGameState singleton
- `src/game/__tests__/GameState.test.ts` - Added 5 version-aware tests (22 total)
- `src/game/__tests__/SaveManager.test.ts` - Added 11 export/import tests (23 total)

## Decisions Made
- MetaGameState uses its own localStorage key (kqgame-meta) independent of save slots -- ensures cross-playthrough data survives new-game and slot loads
- Migration chain uses sequential version-to-version functions registered in a map -- each migration bumps to next version, loop applies until current
- Export format uses 'kqgame-save' format identifier with version 1 envelope -- allows future envelope format changes independent of game state version
- parseImportData returns gameState as JSON string so caller uses state.deserialize() which runs migration transparently -- no duplicate migration logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MetaGameState is ready for death gallery UI (Phase 10) to call recordDeath/getDeathsDiscovered
- Migration chain is extensible -- future schema changes just add a new migration file and registry entry
- Export/import methods are ready for settings UI integration
- All 137 tests pass with zero type errors

## Self-Check: PASSED

All 11 files verified on disk. All 4 task commits verified in git history.

---
*Phase: 09-art-pipeline-schema-foundation*
*Completed: 2026-02-21*
