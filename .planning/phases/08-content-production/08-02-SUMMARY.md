---
phase: 08-content-production
plan: 02
subsystem: content-authoring
tags: [room-json, puzzle-design, ink-dialogue, npc-system, dark-comedy, demo-chapter, adventure-game]

# Dependency graph
requires:
  - phase: 08-content-production/01
    provides: Story bible, puzzle dependency graph, and room map defining all demo chapter content
provides:
  - 7 production-quality room JSON files for the complete Demo Chapter (Act 1a)
  - 9 items registered in items.json covering all Act 1a puzzle chains
  - 2 NPCs (old_man, stone_merchant) with complete ink dialogue scripts
  - 18 puzzles, 11 death triggers, 7 unique death scenarios
  - All assets registered in Preloader for loading
affects: [08-03, 08-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [room-json-authoring-pattern, ink-dialogue-with-slow-speech, cross-room-puzzle-chains, death-trigger-patterns]

key-files:
  created:
    - public/assets/data/rooms/cave_depths.json
    - public/assets/data/rooms/underground_pool.json
    - public/assets/data/rooms/village_square.json
    - public/assets/data/rooms/old_watchtower.json
    - public/assets/data/ink-source/stone_merchant.ink
    - public/assets/data/dialogue/stone_merchant.ink.json
    - scripts/validate-rooms.mjs
  modified:
    - public/assets/data/rooms/forest_clearing.json
    - public/assets/data/rooms/cave_entrance.json
    - public/assets/data/rooms/village_path.json
    - public/assets/data/items.json
    - public/assets/data/npcs/npcs.json
    - public/assets/data/ink-source/old_man.ink
    - public/assets/data/ink-source/narrator_history.ink
    - src/game/scenes/Preloader.ts

key-decisions:
  - "7 rooms for Act 1a matching story bible exactly (not 5-8 range, but the full 7 defined)"
  - "Stone merchant uses slow ellipsis speech pattern to convey petrification mechanically"
  - "Combine puzzles defined in both orderings (A+B and B+A) per engine decision"
  - "crystal_grotto from plan frontmatter replaced by underground_pool per story bible authority"
  - "Room validation script added as development tooling for cross-reference checks"

patterns-established:
  - "Room JSON authoring: 3-4 hotspots with full verb responses, sardonic narrator voice throughout"
  - "Death triggers: verb-specific (push beehive, use railing) not just room-entry"
  - "Puzzle gating via flag conditions on exits (door-unlocked, has-item:makeshift-torch)"
  - "Dynamic descriptions keyed to most-important-flag for room state changes"
  - "NPC ink dialogue: separate greeting/menu pattern, EXTERNAL function declarations, tag-based speaker/emotion"

requirements-completed: [NARR-01, NARR-02]

# Metrics
duration: 10min
completed: 2026-02-21
---

# Phase 08 Plan 02: Demo Chapter Content Authoring Summary

**Complete 7-room Demo Chapter (Act 1a) with 18 puzzles, 7 deaths, 2 NPCs, 9 items, and branching ink dialogue -- playable from forest_clearing through the act gate**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-21T15:34:00Z
- **Completed:** 2026-02-21T15:44:11Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Authored complete Demo Chapter with 7 interconnected rooms forming a playable 30-60 minute experience
- Implemented all 4 puzzle chains (Key & Door, Light Source, Knowledge, Discovery) matching the puzzle dependency graph exactly
- Created 7 unique death scenarios with sardonic narrator commentary in dark comedy voice
- Expanded old_man dialogue with curse info, crystal reaction, and torch crafting hints; created stone_merchant with petrified slow-speech pattern
- All ink scripts compile, build succeeds, 104 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Author demo chapter room JSONs, items, and puzzles** - `5f5bc2f` (feat)
2. **Task 2: Author NPC dialogue, narrator history, and register assets** - `a99e11a` (feat)

## Files Created/Modified
- `public/assets/data/rooms/forest_clearing.json` - Updated starting room with wildflowers hotspot, expanded narrator voice
- `public/assets/data/rooms/cave_entrance.json` - Updated with gated exit to cave_depths, rock-ledge hotspot, both combine orderings
- `public/assets/data/rooms/village_path.json` - Updated with east exit to village_square, signpost and forest-edge hotspots
- `public/assets/data/rooms/cave_depths.json` - New room: dark chamber requiring torch, bones hotspot, death-by-darkness trigger
- `public/assets/data/rooms/underground_pool.json` - New room: crystal shard location, pool reflection puzzle, drown death
- `public/assets/data/rooms/village_square.json` - New room: petrified fountain, notice board (curse knowledge), stone merchant NPC, toll coin
- `public/assets/data/rooms/old_watchtower.json` - New room: telescope + lens puzzle (seen_castle flag), railing death, panoramic view
- `public/assets/data/items.json` - Updated: 9 items (5 existing + 4 new: cave-crystal-shard, telescope-lens, notice-board-posting, bridge-toll-coin)
- `public/assets/data/npcs/npcs.json` - Updated: 2 NPCs (old_man expanded knowledge, stone_merchant added)
- `public/assets/data/ink-source/old_man.ink` - Expanded: curse_info, crystal_reaction, bottle-safe flag, torch crafting hints
- `public/assets/data/ink-source/stone_merchant.ink` - New: half-petrified merchant with slow speech pattern
- `public/assets/data/ink-source/narrator_history.ink` - Expanded: covers all 7 rooms, death milestones, knowledge flags
- `public/assets/data/dialogue/*.ink.json` - 3 compiled ink dialogue files
- `src/game/scenes/Preloader.ts` - Registers all 7 room JSONs and stone_merchant dialogue
- `scripts/validate-rooms.mjs` - Room cross-reference validation script

## Decisions Made
- **7 rooms per story bible:** The plan suggested 5-8 rooms but the story bible defined exactly 7 for Act 1a; authored all 7 for completeness
- **crystal_grotto replaced by underground_pool:** Plan frontmatter listed crystal_grotto but the story bible defines underground_pool as the Act 1a crystal location; followed story bible as authoritative
- **Stone merchant slow speech:** Petrified NPC uses ellipsis-separated words to mechanically convey the petrification affecting his speech
- **Both combine orderings:** Every combine puzzle defined for A+B and B+A per engine decision from Phase 04
- **Validation script:** Added scripts/validate-rooms.mjs for cross-reference checking (items, exits, deaths) -- development tooling for future content authoring

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ink syntax: asterisk-prefixed lines parsed as choices**
- **Found during:** Task 2 (ink dialogue authoring)
- **Issue:** Lines starting with `*` (for emphasis like `*The old man leans in*`) were interpreted as ink one-time choices, causing compilation errors
- **Fix:** Replaced `*emphasis*` with plain descriptive text (e.g., "The old man leans in conspiratorially.")
- **Files modified:** public/assets/data/ink-source/old_man.ink, public/assets/data/ink-source/stone_merchant.ink
- **Verification:** `node scripts/compile-ink.mjs` compiles all 3 ink files without errors

**2. [Rule 1 - Bug] Fixed ink conditional structure: choices inside conditionals need explicit diverts**
- **Found during:** Task 2 (stone_merchant.ink)
- **Issue:** Choices placed directly inside greeting conditional blocks caused "Choices nested in conditionals need explicit divert" errors
- **Fix:** Extracted choices into a separate `=== menu ===` knot, with all conditional branches diverting to `-> menu`
- **Files modified:** public/assets/data/ink-source/stone_merchant.ink
- **Verification:** `node scripts/compile-ink.mjs` compiles without errors

---

**Total deviations:** 2 auto-fixed (2 bugs: ink syntax issues)
**Impact on plan:** Minimal -- both were standard ink language gotchas resolved by adjusting text formatting. No scope creep.

## Issues Encountered
- Ink compiler rejects `*text*` emphasis at line start -- ink interprets leading `*` as a one-time choice marker. Resolved by using plain descriptive text instead of asterisk emphasis.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 7 Demo Chapter rooms are production-ready with complete content
- Puzzle chains validated against dependency graph -- all 4 chains (Key & Door, Light, Knowledge, Discovery) are fully implemented
- 2 NPCs with branching dialogue ready for gameplay testing
- Room validation script available for future content authoring (Plans 03-04)
- Preloader registers all demo assets -- game can load and play the complete demo chapter

## Self-Check: PASSED

- FOUND: public/assets/data/rooms/cave_depths.json
- FOUND: public/assets/data/rooms/underground_pool.json
- FOUND: public/assets/data/rooms/village_square.json
- FOUND: public/assets/data/rooms/old_watchtower.json
- FOUND: public/assets/data/ink-source/stone_merchant.ink
- FOUND: public/assets/data/dialogue/stone_merchant.ink.json
- FOUND: 5f5bc2f (Task 1 commit)
- FOUND: a99e11a (Task 2 commit)

---
*Phase: 08-content-production*
*Completed: 2026-02-21*
