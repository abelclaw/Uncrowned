# Puzzle Dependency Graph

Dependency chart for all puzzle chains across 4 acts, following the Ron Gilbert puzzle dependency method. Each puzzle node shows: `[Puzzle Name] (room_id) -- requires: [items/flags], produces: [items/flags]`

Arrows (`-->`) indicate prerequisites. Parallel chains are indented equally. Act gates are bottleneck nodes that require convergence of all chains.

---

## ACT 1a: "Lost & Found" (Demo Chapter)

```
[START: forest_clearing]
    |
    +==========================+==============================+=======================+
    |                          |                              |                       |
    v                          v                              v                       v
[CHAIN A: KEY & DOOR]    [CHAIN B: LIGHT SOURCE]        [CHAIN C: KNOWLEDGE]    [CHAIN D: DISCOVERY]
    |                          |                              |                       |
    v                          v                              v                       v

[Take Rusty Key]         [Take Stick]                   [Talk to Old Man]       [Explore Village Square]
(forest_clearing)        (forest_clearing)              (village_path)          (village_square)
req: --                  req: --                        req: --                 req: --
prod: item:rusty-key     prod: item:stick               prod: flag:met_old_man  prod: flag:knows_about_curse
    |                          |                              |                       |
    v                          v                              v                       v

[Unlock Cave Door]       [Take Glowing Mushroom]        [Ask About Cave]        [Go to Watchtower]
(cave_entrance)          (cave_entrance)                (village_path)          (old_watchtower)
req: item:rusty-key      req: --                        req: flag:met_old_man   req: --
prod: flag:door-unlocked prod: item:glowing-mushroom    prod: flag:knows_cave_  prod: item:telescope-lens
     |                        |                               name                    |
     |                        v                              |                       v
     |                   [Combine Stick + Mushroom]          v                  [Use Telescope]
     |                   (any room)                     [Ask Village History]   (old_watchtower)
     |                   req: item:stick,               (village_path)         req: item:telescope-lens
     |                        item:glowing-mushroom     req: flag:met_old_man  prod: flag:seen_castle
     |                   prod: item:makeshift-torch     prod: flag:warned_
     |                        |                               about_cave
     v                        v                              |
[Enter Cave Depths]      [Illuminate Cave Depths]           v
(cave_depths)            (cave_depths)                 [Ask Cavern Secret]
req: flag:door-unlocked  req: item:makeshift-torch     (village_path)
prod: access to pool     prod: can see in cave_depths  req: flag:warned_about_cave,
     |                        |                              flag:knows_cave_name
     v                        v                        prod: flag:knows_cavern_secret
[Investigate Pool]       [Find Crystal Shard]
(underground_pool)       (underground_pool)
req: access             req: light source
prod: flag:pool_         prod: item:cave-crystal-shard
     investigated
```

### Act 1a Gate

```
ACT 1a GATE --> ACT 1b
Required: flag:door-unlocked
         + flag:knows_cavern_secret
         + item:cave-crystal-shard
         + flag:seen_castle

All four chains must converge. Player exits via old_watchtower -> forest_bridge.
```

### Validation

- **No circular dependencies:** Each chain flows forward. Key -> Door -> Depths -> Pool. Stick + Mushroom -> Torch -> Light. Talk -> Learn -> Secret. Explore -> Telescope -> Castle. No chain references a later chain's output.
- **No unwinnable states:** All items are available without solving other puzzles first. Rusty-key, stick, glowing-mushroom are freely takeable. Old Man is always available.
- **Items consumed only on success:** rusty-key consumed when door opened (no longer needed). Stick and mushroom consumed on combine (makeshift-torch replaces both).
- **Parallel chains:** All 4 chains solvable in any order.

---

## ACT 1b: "The Royal Mess"

