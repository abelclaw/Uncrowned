---
phase: 11-progressive-hints
plan: 02
subsystem: content
tags: [puzzle-hints, room-data, json, narrator-voice, progressive-hints]

# Dependency graph
requires:
  - phase: 11-progressive-hints-01
    provides: "HintSystem runtime, PuzzleHint type, GameState v3 with hintTiers"
  - phase: 08-content-production
    provides: "Room JSON files with puzzles, story bible, puzzle dependency graph"
provides:
  - "41 puzzle hint chains (123 hint texts) across 24 room JSON files"
  - "Complete 3-tier progressive hints for all hintable puzzles in Acts 1-3"
  - "Narrator-voiced sardonic hint content matching game tone"
affects: [gameplay-polish, qa-testing, content-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "puzzleHints array placed after audio field in room JSONs"
    - "Canonical/first puzzleId used for deduplication of alternate puzzle syntaxes"
    - "Simple obvious takes (item-not-taken only) skipped, conditional/multi-step puzzles hinted"

key-files:
  modified:
    - public/assets/data/rooms/forest_clearing.json
    - public/assets/data/rooms/cave_entrance.json
    - public/assets/data/rooms/village_square.json
    - public/assets/data/rooms/forest_bridge.json
    - public/assets/data/rooms/old_watchtower.json
    - public/assets/data/rooms/castle_courtyard.json
    - public/assets/data/rooms/castle_hallway.json
    - public/assets/data/rooms/royal_kitchen.json
    - public/assets/data/rooms/servants_quarters.json
    - public/assets/data/rooms/throne_room.json
    - public/assets/data/rooms/clock_tower.json
    - public/assets/data/rooms/cavern_entrance_hall.json
    - public/assets/data/rooms/filing_room.json
    - public/assets/data/rooms/cavern_library.json
    - public/assets/data/rooms/cavern_west_wing.json
    - public/assets/data/rooms/echo_chamber.json
    - public/assets/data/rooms/underground_pool.json
    - public/assets/data/rooms/underground_river.json
    - public/assets/data/rooms/forge_chamber.json
    - public/assets/data/rooms/crystal_chamber.json
    - public/assets/data/rooms/guardian_chamber.json
    - public/assets/data/rooms/mirror_hall.json
    - public/assets/data/rooms/dungeon.json
    - public/assets/data/rooms/throne_room_act3.json

key-decisions:
  - "Skipped simple takes (item-not-taken only) per plan guidance -- 11 rooms have no hintable puzzles"
  - "Used canonical/first puzzle ID for dedup: e.g. combine-stick-mushroom not combine-mushroom-stick"
  - "Guardian riddle hints escalate: tier 1-2 hint at sources, only tier 3 reveals actual answers (847, Aldric, Service)"
  - "Bureaucracy hints extra sardonic per plan: filing room and entrance hall lean into absurdity"

patterns-established:
  - "Hint voice pattern: Tier 1 = coy/withholding, Tier 2 = exasperated/naming objects, Tier 3 = bluntly explicit with exact steps"
  - "Multi-step hints reference prerequisites progressively: tier 2 names items, tier 3 names rooms"
  - "Conditional takes get hints, unconditional takes do not"

requirements-completed: [HINT-04, HINT-05]

# Metrics
duration: 35min
completed: 2026-02-21
---

# Phase 11 Plan 02: Puzzle Hint Content Summary

**41 sardonic 3-tier hint chains across 24 rooms covering all hintable puzzles in Acts 1-3**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-02-21T21:48:00Z
- **Completed:** 2026-02-21T22:23:31Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments
- Authored 41 unique puzzle hint chains with 123 individual hint texts across 24 room JSON files
- All hints written in the narrator's sardonic, reluctant, condescending voice matching existing room descriptions and death texts
- Multi-step puzzle hints properly reference prerequisite items and rooms with escalating specificity
- Guardian riddle hints protect answer spoilers until tier 3, per plan requirement
- Act 2 bureaucracy hints lean into absurdity of filing forms, stamps, and queue tickets
- Complete validation: all puzzleIds match real puzzles, all hints have exactly 3 tiers, all JSON parses cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Author puzzleHints for Act 1a and Act 1b rooms (14 rooms)** - `e20d40f` (feat)
2. **Task 2: Author puzzleHints for Act 2 and Act 3 rooms (22 rooms)** - `74abbd4` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified

**Act 1a rooms (6 with hints):**
- `public/assets/data/rooms/forest_clearing.json` - 1 hint: take-rusty-key (hidden in stump)
- `public/assets/data/rooms/cave_entrance.json` - 2 hints: use-key-on-door, combine-stick-mushroom
- `public/assets/data/rooms/village_square.json` - 1 hint: take-toll-coin (hidden between stones)
- `public/assets/data/rooms/forest_bridge.json` - 2 hints: answer-riddle-correct, pay-toll
- `public/assets/data/rooms/old_watchtower.json` - 1 hint: use-lens-on-telescope
- `public/assets/data/rooms/castle_courtyard.json` - 3 hints: show-crystal-to-guards, fill-chalice-at-well, combine-chalice-sage

**Act 1b rooms (5 with hints):**
- `public/assets/data/rooms/castle_hallway.json` - 1 hint: use-skeleton-key (multi-step chain)
- `public/assets/data/rooms/royal_kitchen.json` - 1 hint: give-flour-to-cook
- `public/assets/data/rooms/servants_quarters.json` - 2 hints: use-rat-trap, take-flour (conditional)
- `public/assets/data/rooms/throne_room.json` - 2 hints: use-spirit-brew, seal-decree
- `public/assets/data/rooms/clock_tower.json` - 1 hint: repair-clock (gear-spring + clock-oil)

**Act 2 rooms (9 with hints):**
- `public/assets/data/rooms/cavern_entrance_hall.json` - 2 hints: submit-filled-form, show-vip-ticket
- `public/assets/data/rooms/filing_room.json` - 2 hints: fill-form, stamp-ticket
- `public/assets/data/rooms/cavern_library.json` - 2 hints: read-mushroom-book, read-guardian-book
- `public/assets/data/rooms/cavern_west_wing.json` - 1 hint: solve-mushroom-pattern
- `public/assets/data/rooms/echo_chamber.json` - 1 hint: solve-echo-puzzle
- `public/assets/data/rooms/underground_pool.json` - 2 hints: investigate-pool, take-crystal-shard
- `public/assets/data/rooms/underground_river.json` - 1 hint: repair-boat (wood-planks + rope)
- `public/assets/data/rooms/forge_chamber.json` - 2 hints: light-forge, repair-seal
- `public/assets/data/rooms/crystal_chamber.json` - 1 hint: take-crystal (barrier-dependent)

**Act 3 rooms (4 with hints):**
- `public/assets/data/rooms/guardian_chamber.json` - 4 hints: activate-guardian, answer-question-1/2/3
- `public/assets/data/rooms/mirror_hall.json` - 1 hint: mirror-truth
- `public/assets/data/rooms/dungeon.json` - 3 hints: use-treasury-key, show-memory-crystal, outwit-clerk
- `public/assets/data/rooms/throne_room_act3.json` - 2 hints: prepare-rite, perform-rite

**Rooms with no hintable puzzles (11 skipped):**
village_path, castle_garden, treasury, waiting_room, cavern_east_wing, cavern_balcony, petrified_forest, wizard_tower, royal_archive, castle_courtyard_act3, rooftop

## Decisions Made
- Skipped simple takes (items with only `item-not-taken` condition and obvious room description context) -- these don't benefit from hints
- Used canonical/first puzzle ID for deduplication when multiple puzzle entries handle different phrasings of the same action
- Guardian riddle hints: tier 1 hints at information sources, tier 2 names the source rooms, tier 3 gives actual answers (847, Aldric the Fastidious, Service)
- Act 2 bureaucracy hints emphasize the absurdity of the bureaucratic system per plan guidance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Shell escaping of `!` in zsh when running `node -e` inline scripts (carried over from Task 1). Resolved by using a temporary validation script file (`tmp-validate-hints.js`) instead of inline evaluation. Script was cleaned up after validation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The progressive hint system is now fully functional end-to-end: HintSystem runtime (plan 01) reads puzzleHints (plan 02) from room data, tracks escalation in GameState v3
- All 41 hintable puzzles have authored hints; player can type "hint" at any time and receive context-appropriate, in-character guidance
- Phase 11 is complete -- no further plans remain

## Self-Check: PASSED

- All 7 key files verified present
- Both task commits (e20d40f, 74abbd4) verified in git log
- 24 rooms with hints, 12 rooms without (correct coverage)
- All puzzleIds match real puzzle IDs in same room
- All hints have exactly 3 tiers
- All JSON parses cleanly
- TypeScript compilation passes

---
*Phase: 11-progressive-hints*
*Completed: 2026-02-21*
