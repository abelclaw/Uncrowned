# Room Connection Map

All room connections for the 36 rooms of The Crumbling Crown, organized by act. Directions shown as compass points. Locked/gated connections marked with `[condition]`.

---

## ACT 1a: "Lost & Found" (7 rooms)

```
                                                    old_watchtower
                                                         |
                                                       west
                                                         |
forest_clearing <--east/west--> cave_entrance <--east/west--> village_path <--east/west--> village_square
                                     |
                                [door-unlocked]
                                     |
                                   south
                                     |
                                cave_depths
                                     |
                                   north
                                     |
                              underground_pool
```

### Room Details

| Room ID | Connections | Restrictions | Notes |
|---------|-------------|-------------|-------|
| `forest_clearing` | east -> cave_entrance | None | Starting room. Player begins here. |
| `cave_entrance` | west -> forest_clearing, east -> village_path, south -> cave_depths | cave_depths requires `door-unlocked` | Hub of Act 1a. Locked door puzzle. |
| `village_path` | west -> cave_entrance, east -> village_square | None | Old Man NPC location. |
| `village_square` | west -> village_path, east -> old_watchtower | None | Petrified fountain. Notice board. |
| `old_watchtower` | west -> village_square | None | Telescope. Act boundary exit to forest_bridge. |
| `cave_depths` | north -> underground_pool, south -> cave_entrance | Requires `makeshift-torch` (no light = death) | First puzzle area behind locked door. |
| `underground_pool` | south -> cave_depths | None | Crystal shard location. |

### Act Boundary

`old_watchtower` connects east to `forest_bridge` (Act 1b) after Act 1a gate conditions met.

---

## ACT 1b: "The Royal Mess" (7 rooms)

```
                                servants_quarters
                                     |
                                   north
                                     |
forest_bridge <--east/west--> castle_courtyard <--north/south--> castle_hallway <--east/west--> throne_room
                                     |                                |
                                   east                          [skeleton-key]
                                     |                                |
                                castle_garden                    royal_kitchen
```

### Room Details

| Room ID | Connections | Restrictions | Notes |
|---------|-------------|-------------|-------|
| `forest_bridge` | west -> old_watchtower, east -> castle_courtyard | Bridge requires `riddle_answered` OR `toll_paid` | Troll gatekeeper. |
| `castle_courtyard` | north -> castle_hallway, east -> castle_garden, west -> forest_bridge | Entry requires `crystal_shown_to_guards` | Hub of Act 1b. Well for chalice. |
| `castle_hallway` | south -> castle_courtyard, east -> throne_room, north -> servants_quarters, [key] -> royal_kitchen | royal_kitchen requires `skeleton-key-used` | Central corridor. Map room off hallway. |
| `throne_room` | west -> castle_hallway | None | Royal seal. Ghost King (after spirit-brew). |
| `royal_kitchen` | south -> castle_hallway | Requires `skeleton-key-used` | Cook NPC. Chalice location. |
| `castle_garden` | west -> castle_courtyard | None | Sage, rat-trap. Petrification visible. |
| `servants_quarters` | south -> castle_hallway | None | Blank decree. Flour (after rats caught). |

### Act Boundary

`cavern_entrance_hall` (Act 2) is accessible from `forest_bridge` heading north after Act 1b gate conditions met. The castle-map reveals the route.

---

## ACT 2: "The Screaming Caverns" (12 rooms)

```
                              cavern_library
                                   |
                                 south
                                   |
filing_room <--west/east--> cavern_entrance_hall <--west/east--> waiting_room
                                   |
                        +----------+----------+
                      west                   east
                        |                      |
                 [west_wing_unlocked]    [east_wing_accessed]
                        |                      |
                 cavern_west_wing        cavern_east_wing
                   |          |                |
                 north      west             east
                   |          |                |
            cavern_balcony  crystal_chamber  underground_river
                                               |
                                            [boat_repaired]
                                               |
                                          forge_chamber
                                               |
                                             north
                                               |
                                        guardian_chamber
                                               |
                                            [test]
                                               |
                                        crystal_chamber
                                        (also from west wing)

            echo_chamber
                 |
               south
                 |
          cavern_west_wing
```

### Room Details

| Room ID | Connections | Restrictions | Notes |
|---------|-------------|-------------|-------|
| `cavern_entrance_hall` | south -> forest_bridge, west -> cavern_west_wing, east -> cavern_east_wing, north -> cavern_library, west-side -> filing_room, east-side -> waiting_room | Wings require `clerk-satisfied` | Hub. Clerk NPC. Registration desk. |
| `cavern_library` | south -> cavern_entrance_hall | None | Ink, planks, puzzle clues, pattern hints. |
| `filing_room` | east -> cavern_entrance_hall | None | Form 27-B Stroke 6. VIP stamp (hidden). |
| `waiting_room` | west -> cavern_entrance_hall | Requires `queue-ticket` | Patient Ghost NPC. Queue system. |
| `cavern_west_wing` | east -> cavern_entrance_hall, west -> crystal_chamber, north -> cavern_balcony, south-up -> echo_chamber | Requires `west_wing_unlocked` | Mushroom light puzzle. |
| `crystal_chamber` | east -> cavern_west_wing | Crystal requires `crystal_barrier_down` | Crystal of Mundanity behind force barrier. |
| `cavern_balcony` | south -> cavern_west_wing | None | Rope. Overlooks crystal chamber. |
| `echo_chamber` | south -> cavern_west_wing | None | Coal. Sound-based puzzle. |
| `cavern_east_wing` | west -> cavern_entrance_hall, east -> underground_river | Requires `east_wing_accessed` | Flooded passages. |
| `underground_river` | west -> cavern_east_wing, [boat] -> forge_chamber | Boat travel requires `boat_repaired` | Old boat. Waterfall hazard downstream. |
| `forge_chamber` | south -> underground_river, north -> guardian_chamber | None | Broken seal. Forge Spirit NPC. |
| `guardian_chamber` | south -> forge_chamber, [test] -> crystal_chamber | Crystal access requires `guardian-defeated` | Stone guardian. Three-question test. |

