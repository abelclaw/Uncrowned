---
phase: 08-content-production
plan: 03
subsystem: content
tags: [rooms, puzzles, items, npcs, ink-dialogue, narrator, preloader, act-gates]

# Dependency graph
requires:
  - phase: 08-content-production/02
    provides: "Demo chapter rooms, items, NPCs, dialogue, narrator history, Preloader registration pattern"
provides:
  - "19 new room JSON files for Acts 1b and 2"
  - "24 new items in items.json registry"
  - "6 new NPCs with compiled ink dialogue"
  - "Expanded narrator_history.ink covering Acts 1b-2 milestones"
  - "Act gates: 1a->1b (old_watchtower->forest_bridge) and 1b->2 (forest_bridge->cavern_entrance_hall)"
  - "All new assets registered in Preloader.ts"
affects: [08-content-production/04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Act gate exits with multi-condition gating (flags + items)"
    - "Both combine orderings (A+B and B+A) plus use-variant for all combinable puzzles"
    - "NPC visibility conditions on room npc entries"
    - "Sequential flag-gated puzzle chains (guardian 3-question test)"

key-files:
  created:
    - public/assets/data/rooms/forest_bridge.json
    - public/assets/data/rooms/castle_courtyard.json
    - public/assets/data/rooms/castle_hallway.json
    - public/assets/data/rooms/throne_room.json
    - public/assets/data/rooms/royal_kitchen.json
    - public/assets/data/rooms/castle_garden.json
    - public/assets/data/rooms/servants_quarters.json
    - public/assets/data/rooms/cavern_entrance_hall.json
    - public/assets/data/rooms/cavern_library.json
    - public/assets/data/rooms/filing_room.json
    - public/assets/data/rooms/waiting_room.json
    - public/assets/data/rooms/cavern_west_wing.json
    - public/assets/data/rooms/crystal_chamber.json
    - public/assets/data/rooms/cavern_balcony.json
    - public/assets/data/rooms/echo_chamber.json
    - public/assets/data/rooms/cavern_east_wing.json
    - public/assets/data/rooms/underground_river.json
    - public/assets/data/rooms/forge_chamber.json
    - public/assets/data/rooms/guardian_chamber.json
    - public/assets/data/ink-source/bridge_troll.ink
    - public/assets/data/ink-source/ghost_king.ink
    - public/assets/data/ink-source/castle_cook.ink
    - public/assets/data/ink-source/the_clerk.ink
    - public/assets/data/ink-source/queue_ghost.ink
    - public/assets/data/ink-source/dwarven_spirit.ink
  modified:
    - public/assets/data/rooms/old_watchtower.json
    - public/assets/data/items.json
    - public/assets/data/npcs/npcs.json
    - public/assets/data/ink-source/narrator_history.ink
    - src/game/scenes/Preloader.ts

key-decisions:
  - "Act 1a->1b gate on old_watchtower requires 4 conditions: door-unlocked, knows_cavern_secret, cave-crystal-shard, seen_castle"
  - "Act 1b->2 gate on forest_bridge requires 4 conditions: decree-sealed, ghost_approved_decree, castle-map, skeleton-key-used"
  - "Guardian chamber uses sequential 3-question test with progressive flag gates (q1_correct, q2_correct, q3_correct)"
  - "Spirit-brew crafting chain: empty-chalice -> fill at well -> water-chalice -> combine with dried-sage -> spirit-brew"
  - "VIP stamp bypass as parallel path through bureaucratic queue (alternative to 347-year wait)"

patterns-established:
  - "Act gate pattern: conditional exit with multiple flag-set and has-item conditions"
  - "Multi-step crafting: intermediate items created via fill/combine then used in later puzzles"
  - "NPC revelation gating: key NPCs only appear after specific puzzle completion (Ghost King after spirit-brew)"
  - "Parallel puzzle convergence: multiple independent chains must all complete before gate opens"

requirements-completed: [NARR-01, NARR-02]

# Metrics
duration: 14min
completed: 2026-02-21
---

# Phase 8 Plan 3: Acts 1b-2 Content Summary

**19 room JSONs, 24 items, 6 NPCs with ink dialogue, 45 death triggers, and act gate puzzles spanning castle intrigue through bureaucratic dungeon crawling**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-21T15:47:58Z
- **Completed:** 2026-02-21T16:01:54Z
- **Tasks:** 2
- **Files modified:** 37

## Accomplishments
- Authored 7 Act 1b rooms (forest_bridge through servants_quarters) with castle intrigue puzzles: troll riddle, spirit-brew crafting, royal decree forging, rat extermination, skeleton key discovery
- Authored 12 Act 2 rooms (cavern_entrance_hall through guardian_chamber) with bureaucratic dungeon puzzles: form filing, queue bypassing, mushroom light patterns, boat repair, forge lighting, 3-question guardian test
- Created 6 NPC ink dialogue scripts with state-aware conversations, flag-setting, item-gated options, and death-count-reactive greetings
- Expanded narrator_history.ink with Acts 1b-2 room commentary, progression milestones, and higher death count reactions (15+, 20+)
- Implemented act gates (1a->1b on old_watchtower, 1b->2 on forest_bridge) with multi-condition flag/item requirements
- Total game content: 26 rooms, 31 items, 83 puzzles, 45 death triggers, 31 death definitions, 9 NPCs

## Task Commits

Each task was committed atomically:

1. **Task 1: Author Act 1b room JSONs, items, and puzzles** - `eaee9ad` (feat)
2. **Task 2: Author Act 2 rooms, all NPCs/dialogue for 1b-2, narrator history, and Preloader registration** - `d947210` (feat)

## Files Created/Modified

**Act 1b Rooms (Task 1):**
- `public/assets/data/rooms/forest_bridge.json` - Bridge troll gatekeeper, riddle/toll crossing, Act 1b->2 gate exit
- `public/assets/data/rooms/castle_courtyard.json` - Hub room with guards, well, spirit-brew crafting
- `public/assets/data/rooms/castle_hallway.json` - Central corridor, skeleton-key puzzle, castle-map discovery
- `public/assets/data/rooms/throne_room.json` - Royal seal, Ghost King NPC (post spirit-brew), decree sealing
- `public/assets/data/rooms/royal_kitchen.json` - Martha the Cook, flour-for-skeleton-key trade
- `public/assets/data/rooms/castle_garden.json` - Dried sage, rat trap, poison herb death
- `public/assets/data/rooms/servants_quarters.json` - Blank decree, flour (post rat clearance), rat swarm death

**Act 2 Rooms (Task 2):**
- `public/assets/data/rooms/cavern_entrance_hall.json` - The Clerk, registration desk, form submission, VIP bypass
- `public/assets/data/rooms/cavern_library.json` - Ancient ink, mushroom/guardian knowledge books, shelf collapse death
- `public/assets/data/rooms/filing_room.json` - Form 27B/6, hidden VIP stamp, paper cut death
- `public/assets/data/rooms/waiting_room.json` - Queue Ghost NPC, 347-year wait, boredom death
- `public/assets/data/rooms/cavern_west_wing.json` - Mushroom light puzzle, poison death
- `public/assets/data/rooms/crystal_chamber.json` - Crystal of Mundanity behind force barrier
- `public/assets/data/rooms/cavern_balcony.json` - Rope item, balcony fall death
- `public/assets/data/rooms/echo_chamber.json` - Third guardian answer ("Service"), echo/stalactite deaths
- `public/assets/data/rooms/cavern_east_wing.json` - Flooded corridor, dark water death
- `public/assets/data/rooms/underground_river.json` - Boat repair puzzle (wood-planks + rope), drowning/waterfall deaths
- `public/assets/data/rooms/forge_chamber.json` - Dwarven Spirit NPC, forge lighting, seal repair
- `public/assets/data/rooms/guardian_chamber.json` - 3-question test (847, Aldric, Service), guardian smash death

**NPC Dialogue (Task 2):**
- `public/assets/data/ink-source/bridge_troll.ink` - Bertram with riddle, book club, toll option
- `public/assets/data/ink-source/ghost_king.ink` - Dead monarch with kingdom history, decree approval, curse/artifact info
- `public/assets/data/ink-source/castle_cook.ink` - Martha with flour problem, spirit-brew hint, skeleton-key reward
- `public/assets/data/ink-source/the_clerk.ink` - Immortal bureaucrat with test/form/queue information
- `public/assets/data/ink-source/queue_ghost.ink` - Gilbert #645 with VIP bypass hint, ceiling crack passion
- `public/assets/data/ink-source/dwarven_spirit.ink` - Forge keeper with seal repair, founding history

**Modified files:**
- `public/assets/data/rooms/old_watchtower.json` - Added Act 1a->1b gate exit to forest_bridge
- `public/assets/data/items.json` - Added 24 items (12 Act 1b + 12 Act 2)
- `public/assets/data/npcs/npcs.json` - Added 6 NPCs with personality, knowledge, dialogueKey
- `public/assets/data/ink-source/narrator_history.ink` - Expanded with Acts 1b-2 commentary
- `src/game/scenes/Preloader.ts` - Registered 19 room JSONs and 6 dialogue files

## Decisions Made
- Act 1a->1b gate requires 4 conditions (door-unlocked, knows_cavern_secret, cave-crystal-shard, seen_castle) ensuring player has explored the demo chapter thoroughly
- Act 1b->2 gate requires 4 conditions (decree-sealed, ghost_approved_decree, castle-map, skeleton-key-used) representing completion of the Royal Authority and Kitchen Crisis puzzle chains
- Guardian chamber implements sequential questioning via progressive flag gates rather than a single multi-answer puzzle, allowing partial progress
- Spirit-brew crafting uses a 3-step chain (fill chalice, combine with sage) to create a key item that reveals the Ghost King NPC
- VIP stamp hidden in filing room drawer provides an alternative to the 347-year queue wait, rewarding exploration

## Deviations from Plan

None - plan executed exactly as written. All rooms, items, NPCs, dialogue, and puzzles match the story bible and puzzle dependency graph specifications.

## Issues Encountered
None - all JSON files valid, all ink scripts compiled successfully, build succeeds, 104 tests pass, room validation script reports zero errors across 26 rooms.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 26 of 36 rooms complete (72% of total game content)
- Act 3 (The Rite of Administrative Closure) and Act 4 (Endgame) remain for plan 08-04
- All act gates through Act 2 are implemented and validated
- Puzzle dependency chains verified via room validation script
- Game is playable from Act 1a through Act 2 gate

## Self-Check: PASSED

- All 19 room JSON files: FOUND
- All 6 ink source files: FOUND
- All 6 compiled dialogue JSON files: FOUND
- Commit eaee9ad (Task 1): FOUND
- Commit d947210 (Task 2): FOUND

---
*Phase: 08-content-production*
*Completed: 2026-02-21*