```
[ENTER: forest_bridge from old_watchtower]
    |
    v
[CHAIN A: ENTRY]
    |
    v
[Answer Bridge Riddle]                    [Pay Bridge Toll (alt)]
(forest_bridge)                           (forest_bridge)
req: --                                   req: item:bridge-toll-coin
prod: flag:riddle_answered                prod: flag:toll_paid
    |                                         |
    +------------------+-----------------------+
                       |
                       v
              [Show Crystal to Guards]
              (castle_courtyard)
              req: item:cave-crystal-shard
              prod: flag:crystal_shown_to_guards
                       |
    +==================+=================+=======================+
    |                                    |                       |
    v                                    v                       v
[CHAIN B: ROYAL AUTHORITY]         [CHAIN C: SPIRIT GLASS]  [CHAIN D: KITCHEN CRISIS]
    |                                    |                       |
    v                                    v                       v

[Find Royal Seal]                  [Get Dried Sage]         [Get Rat Trap]
(throne_room)                      (castle_garden)          (castle_garden)
req: crystal_shown_to_guards       req: castle access       req: castle access
prod: item:royal-seal              prod: item:dried-sage    prod: item:rat-trap
    |                                    |                       |
    v                                    v                       v

[Find Blank Decree]                [Get Empty Chalice]      [Catch Rats]
(servants_quarters)                (royal_kitchen)           (servants_quarters)
req: castle access                 req: castle access        req: item:rat-trap
prod: item:blank-decree            prod: item:empty-chalice  prod: flag:rats_caught
    |                                    |                       |
    |                                    v                       v
    |                              [Fill Chalice at Well]    [Get Flour Sack]
    |                              (castle_courtyard)        (servants_quarters)
    |                              req: item:empty-chalice   req: flag:rats_caught
    |                              prod: item:water-chalice  prod: item:flour-sack
    |                                    |                       |
    |                                    v                       v
    |                              [Combine Chalice + Sage]  [Give Flour to Cook]
    |                              (any room)                (royal_kitchen)
    |                              req: item:water-chalice,  req: item:flour-sack
    |                                   item:dried-sage      prod: item:skeleton-key
    |                              prod: item:spirit-brew         |
    |                                    |                       v
    |                                    v                  [Use Skeleton Key]
    |                              [Use Spirit Brew]        (castle_hallway)
    |                              (throne_room)            req: item:skeleton-key
    |                              req: item:spirit-brew    prod: flag:skeleton-key-used,
    |                              prod: flag:met_ghost_         item:castle-map
    |                                    king                    |
    v                                    |                       |
[Seal Decree]                            v                       |
(any room)                         [Show Decree to Ghost]        |
req: item:royal-seal,              (throne_room)                 |
     item:blank-decree             req: item:sealed-decree,      |
prod: item:sealed-decree,              flag:met_ghost_king       |
      flag:decree-sealed           prod: flag:ghost_approved_    |
                                         decree                  |
    +----------------------------+-------------------------------+
                                 |
                                 v
                          ACT 1b GATE
```

### Act 1b Gate

```
ACT 1b GATE --> ACT 2
Required: flag:decree-sealed
         + flag:ghost_approved_decree
         + item:castle-map
         + flag:skeleton-key-used

Chains B (decree) and C (spirit/ghost) converge at Ghost approval.
Chain D (kitchen) produces the castle-map independently.
```

### Validation

- **No circular dependencies:** Spirit brew needed to see Ghost King, decree needed for Ghost approval. These are sequential within Chain B+C but not circular.
- **No unwinnable states:** All items freely available in castle rooms. Rat-trap and sage both in garden. Chalice in kitchen. No items locked behind other puzzle completions.
- **Alternative paths:** Bridge can be crossed by riddle OR toll coin.
- **Items consumed only on success:** royal-seal consumed when decree sealed. Rat-trap consumed when rats caught. Flour consumed when given to Cook. All consumed items no longer needed.

---

## ACT 2: "The Screaming Caverns"

