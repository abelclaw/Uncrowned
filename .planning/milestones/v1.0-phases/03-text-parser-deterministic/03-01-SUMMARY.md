---
phase: 03-text-parser-deterministic
plan: 01
subsystem: parser
tags: [text-parser, regex, verb-synonym, noun-resolution, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-scene-system-player-movement
    provides: "RoomData types (HotspotData, ExitData) used for noun resolution context"
provides:
  - "GameAction and ParseResult type definitions for all command processing"
  - "TextParser class that tokenizes input and produces structured GameAction objects"
  - "VerbTable with 8 canonical verbs, 40+ synonyms, and regex sentence patterns"
  - "NounResolver with multi-strategy fuzzy matching against room context"
  - "50-test TDD suite validating all parser behaviors"
affects: [03-02-command-dispatcher, 04-core-gameplay, 05-llm-integration]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [tdd-red-green, verb-synonym-table, noun-resolution-pipeline, deterministic-parser]

key-files:
  created:
    - src/game/types/GameAction.ts
    - src/game/parser/VerbTable.ts
    - src/game/parser/NounResolver.ts
    - src/game/parser/TextParser.ts
    - src/game/parser/__tests__/TextParser.test.ts
  modified:
    - src/game/types/RoomData.ts
    - package.json

key-decisions:
  - "Go commands prioritize exit resolution over hotspot partial matching to avoid 'go cave' matching 'Dark Cave Mouth' hotspot instead of 'to-cave' exit"
  - "Unresolved nouns return raw string with type:'unknown' instead of failing -- enables future inventory extension in Phase 4"
  - "Vitest installed as project dev dependency for TDD infrastructure"

patterns-established:
  - "Verb-synonym table: canonical verbs map to synonym lists and regex patterns, ordered most-specific-first"
  - "Noun resolution pipeline: exact ID -> exact name -> partial word -> direction -> exit label -> unknown"
  - "Parser produces GameAction objects that are parser-agnostic -- same interface for deterministic and future LLM parser"
  - "Stop words stripped before noun resolution: the, a, an, this, that, those, these, some, my"

requirements-completed: [PARSE-02]

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 3 Plan 01: Deterministic Text Parser Summary

**TDD text parser with verb-synonym table (8 verbs, 40+ synonyms), fuzzy noun resolution against room context, and 50-test vitest suite**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-21T04:07:40Z
- **Completed:** 2026-02-21T04:12:23Z
- **Tasks:** 3 (types, RED tests, GREEN implementation)
- **Files modified:** 7

## Accomplishments
- GameAction/ParseResult types as universal interface between any parser and game systems
- VerbTable with 8 canonical verbs (look, take, use, go, talk, open, push, pull) and 40+ synonyms
- NounResolver with 6-strategy matching: exact ID, exact name, partial word, direction, exit direction/label, unknown fallback
- TextParser pipeline: normalize -> direction shortcuts -> verb match -> noun extract -> stop word strip -> resolve -> GameAction
- Extended RoomData types: HotspotResponses, exit direction/label, room description
- 50 vitest tests covering all verbs, synonyms, two-noun commands, article stripping, directions, case insensitivity, error cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Types (GameAction + RoomData extensions)** - `0fe2f57` (feat)
2. **Task 2: Failing test suite (RED)** - `74e278a` (test)
3. **Task 3: Implementation VerbTable + NounResolver + TextParser (GREEN)** - `4310df1` (feat)

## Files Created/Modified
- `src/game/types/GameAction.ts` - Verb type, GameAction interface, ParseResult interface
- `src/game/types/RoomData.ts` - Added HotspotResponses, exit direction/label, room description
- `src/game/parser/VerbTable.ts` - VERB_TABLE array with 8 verb definitions, DIRECTION_SHORTCUTS map
- `src/game/parser/NounResolver.ts` - NounResolver class with multi-strategy fuzzy matching, stop word stripping
- `src/game/parser/TextParser.ts` - TextParser class with full parsing pipeline
- `src/game/parser/__tests__/TextParser.test.ts` - 50 test cases covering all parser behaviors
- `package.json` - Added vitest as dev dependency

## Decisions Made
- Go commands prioritize exit resolution over hotspot partial matching (avoids "go cave" matching "Dark Cave Mouth" hotspot instead of the "to-cave" exit)
- Unresolved nouns return raw string (type:'unknown') rather than failing -- Phase 4 inventory will extend NounResolver to check inventory items
- Vitest installed as project dev dependency (was available globally but not in project)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Go command resolving hotspot instead of exit**
- **Found during:** Task 3 (GREEN implementation)
- **Issue:** "go cave" matched "Dark Cave Mouth" hotspot via NounResolver partial matching before checking exit labels
- **Fix:** Created dedicated resolveGoSubject() method that checks exits (direction, label, targetRoom) before falling back to general noun resolution
- **Files modified:** src/game/parser/TextParser.ts
- **Verification:** Tests for "go cave" and "enter cave" pass, resolving to exit "to-cave"
- **Committed in:** 4310df1 (Task 3 commit)

**2. [Rule 3 - Blocking] Vitest not in project devDependencies**
- **Found during:** Task 3 (GREEN implementation)
- **Issue:** vitest available globally but not in node_modules, causing tsc to fail on test file import
- **Fix:** npm install --save-dev vitest
- **Files modified:** package.json, package-lock.json
- **Verification:** npx tsc --noEmit passes cleanly
- **Committed in:** 4310df1 (Task 3 commit)

**3. [Rule 1 - Bug] Unused GameAction import in TextParser.ts**
- **Found during:** Task 3 (GREEN implementation)
- **Issue:** TypeScript strict mode flagged unused import of GameAction type
- **Fix:** Removed unused import, kept only ParseResult and Verb
- **Files modified:** src/game/parser/TextParser.ts
- **Verification:** npx tsc --noEmit passes cleanly
- **Committed in:** 4310df1 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for correctness and compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Parser produces GameAction objects ready for CommandDispatcher (Plan 03-02)
- RoomData types extended with responses/direction/label/description for Plan 03-02 room JSON updates
- Test infrastructure (vitest) ready for future TDD plans
- NounResolver designed for Phase 4 inventory extension (unknown type returns raw string)

## Self-Check: PASSED

All 7 files verified present. All 3 commit hashes verified in git log.

---
*Phase: 03-text-parser-deterministic*
*Completed: 2026-02-21*