### Act Boundary

Return through `cavern_entrance_hall` south to `forest_bridge`, then route to `petrified_forest` (Act 3) after Act 2 gate conditions met.

---

## ACT 3: "The Rite of Administrative Closure" (10 rooms)

```
                                        rooftop
                                          |
                                        south
                                          |
                                   throne_room_act3
                                          |
                                        south
                                          |
wizard_tower <--south/north--> castle_courtyard_act3 <--east/west--> royal_archive
     (north)                     |              |
                               south          east-down
                                 |              |
                            clock_tower       mirror_hall
                                                |
                                             (isolated
                                              from dungeon)

petrified_forest <--east/west--> castle_courtyard_act3

                                 castle_courtyard_act3 <--north-down--> dungeon <--east/west--> treasury
```

### Room Details

| Room ID | Connections | Restrictions | Notes |
|---------|-------------|-------------|-------|
| `petrified_forest` | east -> castle_courtyard_act3, west -> cavern_entrance_hall | None | Transition area. Forest turning to stone. |
| `castle_courtyard_act3` | north -> throne_room_act3, east -> royal_archive, west -> petrified_forest, south -> clock_tower, north-up -> wizard_tower, east-down -> mirror_hall, north-down -> dungeon | None | Hub (petrified version). Guard Captain NPC. |
| `throne_room_act3` | south -> castle_courtyard_act3, north -> rooftop | None | Rite location. Ghost King returns. |
| `royal_archive` | west -> castle_courtyard_act3 | None | Original curse contract. |
| `wizard_tower` | south -> castle_courtyard_act3 | None | Memory crystal. Gear spring. Wizard ghost. |
| `clock_tower` | north -> castle_courtyard_act3 | None | Clock repair puzzle. Time mechanic. |
| `dungeon` | north -> castle_courtyard_act3, east -> treasury | None | Clerk NPC (final). Treasury key. |
| `mirror_hall` | west -> castle_courtyard_act3 | None | Mirror Spirit NPC. Identity revelation. |
| `rooftop` | south -> throne_room_act3 | None | Vista view. Curse spreading visible. |
| `treasury` | west -> dungeon | Requires `treasury-key` | Kingdom seal. Clock oil. |

### One-Way Door Check

No one-way doors in any act. All rooms with items are accessible from their act's hub room at all times. The treasury requires treasury-key but contains no items needed before the key is obtainable (key is in the adjacent dungeon).

---

## Full Game Map (Simplified)

```
ACT 1a                          ACT 1b                         ACT 2                           ACT 3
------                          ------                         -----                           -----

underground_pool                servants_quarters              echo_chamber                    rooftop
     |                               |                         cavern_balcony                    |
cave_depths                    castle_hallway--throne_room          |                      throne_room_act3
     |                          |    |                    cavern_library                          |
forest_clearing--cave_entrance  |  royal_kitchen               |                   wizard_tower--courtyard_act3--archive
                      |       courtyard--garden      filing--entrance_hall--waiting              |    |    |
                 village_path    |                              |         |            clock_tower  mirror  dungeon
                      |      forest_bridge           west_wing    east_wing                         |
                village_square    |                   |    |         |                           treasury
                      |           |             crystal  balcony  river
                 old_watchtower---+                                 |
                                 |                              forge
                                 +---> cavern_entrance_hall       |
                                                              guardian
                                                                 |
                                                              crystal (alt)
```

---

## Room Count Verification

| Act | Rooms | Room IDs |
|-----|-------|----------|
| 1a | 7 | forest_clearing, cave_entrance, village_path, cave_depths, underground_pool, village_square, old_watchtower |
| 1b | 7 | forest_bridge, castle_courtyard, castle_hallway, throne_room, royal_kitchen, castle_garden, servants_quarters |
| 2 | 12 | cavern_entrance_hall, cavern_library, filing_room, waiting_room, cavern_west_wing, crystal_chamber, cavern_balcony, echo_chamber, cavern_east_wing, underground_river, forge_chamber, guardian_chamber |
| 3 | 10 | petrified_forest, castle_courtyard_act3, throne_room_act3, royal_archive, wizard_tower, clock_tower, dungeon, mirror_hall, rooftop, treasury |
| **Total** | **36** | |

All 36 room IDs match the story bible Room Summary Table (Appendix A).