```
[ENTER: cavern_entrance_hall from forest_bridge]
    |
    v
[CHAIN A: REGISTRATION]
    |
    v
[Find Form 27-B Stroke 6]                    [Find Ancient Ink]
(filing_room)                                 (cavern_library)
req: --                                       req: --
prod: item:form-27b-stroke-6                  prod: item:ancient-ink
    |                                              |
    +----------------------------------------------+
    |
    v
[Fill Out Form]
(any room)
req: item:form-27b-stroke-6, item:ancient-ink
prod: flag:form_filled
    |
    v
[Submit Form to Clerk]
(cavern_entrance_hall)
req: flag:form_filled
prod: flag:registered_with_clerk, item:queue-ticket
    |
    v
[CHAIN B: THE QUEUE]
    |
    v
[Enter Waiting Room]                          [Find VIP Stamp]
(waiting_room)                                (filing_room)
req: item:queue-ticket                        req: --
prod: flag:queue_entered                      prod: item:vip-stamp
    |                                              |
    v                                              |
[Talk to Patient Ghost]                            |
(waiting_room)                                     |
req: --                                            |
prod: flag:met_queue_ghost (VIP hint)              |
    |                                              |
    +----------------------------------------------+
    |
    v
[Stamp Ticket with VIP]
(any room)
req: item:queue-ticket, item:vip-stamp
prod: flag:vip_stamped
    |
    v
[Clerk Processes VIP Ticket]
(cavern_entrance_hall)
req: flag:vip_stamped
prod: flag:clerk-satisfied, flag:west_wing_unlocked, flag:east_wing_accessed
    |
    +========================================+
    |                                        |
    v                                        v
[CHAIN C: WEST WING - LIGHT]          [CHAIN D: EAST WING - WATER]
    |                                        |
    v                                        v

[Find Light Pattern Clue]             [Find Wood Planks]
(cavern_library)                      (cavern_library)
req: --                               req: --
prod: knowledge of pattern            prod: item:wood-planks
    |                                        |
    v                                        v
[Solve Mushroom Pattern]              [Find Rope]
(cavern_west_wing)                    (cavern_balcony)
req: pattern knowledge                req: west_wing_unlocked
prod: flag:mushroom_pattern_solved    prod: item:rope
    |                                        |
    |                                        v
    |                                 [Repair Old Boat]
    |                                 (underground_river)
    |                                 req: item:old-boat, item:wood-planks, item:rope
    |                                 prod: flag:boat_repaired
    |                                        |
    |                                        v
    |                                 [Sail to Forge]
    |                                 (underground_river)
    |                                 req: flag:boat_repaired
    |                                 prod: access to forge_chamber
    |                                        |
    |                                 +======+
    |                                 |
    |                                 v
    |                           [CHAIN E: THE FORGE]
    |                                 |
    |                                 v
    |                           [Get Coal]              [Get Broken Seal]
    |                           (echo_chamber)          (forge_chamber)
    |                           req: --                 req: --
    |                           prod: item:coal         prod: item:broken-seal-stamp
    |                                 |                       |
    |                                 v                       |
    |                           [Solve Echo Puzzle]           |
    |                           (echo_chamber)                |
    |                           req: --                       |
    |                           prod: flag:echo_puzzle_       |
    |                                 solved                  |
    |                                 |                       |
    |                                 +------+----------------+
    |                                        |
    |                                        v
    |                                 [Light Forge]
    |                                 (forge_chamber)
    |                                 req: item:coal, item:makeshift-torch (or fire source)
    |                                 prod: flag:forge_lit
    |                                        |
    |                                        v
    |                                 [Repair Seal at Forge]
    |                                 (forge_chamber)
    |                                 req: item:broken-seal-stamp, flag:forge_lit
    |                                 prod: item:ancient-seal
    |                                        |
    +----------------------------------------+
    |
    v
[CHAIN F: THE GUARDIAN]
    |
    v
[Use Ancient Seal on Pedestal]
(guardian_chamber)
req: item:ancient-seal
prod: flag:guardian_awakened
    |
    v
[Answer Guardian Questions (3)]
(guardian_chamber)
req: flag:guardian_awakened
     + clues from cavern_library and echo_chamber
prod: flag:guardian_q1_correct, flag:guardian_q2_correct, flag:guardian_q3_correct
    |
    v (all 3 correct)
[Guardian Defeated]
(guardian_chamber)
req: flag:guardian_q1_correct + q2 + q3
prod: flag:guardian-defeated, flag:crystal_barrier_down
    |
    v
[Take Crystal of Mundanity]
(crystal_chamber)
req: flag:crystal_barrier_down
prod: item:crystal-of-mundanity
```

