---
phase: 06-npcs-and-dialogue
plan: 02
subsystem: dialogue
tags: [ink, inkjs, npc, dialogue, narrative, conversation-puzzles, compile-script]

# Dependency graph
requires:
  - phase: 06-npcs-and-dialogue
    provides: DialogueManager with inkjs Story lifecycle, NpcDefinition/RoomNpcData types
provides:
  - NPC registry JSON with old_man definition (personality, knowledge, dialogueKey)
  - Compiled ink dialogue for old_man with branching conversation and EXTERNAL function calls
  - Compiled ink narrator_history script for history-aware commentary
  - compile-ink.mjs build script for ink source to JSON compilation
  - NPC placement data in village_path.json room JSON
  - Preloader asset loading for NPC registry and dialogue ink JSON files
affects: [06-npcs-and-dialogue, 08-demo-chapter]

# Tech tracking
tech-stack:
  added: []
  patterns: [ink-source-compile-pipeline, npc-registry-json, room-npc-placement, dialogue-cache-key-prefix]

key-files:
  created:
    - public/assets/data/npcs/npcs.json
    - public/assets/data/ink-source/old_man.ink
    - public/assets/data/ink-source/narrator_history.ink
    - public/assets/data/dialogue/old_man.ink.json
    - public/assets/data/dialogue/narrator_history.ink.json
    - scripts/compile-ink.mjs
  modified:
    - public/assets/data/rooms/village_path.json
    - src/game/scenes/Preloader.ts

key-decisions:
  - "inkjs Compiler class for pre-compilation rather than hand-written JSON -- reliable, maintainable ink authoring"
  - "Ink else-if syntax uses nested conditionals with - else: blocks, not extra conditions in same block"
  - "dialogue- cache key prefix pattern links NpcDefinition.dialogueKey to Preloader asset registration"

patterns-established:
  - "Ink source pipeline: author .ink in ink-source/, compile via scripts/compile-ink.mjs to dialogue/*.ink.json"
  - "NPC placement in room JSON: npcs[] array with id, position, interactionPoint, zone fields"
  - "Preloader dialogue loading: dialogue-{npcId} cache keys matching NpcDefinition.dialogueKey"

requirements-completed: [NPC-04, PUZ-03, PUZ-06, NARR-06]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 6 Plan 02: NPC Content Data and Ink Dialogue Summary

**Old man NPC with branching ink dialogue using 7 EXTERNAL functions for conversation puzzles, narrator history script, ink compile pipeline, and Preloader asset integration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T14:22:50Z
- **Completed:** 2026-02-21T14:26:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created NPC registry with old_man definition including personality, knowledge topics, and dialogue file reference
- Authored old_man.ink with 8 knots of branching dialogue, 7 EXTERNAL function calls (hasItem, hasFlag, setFlag, addItem, removeItem, visitedRoom, getDeathCount), and 6 flag mutations for conversation puzzles
- Authored narrator_history.ink with history-aware commentary based on death count, visited rooms, and NPC interaction flags
- Built compile-ink.mjs build script using inkjs Compiler class for reliable ink-to-JSON compilation
- Extended village_path.json with old_man NPC placement (position, interactionPoint, zone)
- Extended Preloader to load npcs.json registry and both compiled ink dialogue files into Phaser cache

## Task Commits

Each task was committed atomically:

1. **Task 1: Create NPC registry, ink dialogue scripts, and room JSON NPC entries** - `08caef5` (feat)
2. **Task 2: Extend Preloader to load NPC and dialogue assets** - `970f3c4` (feat)

## Files Created/Modified
- `public/assets/data/npcs/npcs.json` - NPC registry with old_man definition (personality, knowledge, dialogueKey)
- `public/assets/data/ink-source/old_man.ink` - Ink source for old man dialogue with branching conversation and flag mutations
- `public/assets/data/ink-source/narrator_history.ink` - Ink source for narrator history-aware commentary
- `public/assets/data/dialogue/old_man.ink.json` - Compiled ink JSON for old man NPC dialogue
- `public/assets/data/dialogue/narrator_history.ink.json` - Compiled ink JSON for narrator history commentary
- `scripts/compile-ink.mjs` - Build script using inkjs Compiler to compile .ink to .ink.json
- `public/assets/data/rooms/village_path.json` - Added npcs array with old_man placement data
- `src/game/scenes/Preloader.ts` - Added NPC registry and dialogue ink JSON asset loading

## Decisions Made
- Used inkjs Compiler class for pre-compilation rather than hand-writing compiled ink JSON -- the compiled format is undocumented and error-prone
- Fixed ink conditional syntax: multi-way branching uses nested `{ condition: ... - else: ... }` blocks, not extra conditions in the same block
- Cache key prefix `dialogue-` links NpcDefinition.dialogueKey field to Preloader asset registration pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ink conditional syntax in narrator_history.ink**
- **Found during:** Task 1 (ink compilation)
- **Issue:** Multi-condition blocks used `- condition:` syntax which ink doesn't support; ink requires `- else:` with nested conditionals for else-if chains
- **Fix:** Restructured narrator_history.ink to use nested `{ condition: ... - else: ... }` blocks instead of chained conditions
- **Files modified:** `public/assets/data/ink-source/narrator_history.ink`
- **Verification:** compile-ink.mjs compiles without errors, output is valid JSON
- **Committed in:** `08caef5` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Ink syntax fix necessary for compilation. No scope creep.

## Issues Encountered
None beyond the ink syntax fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All NPC content data ready for dialogue engine integration (06-03)
- Compiled ink JSON files loadable via Phaser cache for DialogueManager Story instantiation
- NPC placement in village_path.json ready for RoomScene NPC sprite rendering
- Ink compile script available for future NPC dialogue authoring

## Self-Check: PASSED

- All 8 files verified present on disk
- Both task commits (08caef5, 970f3c4) verified in git log
- Compiled ink JSON files contain valid inkVersion:21 and root data
- village_path.json npcs array contains old_man entry
- 104 tests pass, TypeScript compiles clean, Vite build succeeds

---
*Phase: 06-npcs-and-dialogue*
*Completed: 2026-02-21*