### Act 2 Gate

```
ACT 2 GATE --> ACT 3
Required: item:crystal-of-mundanity
         + flag:guardian-defeated
         + flag:clerk-satisfied

All chains must converge through the guardian test and crystal retrieval.
```

### Validation

- **No circular dependencies:** Registration (A) -> Queue (B) -> West/East Wing unlock (C/D) -> Forge (E) -> Guardian (F) -> Crystal. Strictly forward flow.
- **No unwinnable states:** Form and ink freely available. VIP stamp in filing_room accessible any time. Boat repair materials (planks from library, rope from balcony) both accessible from west wing.
- **Parallel chains after queue:** West Wing (C) and East Wing (D) solvable in either order. Forge (E) requires east wing access. Guardian (F) requires both chains.
- **Items consumed only on success:** ancient-ink consumed on form filling. VIP stamp consumed on ticket stamping. Coal consumed in forge lighting. Broken seal consumed in repair. All consumed items replaced by their products.
- **Makeshift-torch persists:** Torch from Act 1a still in inventory, usable as fire source for forge.

---

## ACT 3: "The Rite of Administrative Closure"

```
[ENTER: petrified_forest from cavern_entrance_hall]
    |
    v
[Arrive at Castle (Petrified)]
(castle_courtyard_act3)
req: item:crystal-of-mundanity
prod: flag:curse_accelerating (auto-set)
    |
    +====================+========================+========================+
    |                    |                        |                        |
    v                    v                        v                        v
[CHAIN A: CURSE DOC] [CHAIN B: KINGDOM SEAL] [CHAIN C: CLERK]       [CHAIN D: TIME]
    |                    |                        |                        |
    v                    v                        v                        v

[Find Curse Contract] [Talk to Guard Captain]  [Go to Dungeon]        [Explore Wizard Tower]
(royal_archive)       (castle_courtyard_act3)  (dungeon)              (wizard_tower)
req: --               req: --                  req: --                req: --
prod: item:original-  prod: flag:guard_last_   prod: item:treasury-   prod: flag:wizard_explored
      curse-contract        orders                   key                    |
    |                    |                        |                        v
    |                    v                        v                   [Find Memory Crystal]
    |               [Ghost King Hints]       [Open Treasury]         (wizard_tower)
    |               (throne_room_act3)       (treasury)              req: --
    |               req: --                  req: item:treasury-key  prod: item:clerk-memory-
    |               prod: knowledge of       prod: item:kingdom-          crystal,
    |                     kingdom-seal             seal,                   item:gear-spring
    |                     location                 item:clock-oil          |
    |                    |                        |                        |
    |                    +------------------------+                        v
    |                    |                                           [Show Crystal to Clerk]
    |                    |                                           (dungeon)
    |                    |                                           req: item:clerk-memory-
    |                    |                                                crystal
    |                    |                                           prod: flag:clerk_remembers,
    |                    |                                                 flag:clerk_allied
    |                    |                                                 |
    |                    |                   [OR: Outwit Clerk]            |
    |                    |                   (dungeon)                     |
    |                    |                   req: item:original-curse-     |
    |                    |                        contract                 |
    |                    |                   prod: flag:clerk_outwitted,   |
    |                    |                         flag:clerk_allied       |
    |                    |                        |                        |
    |                    |                        +------------------------+
    |                    |                                                 |
    +--------------------+-------------------------------------------------+
    |                                                                      |
    |                                                               [CHAIN D: TIME]
    |                                                                      |
    |                                                                      v
    |                                                               [Repair Clock]
    |                                                               (clock_tower)
    |                                                               req: item:gear-spring,
    |                                                                    item:clock-oil
    |                                                               prod: flag:clock_time_set
    |                                                                      |
    |                                                                      v
    |                                                               [Set Correct Time]
    |                                                               (clock_tower)
    |                                                               req: flag:clock_time_set,
    |                                                                    clue from curse contract
    |                                                               prod: flag:clock-fixed
    |
    v
[PREPARE RITE]
(throne_room_act3)
req: item:crystal-of-mundanity
   + item:kingdom-seal
   + item:original-curse-contract
   + flag:clerk_allied
prod: flag:rite_prepared
    |
    v
[PERFORM RITE]
(throne_room_act3)
req: flag:rite_prepared
     Ghost King reads the rite
     Pip stamps contract with kingdom-seal
     Crystal serves as witness
prod: flag:rite_started
    |
    v
[CURSE BROKEN]
(throne_room_act3)
req: flag:rite_started
prod: flag:curse-broken
    |
    v
[ENDING: Accept or Decline Throne]
(throne_room_act3)
req: flag:curse-broken
prod: flag:throne_accepted OR flag:throne_declined
    |
    v
[GAME COMPLETE]
```

### Act 3 Gate (Final)

```
RITE REQUIREMENTS:
  item:crystal-of-mundanity (from Act 2)
+ item:kingdom-seal (from treasury, Chain B)
+ item:original-curse-contract (from archive, Chain A)
+ flag:clerk_allied (from Chain C -- either path)

OPTIONAL BUT RECOMMENDED:
  flag:clock-fixed (Chain D -- buys time, eases final sequence)
```

### Validation

- **No circular dependencies:** Archive (A), Treasury (B), Clerk (C), and Clock (D) are independent chains. Rite requires convergence of A+B+C. Clock (D) is optional helper.
- **No unwinnable states:** All items in Act 3 are freely available. Curse contract in archive, treasury-key in dungeon, memory crystal in wizard tower -- all accessible from courtyard hub.
- **Alternative Clerk resolution:** Chain C has two paths (show memory crystal OR outwit with contract). Both produce clerk_allied. Player cannot fail this -- if they have the contract, they can always argue.
- **Clock is optional:** Chain D provides a gameplay benefit (slowing petrification) but is not required for the Rite. Ensures the game is completable even if player skips it.
- **Items consumed at Rite:** kingdom-seal and original-curse-contract consumed in the final ceremony. Crystal-of-mundanity used as witness. All items have served their final purpose.
- **No item locked behind one-way doors:** All Act 3 rooms are accessible from the courtyard hub. No one-way doors.

---

## Cross-Act Dependency Summary

```
ACT 1a ----[cave-crystal-shard, knows_cavern_secret, seen_castle]----> ACT 1b
ACT 1b ----[sealed-decree, ghost_approved_decree, castle-map]--------> ACT 2
ACT 2  ----[crystal-of-mundanity, guardian-defeated]------------------> ACT 3

Items that persist across acts:
  - cave-crystal-shard: Act 1a -> Act 1b (shown to guards)
  - sealed-decree: Act 1b -> Act 2 (shown to guardian)
  - makeshift-torch: Act 1a -> Act 2 (used at forge)
  - crystal-of-mundanity: Act 2 -> Act 3 (used in Rite)
```

## Winnability Guarantee

For every puzzle in every act:
1. Prerequisites are obtainable without solving the puzzle itself.
2. Items are only consumed by successful puzzle actions.
3. Death always resets to room entry state -- no items lost.
4. Within each act, all puzzle chains are solvable in any order.
5. Act gates verify all required flags/items before allowing progression.
6. No one-way doors block access to required items.
7. Alternative solutions exist where reasonable (bridge toll, Clerk confrontation).
