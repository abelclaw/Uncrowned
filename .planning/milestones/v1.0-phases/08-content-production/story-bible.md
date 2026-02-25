# Story Bible: The Crumbling Crown

## 1. Story Overview

In the once-proud Kingdom of Erelhain, the last king has died under circumstances best described as "embarrassingly preventable" -- he choked on an olive at his own coronation anniversary feast. With no heir, the throne sits empty, the royal bureaucracy has ground to a halt, and a magical curse placed by a disgruntled wizard (who was denied a parking spot at the feast, of all things) is slowly turning the kingdom to stone. Plants, buildings, and eventually people are petrifying from the edges inward. The kingdom has roughly one week before the curse becomes irreversible.

Enter our protagonist: a traveling tinker named **Pip**, who wandered into Erelhain looking for directions and a warm meal. Through a series of catastrophically unlucky coincidences, Pip is mistaken for the prophesied "Uncrowned Sovereign" -- a figure from local legend who will save the kingdom by finding the Crystal of Mundanity (yes, that is its real name) and performing the Rite of Administrative Closure. Pip is neither royal nor particularly competent, but everyone keeps insisting, and the alternative is being turned to stone. The tone is dark comedy throughout: deaths are absurd and frequent, the narrator is sardonic, puzzles are logically solvable but described with maximum absurdity, and the kingdom's problems are simultaneously cosmic and petty.

---

## 2. Act Breakdown

### Act 1a: The Demo Chapter -- "Lost & Found"

**Duration:** 30-60 minutes | **Rooms:** 7 | **Theme:** Tutorial & Tone Establishment

**Narrative Goal:** Pip arrives in the outskirts of Erelhain, learns something is wrong with the kingdom, and gains access to the deeper caverns where the first piece of the puzzle awaits. Establishes the dark comedy tone, teaches core verbs (look, take, use, combine, talk), and introduces the first puzzle chain.

**Hub Room:** `forest_clearing`

**Rooms:**
| Room ID | Name | Purpose |
|---------|------|---------|
| `forest_clearing` | Forest Clearing | Starting room. Rusty key, stick, beehive death. Tutorial for look/take. |
| `cave_entrance` | Cave Entrance | Locked door puzzle, mushroom, mysterious bottle. Teaches use-on and combine. |
| `village_path` | Village Path | Old Man NPC, well. Teaches talk/dialogue. |
| `cave_depths` | Cave Depths | First real puzzle area beyond locked door. Torch required. Dark without light. |
| `underground_pool` | Underground Pool | Environmental puzzle. Reflections reveal hidden message. |
| `village_square` | Village Square | Petrified fountain, notice board. Establishes the curse. |
| `old_watchtower` | Old Watchtower | Act gate area. Telescope reveals the castle in the distance. |

**Puzzle Chains:**

Chain A (Key & Door):
- Get rusty-key from forest_clearing stump
- Use rusty-key on locked-door in cave_entrance -> opens cave_depths

Chain B (Light Source):
- Get stick from forest_clearing
- Get glowing-mushroom from cave_entrance
- Combine stick + glowing-mushroom -> makeshift-torch
- Use makeshift-torch in cave_depths to see

Chain C (Knowledge):
- Talk to Old Man in village_path -> learn cave name (knows_cave_name)
- Ask about village -> learn about the curse (warned_about_cave)
- Ask about Screaming Caverns -> learn about the test (knows_cavern_secret)

Chain D (Discovery):
- Explore village_square -> see petrified fountain -> read notice board (knows_about_curse)
- Explore old_watchtower -> use telescope -> spot the castle (seen_castle)

**Act Gate:** `door-unlocked` + `knows_cavern_secret` + `has-item: cave-crystal-shard` + `seen_castle`
Player must have opened the cave, learned the cavern secret, found the crystal shard in underground_pool, and seen the castle through the telescope.

**NPCs:**
| NPC ID | Name | Room | Role |
|--------|------|------|------|
| `old_man` | Old Man | village_path | Tutorial NPC. Provides knowledge about cave, key, and village history. |
| `stone_merchant` | Stone Merchant | village_square | Half-petrified merchant. Introduces the curse visually. Sells nothing (too petrified). |

**Deaths (7):**
| Death ID | Room | Trigger |
|----------|------|---------|
| `bee-death` | forest_clearing | Push beehive |
| `poison-death` | cave_entrance | Use mysterious-bottle (drink) |
| `lost-death` | village_path | Go into forest |
| `drown-death` | underground_pool | Swim in pool without preparation |
| `fall-death` | old_watchtower | Climb railing |
| `dark-death` | cave_depths | Go deeper without torch |
| `stone-touch` | village_square | Touch petrified fountain |

---

### Act 1b: "The Royal Mess"

**Duration:** 30-60 minutes | **Rooms:** 7 | **Theme:** World Expansion & NPC Introduction

**Narrative Goal:** Pip reaches the outskirts of Castle Erelhain and discovers the kingdom's dysfunction up close. The royal bureaucracy has continued functioning without a king, creating absurd levels of red tape. Pip must navigate bureaucratic puzzles and meet key NPCs who will help (or hinder) the quest. Pip is first identified as the "Uncrowned Sovereign."

**Hub Room:** `castle_courtyard`

**Rooms:**
| Room ID | Name | Purpose |
|---------|------|---------|
| `forest_bridge` | Forest Bridge | Transition from Act 1a. Bridge troll puzzle (conversation, not combat). |
| `castle_courtyard` | Castle Courtyard | Hub. Guards, gate, overgrown garden. |
| `castle_hallway` | Castle Hallway | Portraits, locked rooms, servant quarters access. |
| `throne_room` | Throne Room | Empty throne. Royal seal. Ghost King (after spirit-glass). |
| `royal_kitchen` | Royal Kitchen | Cook NPC. Ingredients for puzzles. Rat problem. |
| `castle_garden` | Castle Garden | Overgrown, herbs for puzzles. Petrification spreading. |
| `servants_quarters` | Servants' Quarters | Diary with clues. Skeleton key hidden. |

**Puzzle Chains:**

Chain A (Entry):
- Talk to bridge troll at forest_bridge -> answer riddle correctly -> cross bridge
- Arrive at castle_courtyard -> guards demand proof of purpose
- Show cave-crystal-shard to guards -> they let you in (crystal_shown_to_guards)

Chain B (Royal Authority):
- Find royal-seal in throne_room
- Find blank-decree in servants_quarters (hidden in diary)
- Use royal-seal on blank-decree -> sealed-decree
- Ghost King approves decree (need spirit-glass first)

Chain C (Spirit Glass):
- Get dried-sage from castle_garden
- Get empty-chalice from royal_kitchen
- Fill chalice at underground well (castle_courtyard has one)
- Combine chalice + sage -> spirit-brew
- Use spirit-brew in throne_room -> reveals Ghost King

Chain D (Kitchen Crisis):
- Cook needs flour-sack from servants_quarters (rats ate the stores)
- Get rat-trap from castle_garden (old gardener's shed)
- Use rat-trap in servants_quarters -> catch rats -> get flour
- Give flour to Cook -> Cook gives you skeleton-key
- Skeleton-key opens locked door in castle_hallway -> map room with act gate

**Act Gate:** `decree-sealed` + `ghost_approved_decree` + `has-item: castle-map` + `skeleton-key-used`
Player must have the sealed decree approved by the Ghost King and have found the castle map showing the route to the Screaming Caverns.

**NPCs:**
| NPC ID | Name | Room | Role |
|--------|------|------|------|
| `bridge_troll` | Bertram the Bridge Troll | forest_bridge | Riddle-based gatekeeper. Friendly but contractually obligated to block the bridge. |
| `ghost_king` | Ghost King | throne_room | Sardonic dead monarch. Approves the forged decree. Appears only after spirit-glass used. |
| `castle_cook` | Martha the Cook | royal_kitchen | Practical, exasperated. Trades flour for skeleton-key. Knows castle secrets. |

**Deaths (8):**
| Death ID | Room | Trigger |
|----------|------|---------|
| `troll-rage` | forest_bridge | Insult bridge troll |
| `guard-arrest` | castle_courtyard | Attack guards |
| `portrait-curse` | castle_hallway | Take cursed portrait |
| `throne-collapse` | throne_room | Sit on throne (after weakened) |
| `kitchen-fire` | royal_kitchen | Use torch near stove |
| `poison-herb` | castle_garden | Eat nightshade |
| `rat-swarm` | servants_quarters | Open wrong crate |
| `ghost-wrath` | throne_room | Insult Ghost King |

---

### Act 2: "The Screaming Caverns" -- Main Quest

**Duration:** 90-120 minutes | **Rooms:** 12 | **Theme:** Core Puzzles & Complications

**Narrative Goal:** Pip ventures into the Screaming Caverns to find the Crystal of Mundanity. The caverns are an ancient bureaucratic test site -- the kingdom's founders believed that any true ruler must be able to navigate paperwork, wait in queues, and fill out forms correctly. The "screaming" is the wind passing through narrow passages, but also the frustrated screams of previous questers who gave up on the paperwork. This act has the hardest puzzles, the most deaths, and introduces the game's antagonist: the Clerk, an immortal bureaucrat who has been administering the test for centuries and has zero interest in letting anyone pass.

**Hub Room:** `cavern_entrance_hall`

**Rooms:**
| Room ID | Name | Purpose |
|---------|------|---------|
| `cavern_entrance_hall` | Cavern Entrance Hall | Grand hall with registration desk. Hub for three wings. |
| `cavern_west_wing` | West Wing Corridor | Mushroom forest, bioluminescent navigation puzzle. |
| `crystal_chamber` | Crystal Chamber | The Crystal of Mundanity is here but behind a force barrier. |
| `cavern_library` | Cavern Library | Ancient texts, puzzle clues, crumbling shelves. |
| `filing_room` | Filing Room | Rows of cabinets. Must find correct form. |
| `waiting_room` | The Waiting Room | Numbered ticket system. NPC queue. |
| `cavern_east_wing` | East Wing Corridor | Water-filled passages, boat puzzle. |
| `underground_river` | Underground River | Boat navigation, waterfall hazard. |
| `forge_chamber` | Forge Chamber | Ancient dwarven forge. Repair/create items. |
| `guardian_chamber` | Guardian Chamber | Stone guardian, final test before crystal. |
| `echo_chamber` | Echo Chamber | Sound-based puzzle. Words bounced off walls. |
| `cavern_balcony` | Cavern Balcony | Overlooking the crystal chamber from above. Rope puzzle. |

**Puzzle Chains:**

Chain A (Registration):
- Talk to Clerk at cavern_entrance_hall -> need Form 27-B
- Go to filing_room -> search cabinets -> find form-27b (wrong one, of course)
- Return to Clerk -> wrong form, need Form 27-B *Stroke 6*
- Back to filing_room -> find correct form-27b-stroke-6
- Fill form (need ink -- find ancient-ink in cavern_library)
- Submit completed form -> Clerk gives you queue-ticket

Chain B (The Queue):
- Go to waiting_room with queue-ticket -> number 847
- Current number: 3. Wait? No. Find a way to skip.
- Talk to queue NPCs -> learn about VIP bypass
- Get VIP-stamp from filing_room (hidden drawer)
- Stamp your ticket -> VIP access
- Clerk grudgingly processes you -> west wing opens (west_wing_unlocked)

Chain C (West Wing -- Light Puzzle):
- Navigate cavern_west_wing with mushroom light sources
- Each mushroom can be lit/unlit in sequence
- Solve light pattern (clue in cavern_library book) -> opens Crystal Chamber view
- Reach cavern_balcony -> can see crystal below but barrier active

Chain D (East Wing -- Water Puzzle):
- Navigate cavern_east_wing -> flooded passages
- Find old-boat in underground_river
- Repair boat: need planks (from cavern_library broken shelves) + rope (from cavern_balcony)
- Sail to forge_chamber

Chain E (The Forge):
- Find broken-seal-stamp in forge_chamber (ancient version of royal seal)
- Need coal (from echo_chamber -- break stalactites)
- Need water (from underground_river)
- Light forge -> repair broken-seal-stamp -> get ancient-seal

Chain F (The Guardian):
- Reach guardian_chamber with sealed-decree + ancient-seal
- Use ancient-seal on guardian's pedestal -> guardian awakens
- Guardian asks three questions (answers from cavern_library + echo_chamber clues)
- Pass test -> barrier around Crystal of Mundanity drops
- Take crystal-of-mundanity from crystal_chamber

**Act Gate:** `has-item: crystal-of-mundanity` + `guardian-defeated` + `clerk-satisfied`

**NPCs:**
| NPC ID | Name | Room | Role |
|--------|------|------|------|
| `the_clerk` | The Clerk | cavern_entrance_hall | Immortal bureaucrat. Antagonist. Insists on proper paperwork. Secretly lonely. |
| `queue_ghost` | Patient Ghost | waiting_room | Ghost who has been waiting in queue for 200 years. Knows VIP bypass. |
| `dwarven_spirit` | Forge Spirit | forge_chamber | Ancient dwarven smith. Helps repair items if shown respect. |

**Deaths (16):**
| Death ID | Room | Trigger |
|----------|------|---------|
| `clerk-stamped` | cavern_entrance_hall | Submit wrong form three times |
| `mushroom-poison` | cavern_west_wing | Eat glowing mushroom |
| `shelf-collapse` | cavern_library | Climb shelves |
| `filed-away` | filing_room | Open trapped cabinet |
| `boredom-death` | waiting_room | Wait too long (use wait command) |
| `drown-river` | underground_river | Sail without repairing boat |
| `waterfall-death` | underground_river | Go downstream |
| `forge-burn` | forge_chamber | Touch active forge |
| `guardian-smash` | guardian_chamber | Attack guardian |
| `guardian-wrong` | guardian_chamber | Answer all three questions wrong |
| `echo-scream` | echo_chamber | Scream (talk loudly) |
| `stalactite-fall` | echo_chamber | Break wrong stalactite |
| `barrier-zap` | crystal_chamber | Touch force barrier |
| `balcony-fall` | cavern_balcony | Lean over edge |
| `dark-water` | cavern_east_wing | Swim in dark water |
| `paper-cut` | filing_room | Use form as weapon |

---

### Act 3: "The Rite of Administrative Closure"

**Duration:** 60-90 minutes | **Rooms:** 10 | **Theme:** Climax & Resolution

**Narrative Goal:** Pip returns from the caverns with the Crystal of Mundanity but discovers the curse has accelerated. The kingdom is nearly fully petrified. The Rite of Administrative Closure must be performed in the throne room, but the Clerk has followed Pip back, furious that someone actually passed the test (it hasn't happened in 400 years, and the Clerk is not prepared for the paperwork this generates). Pip must gather the final components, convince or outwit the Clerk, and perform the Rite before the kingdom turns entirely to stone. The ending reveals that the "Rite of Administrative Closure" is literally filing the correct closure form for the curse -- the wizard who cast it was also a bureaucrat, and the curse has an expiration clause that no one bothered to read.

**Hub Room:** `castle_courtyard` (revisited, now partially petrified)

**Rooms:**
| Room ID | Name | Purpose |
|---------|------|---------|
| `petrified_forest` | Petrified Forest | Forest_clearing area now turning to stone. Time pressure visual. |
| `castle_courtyard_act3` | Castle Courtyard (Petrified) | Hub. Guards frozen. Courtyard crumbling. |
| `throne_room_act3` | Throne Room (Final) | Rite location. Ghost King assists. |
| `royal_archive` | Royal Archive | Contains the original curse document. |
| `wizard_tower` | Wizard's Tower | The disgruntled wizard's abandoned tower. Spell components. |
| `clock_tower` | Clock Tower | Kingdom's failing clock. Time puzzle. |
| `dungeon` | Castle Dungeon | The Clerk's true office. Final confrontation. |
| `mirror_hall` | Hall of Mirrors | Reflections reveal truth. Identity puzzle. |
| `rooftop` | Castle Rooftop | Final vista. Can see curse spreading. |
| `treasury` | Royal Treasury | Nearly empty. One critical item remains. |

**Puzzle Chains:**

Chain A (The Curse Document):
- Explore royal_archive -> find original-curse-contract (it is a legal document)
- Read contract -> discover expiration clause requires "authorized closure"
- Need kingdom-seal (not the royal seal -- the administrative seal of the kingdom itself)

Chain B (The Kingdom Seal):
- Ghost King mentions the kingdom-seal is in the treasury
- Get treasury-key from dungeon (Clerk has it, unknowingly)
- Enter treasury -> find kingdom-seal among cobwebs

Chain C (The Clerk Confrontation):
- Clerk appears in dungeon, furious about the passed test
- Talk to Clerk -> learn the Clerk cast the curse originally (the "disgruntled wizard" was the Clerk before becoming immortal bureaucrat)
- The Clerk does not remember this -- too many centuries of paperwork
- Find clerk-memory-crystal in wizard_tower -> show to Clerk
- Clerk remembers -> is horrified -> agrees to help
- OR: Outwit Clerk with proper bureaucratic argument using curse-contract clauses

Chain D (The Time Puzzle):
- Curse accelerating -> clock_tower's clock is connected to the curse's timer
- Repair clock: need gear-spring from wizard_tower + clock-oil from royal_kitchen (if visited) or treasury
- Set clock to correct time (clue from curse contract date)
- Buys more time (flag: clock-fixed, slows visual petrification)

Chain E (The Rite):
- Bring crystal-of-mundanity + kingdom-seal + original-curse-contract to throne_room_act3
- Ghost King reads the rite (it is literally a bureaucratic form)
- Pip must stamp the contract with kingdom-seal
- Use crystal-of-mundanity as "official witness" (magical notarization)
- The curse lifts. Kingdom de-petrifies. Pip is offered the throne.
- Pip declines (or accepts -- player choice for flavor, not gameplay)

**Act Gate:** Game complete. `curse-broken` flag set.

**NPCs:**
| NPC ID | Name | Room | Role |
|--------|------|------|------|
| `ghost_king` | Ghost King | throne_room_act3 | Returns. Reads the rite. Provides final emotional beat. |
| `the_clerk` | The Clerk | dungeon | Antagonist/ally. Revealed as original curse-caster. Redeemable. |
| `petrified_guard` | Petrified Guard Captain | castle_courtyard_act3 | Half-stone. Gives last instructions. Emotional weight. |
| `mirror_spirit` | Mirror Spirit | mirror_hall | Reveals Pip's true nature (ordinary person, not prophesied hero). |

**Deaths (12):**
| Death ID | Room | Trigger |
|----------|------|---------|
| `petrify-touch` | petrified_forest | Touch petrified tree with bare hands |
| `petrify-slow` | castle_courtyard_act3 | Wait too long (curse catches up) |
| `archive-collapse` | royal_archive | Pull wrong book |
| `wizard-trap` | wizard_tower | Open trapped chest |
| `wizard-explosion` | wizard_tower | Mix wrong spell components |
| `clock-crush` | clock_tower | Get caught in gears |
| `clock-fall` | clock_tower | Climb outside |
| `dungeon-pit` | dungeon | Fall through trap floor |
| `mirror-shatter` | mirror_hall | Break mirror |
| `rooftop-fall` | rooftop | Lean over parapet |
| `treasury-trap` | treasury | Take wrong item |
| `rite-fail` | throne_room_act3 | Perform rite with wrong items |

---

## 3. Item Master List

| # | ID | Name | Description | Found In | Used For | Combinable |
|---|---|------|-------------|----------|----------|------------|
| 1 | `rusty-key` | Rusty Key | A key so corroded it might unlock a door or give you tetanus. Possibly both. | forest_clearing | Unlocks cave door (cave_entrance) | No |
| 2 | `glowing-mushroom` | Glowing Mushroom | A bioluminescent fungus that pulses with an eerie blue light. Nutritional value: questionable. | cave_entrance | Combine with stick -> makeshift-torch | Yes |
| 3 | `stick` | Sturdy Stick | A stick. Not just any stick -- this one has character. And splinters. | forest_clearing | Combine with mushroom -> makeshift-torch | Yes |
| 4 | `makeshift-torch` | Makeshift Torch | A stick with a glowing mushroom wedged on top. It provides light and existential dread in equal measure. | Crafted (stick + mushroom) | Illuminate cave_depths, light source | No |
| 5 | `mysterious-bottle` | Mysterious Bottle | A small glass bottle containing something that's either medicine, poison, or an ancient smoothie recipe. | cave_entrance | Death trigger (drinking). Give to Old Man for lore. | No |
| 6 | `cave-crystal-shard` | Cave Crystal Shard | A small shard of crystal that hums with faint magical resonance. It is warm to the touch and deeply unimpressive. | underground_pool | Proof for castle guards (Act 1b entry). | No |
| 7 | `telescope-lens` | Telescope Lens | A cracked but functional lens. It magnifies your view and your insecurities. | old_watchtower | Repair telescope to spot castle. | No |
| 8 | `notice-board-posting` | Town Notice | An official notice declaring the kingdom "temporarily inconvenienced" by a petrification curse. Bureaucratic understatement at its finest. | village_square | Reading triggers knows_about_curse flag. | No |
| 9 | `bridge-toll-coin` | Bridge Toll Coin | A coin so old the face on it has worn into a vague smudge. Still legal tender, apparently. | village_square (well) | Pay bridge troll if riddle answer is wrong (mercy option). | No |
| 10 | `royal-seal` | Royal Seal | A heavy wax seal stamp bearing the royal crest: a disgruntled badger wearing a crown. Historically accurate, unfortunately. | throne_room | Stamp blank-decree -> sealed-decree | Yes |
| 11 | `blank-decree` | Blank Royal Decree | A sheet of parchment so official-looking it could probably govern a small nation. Which is sort of the point. | servants_quarters | Stamp with royal-seal -> sealed-decree | Yes |
| 12 | `sealed-decree` | Sealed Royal Decree | A forged royal document bearing the royal crest. Your mother would be so disappointed. | Crafted (royal-seal + blank-decree) | Satisfy Ghost King, use at guardian | No |
| 13 | `dried-sage` | Dried Sage | A bundle of sage so old it has more in common with dust than herbs. Still technically aromatic. | castle_garden | Combine with chalice -> spirit-brew | Yes |
| 14 | `empty-chalice` | Empty Chalice | A dented silver chalice. Once held wine for kings. Now holds your hopes, which are equally intoxicating. | royal_kitchen | Fill with water, combine with sage -> spirit-brew | Yes |
| 15 | `spirit-brew` | Spirit Brew | A chalice of sage-infused water that glows faintly. It smells like a retirement home for ghosts. | Crafted (chalice + sage + well water) | Reveals Ghost King in throne_room | No |
| 16 | `rat-trap` | Rat Trap | A rusty spring-loaded contraption that has seen better days. So have the rats, to be fair. | castle_garden | Catch rats in servants_quarters | No |
| 17 | `flour-sack` | Flour Sack | A sack of flour that the rats didn't get to. Miracles do happen. | servants_quarters (after rats caught) | Give to Cook -> get skeleton-key | No |
| 18 | `skeleton-key` | Skeleton Key | A key shaped from actual bone. Whether human or animal is a question best left unasked. | royal_kitchen (from Cook) | Opens map room in castle_hallway | No |
| 19 | `castle-map` | Castle Map | A map of the kingdom showing routes to the Screaming Caverns. Includes a helpful "You are here" arrow pointing at nothing. | castle_hallway (map room) | Knowledge for Act 2 route | No |
| 20 | `form-27b-stroke-6` | Form 27-B Stroke 6 | A bureaucratic form of such stunning complexity that reading it counts as a puzzle in itself. | filing_room | Submit to Clerk for queue access | No |
| 21 | `ancient-ink` | Ancient Ink | Ink so old it has developed opinions. Still writes, grudgingly. | cavern_library | Fill out form-27b-stroke-6 | No |
| 22 | `queue-ticket` | Queue Ticket #847 | A numbered ticket. You are number 847. Currently serving: 3. This may take a while. | cavern_entrance_hall (from Clerk) | Access waiting_room queue | No |
| 23 | `vip-stamp` | VIP Authorization Stamp | An unauthorized stamp that says "VIP -- SKIP ALL QUEUES." Someone left it in a filing cabinet. Bless them. | filing_room (hidden drawer) | Stamp queue-ticket -> skip queue | No |
| 24 | `old-boat` | Old Boat | A boat in the loosest possible definition. It floats. Mostly. When it feels like it. | underground_river | Navigate east wing (after repair) | Yes |
| 25 | `rope` | Climbing Rope | A length of rope that looks like it was last inspected during the previous dynasty. It holds. Probably. | cavern_balcony | Repair boat, descend to crystal | Yes |
| 26 | `wood-planks` | Wood Planks | Planks salvaged from broken shelving. The library's loss is your boat's gain. | cavern_library | Repair boat | Yes |
| 27 | `broken-seal-stamp` | Broken Seal Stamp | An ancient version of the kingdom's seal, cracked in two. It depicts the same disgruntled badger, but angrier. | forge_chamber | Repair at forge -> ancient-seal | Yes |
| 28 | `coal` | Forge Coal | Chunks of ancient coal. They've been waiting centuries for someone to burn them. The anticipation is palpable. | echo_chamber | Light the forge | No |
| 29 | `ancient-seal` | Ancient Kingdom Seal | The kingdom's original administrative seal, reforged. The badger on it looks slightly less disgruntled. Progress. | Crafted (broken-seal-stamp + forge) | Use on guardian pedestal, needed for Rite | No |
| 30 | `original-curse-contract` | Original Curse Contract | A legal document binding the curse to the kingdom. Clause 47b contains the expiration terms. Of course it does. | royal_archive | Required for Rite of Administrative Closure | No |
| 31 | `kingdom-seal` | Kingdom Administrative Seal | The official seal of the Kingdom of Erelhain, used for closing governmental proceedings. Different from the royal seal. Bureaucracy demands precision. | treasury | Required for Rite of Administrative Closure | No |
| 32 | `treasury-key` | Treasury Key | An ornate key found in the dungeon. The Clerk had been using it as a paperweight. | dungeon | Opens treasury | No |
| 33 | `clerk-memory-crystal` | Clerk's Memory Crystal | A crystal containing the Clerk's suppressed memories. It glows with the light of forgotten regret. | wizard_tower | Show to Clerk to restore memories | No |
| 34 | `gear-spring` | Gear Spring | A coiled metal spring from the wizard's workshop. Still has bounce, unlike your hopes. | wizard_tower | Repair clock_tower clock | No |
| 35 | `clock-oil` | Clock Oil | A vial of mechanical lubricant. It smells like progress and mineral spirits. | treasury | Repair clock_tower clock | No |
| 36 | `crystal-of-mundanity` | Crystal of Mundanity | The legendary Crystal of Mundanity. It is, fittingly, completely unremarkable. A plain grey crystal. | crystal_chamber | Required for Rite of Administrative Closure | No |

**Total: 36 items** (5 existing + 31 new)

---

## 4. NPC Roster

| # | ID | Name | Personality | Knowledge | Room | Act | Puzzle Role |
|---|---|------|-------------|-----------|------|-----|-------------|
| 1 | `old_man` | Old Man | Cryptic, slightly unhinged hermit who speaks in riddles and dark humor. Knows far more than he lets on. | Cave name, key purpose, bottle contents, village history, forest dangers | village_path | 1a | Provides knowledge flags: knows_cave_name, knows_key_purpose, warned_about_cave, knows_cavern_secret |
| 2 | `stone_merchant` | Stone Merchant | Half-petrified merchant frozen mid-sales-pitch. Eternally optimistic despite literally turning to stone. Can still talk (slowly). | The curse, kingdom trade routes, where to find crystal shards | village_square | 1a | Introduces the curse visually. Hints at cave-crystal-shard location. |
| 3 | `bridge_troll` | Bertram the Bridge Troll | Friendly, well-read troll who is contractually obligated to block the bridge. Apologetic about it. Has a book club. | Bridge history, riddle answers, kingdom geography, troll labor law | forest_bridge | 1b | Riddle gatekeeper. Correct answer or toll coin lets you pass. |
| 4 | `ghost_king` | Ghost King | Sardonic dead monarch. Bitter about dying from an olive. Self-aware about his failures. Dry wit. | Kingdom history, the curse's origin, royal bureaucratic procedures, the Rite | throne_room / throne_room_act3 | 1b, 3 | Approves sealed-decree. Reads the Rite in Act 3. Emotional anchor. |
| 5 | `castle_cook` | Martha the Cook | Practical, no-nonsense, exasperated by everyone. Has kept the castle running single-handedly. Best character in the game and she knows it. | Castle layout, servant gossip, where things are hidden, recipe for spirit-brew hint | royal_kitchen | 1b | Trades flour for skeleton-key. Hints at spirit-brew recipe. |
| 6 | `the_clerk` | The Clerk | Immortal bureaucrat with zero personality and infinite patience. Speaks exclusively in administrative jargon. Secretly the original curse-caster (doesn't remember). | All bureaucratic procedures, form numbers, filing systems, the test, (suppressed) curse origins | cavern_entrance_hall / dungeon | 2, 3 | Main antagonist. Guards the test. Final confrontation reveals true identity. Redeemable. |
| 7 | `queue_ghost` | Patient Ghost | A ghost who has been waiting in the queue for 200 years. Remarkably patient. Has numbered every crack in the ceiling. | VIP bypass, queue system exploits, waiting room history | waiting_room | 2 | Tells player about VIP stamp location. Comic relief. |
| 8 | `dwarven_spirit` | Forge Spirit | Ancient dwarven smith. Gruff but fair. Respects craftsmanship. Will only help if you show proper respect for the forge. | Metalworking, ancient seals, kingdom's founding, forge operation | forge_chamber | 2 | Helps repair broken-seal-stamp. Requires coal and water. |
| 9 | `petrified_guard` | Captain Aldric | Half-petrified guard captain. Stoic, dutiful, slowly turning to stone but still giving orders. Deeply loyal to the kingdom. | Castle defense, dungeon layout, the Clerk's habits, treasury location | castle_courtyard_act3 | 3 | Provides dungeon info and emotional weight. Last orders before full petrification. |
| 10 | `mirror_spirit` | Mirror Spirit | An entity that lives in the Hall of Mirrors. Shows truth through reflections. Speaks in reversed sentences that make sense if you think about them. | Pip's true nature, the prophecy's meaning, self-knowledge | mirror_hall | 3 | Reveals Pip is NOT the prophesied hero -- just someone who showed up. Thematic payoff. |
| 11 | `wizard_ghost` | Wizard Marlowe | The ghost of the wizard who cast the curse. Doesn't remember casting it. Thinks he's still alive. Very confused. | Spell components, tower layout, the curse (fragmented memories) | wizard_tower | 3 | Provides hints about clerk-memory-crystal. Unintentionally helpful. |

**Total: 11 NPCs** (1 existing + 10 new)

---

## 5. Death Catalog

### Act 1a Deaths (7)

| # | ID | Room | Trigger | Title | Narrator Theme |
|---|---|------|---------|-------|----------------|
| 1 | `bee-death` | forest_clearing | Push beehive | Death by Enthusiasm | The futility of antagonizing insects who have a clear numerical advantage. |
| 2 | `poison-death` | cave_entrance | Use/drink mysterious-bottle | Death by Curiosity | The age-old question of "should I drink the mystery liquid?" answered definitively. |
| 3 | `lost-death` | village_path | Go into forest | Death by Poor Navigation | The consequences of ignoring very clear warning signs about certain death. |
| 4 | `drown-death` | underground_pool | Swim without preparation | Death by Overconfidence | Pip cannot swim. This was always true. Nobody thought to mention it. |
| 5 | `fall-death` | old_watchtower | Climb railing | Death by Ambition | The railing was decorative, not structural. An important architectural distinction. |
| 6 | `dark-death` | cave_depths | Enter without torch | Death by Insufficient Preparation | What you can't see CAN hurt you. In this case, it was a pit. |
| 7 | `stone-touch` | village_square | Touch petrified fountain | Death by Tactile Curiosity | Touching cursed objects: an activity with a 100% regret rate. |

### Act 1b Deaths (8)

| # | ID | Room | Trigger | Title | Narrator Theme |
|---|---|------|---------|-------|----------------|
| 8 | `troll-rage` | forest_bridge | Insult troll | Death by Poor Diplomacy | Bertram has a book club, a mortgage, and very little tolerance for rudeness. |
| 9 | `guard-arrest` | castle_courtyard | Attack guards | Death by Heroic Stupidity | Attacking armed guards while unarmed: the bravest form of suicide. |
| 10 | `portrait-curse` | castle_hallway | Take cursed portrait | Death by Art Appreciation | Some portraits are worth dying for. This was not one of them. |
| 11 | `throne-collapse` | throne_room | Sit on weakened throne | Death by Ambition (Seated Edition) | The throne collapses, taking centuries of termite damage and Pip down with it. |
| 12 | `kitchen-fire` | royal_kitchen | Use torch near stove | Death by Culinary Disaster | The stove was already hot. The torch was unnecessary. The explosion was inevitable. |
| 13 | `poison-herb` | castle_garden | Eat nightshade | Death by Botany | Nightshade: beautiful, fragrant, and entirely lethal. Nature's click-bait. |
| 14 | `rat-swarm` | servants_quarters | Open wrong crate | Death by Vermin | The rats have been organizing. They have a hierarchy. You have been outvoted. |
| 15 | `ghost-wrath` | throne_room | Insult Ghost King | Death by Royal Displeasure | Insulting a ghost king in his own throne room. Bold. Terminal, but bold. |

### Act 2 Deaths (16)

| # | ID | Room | Trigger | Title | Narrator Theme |
|---|---|------|---------|-------|----------------|
| 16 | `clerk-stamped` | cavern_entrance_hall | Submit wrong form 3x | Death by Bureaucracy | The Clerk's stamp of disapproval is, regrettably, literal. |
| 17 | `mushroom-poison` | cavern_west_wing | Eat glowing mushroom | Death by Bioluminescent Snacking | Just because something glows doesn't mean it's food. Also applies to lava. |
| 18 | `shelf-collapse` | cavern_library | Climb shelves | Death by Literature | Crushed by the weight of knowledge. The metaphor was not supposed to be this literal. |
| 19 | `filed-away` | filing_room | Open trapped cabinet | Death by Organization | Filed under "D" for "Deceased." The Clerk's filing system is thorough. |
| 20 | `boredom-death` | waiting_room | Use "wait" command | Death by Patience | You waited. And waited. And waited. Eventually your skeleton was still waiting. |
| 21 | `drown-river` | underground_river | Sail in broken boat | Death by Optimistic Engineering | The boat had a hole. You knew about the hole. You sailed anyway. Remarkable. |
| 22 | `waterfall-death` | underground_river | Go downstream | Death by Gravity (Assisted by Water) | Waterfalls: nature's way of reminding you that "downstream" is a direction, not a suggestion. |
| 23 | `forge-burn` | forge_chamber | Touch active forge | Death by Metallurgy | The forge was hot. This information was available visually, audibly, and now experientially. |
| 24 | `guardian-smash` | guardian_chamber | Attack stone guardian | Death by Misplaced Aggression | Attacking a stone guardian with your bare hands. The guardian did not need to hit back. Physics did. |
| 25 | `guardian-wrong` | guardian_chamber | Answer all 3 questions wrong | Death by Ignorance | The guardian asked three questions. You answered zero correctly. The guardian is not grading on a curve. |
| 26 | `echo-scream` | echo_chamber | Shout/scream | Death by Acoustics | Your scream echoed. And amplified. And amplified. And amplified. The cavern has opinions about volume. |
| 27 | `stalactite-fall` | echo_chamber | Break wrong stalactite | Death by Geology | That stalactite was load-bearing. In retrospect, they all look load-bearing. |
| 28 | `barrier-zap` | crystal_chamber | Touch force barrier | Death by Impatience | The magical barrier was clearly visible, audibly humming, and posted with warning signs. You touched it anyway. |
| 29 | `balcony-fall` | cavern_balcony | Lean over edge | Death by Vertigo | Looking down was optional. Falling was not. |
| 30 | `dark-water` | cavern_east_wing | Swim in dark water | Death by Aquatic Confidence | The water was dark for a reason. Several reasons, actually. All of them had teeth. |
| 31 | `paper-cut` | filing_room | Use form as weapon | Death by Irony | You tried to weaponize bureaucracy. Bureaucracy weaponized you first. |

### Act 3 Deaths (12)

| # | ID | Room | Trigger | Title | Narrator Theme |
|---|---|------|---------|-------|----------------|
| 32 | `petrify-touch` | petrified_forest | Touch petrified tree | Death by Petrification | The curse spread through your fingertips. In your final moments, you became a very realistic statue. |
| 33 | `petrify-slow` | castle_courtyard_act3 | Wait too long | Death by Procrastination | The curse caught up. You became a monument to indecision. Pigeons will nest on you. |
| 34 | `archive-collapse` | royal_archive | Pull wrong book | Death by Bibliography | The archive was held together by the books. Removing one was... structural. |
| 35 | `wizard-trap` | wizard_tower | Open trapped chest | Death by Greed | The wizard trapped his belongings. This is both paranoid and, as you've discovered, justified. |
| 36 | `wizard-explosion` | wizard_tower | Mix wrong components | Death by Chemistry | Mixing random magical components: the alchemical equivalent of pressing buttons in an elevator and hoping for the best. |
| 37 | `clock-crush` | clock_tower | Get caught in gears | Death by Clockwork | The clock's gears continue to turn. You no longer do. Time waits for no one, least of all you. |
| 38 | `clock-fall` | clock_tower | Climb outside | Death by Altitude | The view from the clock tower is spectacular. The view from the ground, less so. |
| 39 | `dungeon-pit` | dungeon | Fall through trap floor | Death by Architecture | Trap floors: the original terms and conditions nobody reads. |
| 40 | `mirror-shatter` | mirror_hall | Break mirror | Death by Superstition | Seven years of bad luck is an understatement. Zero years of any luck is more accurate. |
| 41 | `rooftop-fall` | rooftop | Lean over parapet | Death by Sightseeing | You leaned out to see the curse spreading. The curse appreciated your enthusiasm. Gravity did not. |
| 42 | `treasury-trap` | treasury | Take wrong item | Death by Avarice | The treasury was booby-trapped. The irony of dying surrounded by wealth you can't spend is not lost on the narrator. |
| 43 | `rite-fail` | throne_room_act3 | Perform rite wrong | Death by Incorrect Paperwork | You performed the rite incorrectly. The curse, sensing incompetent closure, accelerated. Filing errors have consequences. |

**Total: 43 deaths** (3 existing + 40 new)

---

## 6. Flag Registry

### Act 1a Flags

| Flag Name | Set By | Checked By | Purpose |
|-----------|--------|------------|---------|
| `met_old_man` | Talk to Old Man (first time) | Old Man greeting branch | Tracks if player has met the Old Man |
| `knows_cave_name` | Old Man -> cave_info knot | Old Man -> cavern_details availability | Player knows cave is called Screaming Caverns |
| `warned_about_cave` | Old Man -> village_history knot | Old Man -> cavern_details requirement | Player warned about dangers in cave |
| `knows_cavern_secret` | Old Man -> cavern_details knot | Act 1a gate check | Player knows about the guardian test |
| `knows_key_purpose` | Old Man -> key_reaction knot | Optional hint text | Player knows key opens cave chest |
| `bottle_identified` | Old Man -> bottle_reaction knot | Prevents poison-death (bottle-safe) | Old Man identified the bottle as dangerous |
| `bottle-safe` | Set after bottle_identified | Death trigger condition | Prevents accidental death from drinking bottle |
| `door-unlocked` | Use rusty-key on locked-door | Dynamic description, exit availability | Cave depths door is open |
| `has-torch` | Combine stick + mushroom (implicit via inventory) | cave_depths darkness check | Player has light source |
| `knows_about_curse` | Read notice board in village_square | Dialogue options, hints | Player knows about the petrification curse |
| `seen_castle` | Use telescope in old_watchtower | Act 1a gate check | Player has spotted Castle Erelhain |
| `pool_investigated` | Look at underground_pool reflections | Crystal shard availability | Reflections reveal crystal location |
| `forest-safe` | Set after completing Act 1a path knowledge | village_path death condition | Prevents lost-death after learning the way |

### Act 1b Flags

| Flag Name | Set By | Checked By | Purpose |
|-----------|--------|------------|---------|
| `riddle_answered` | Answer bridge troll's riddle correctly | forest_bridge exit unlock | Bridge crossing allowed |
| `toll_paid` | Give bridge-toll-coin to troll | forest_bridge exit unlock (alt) | Alternative bridge crossing |
| `crystal_shown_to_guards` | Show cave-crystal-shard to guards | castle_courtyard gate open | Castle entry granted |
| `met_ghost_king` | Use spirit-brew in throne_room | Ghost King greeting, dialogue options | Ghost King is visible and interactable |
| `decree-sealed` | Use royal-seal on blank-decree | Ghost King reaction, Act 1b gate | Official decree has been forged |
| `ghost_approved_decree` | Ghost King -> decree_reaction knot | Act 1b gate, Act 2 guardian use | Ghost King blessed the forged decree |
| `rats_caught` | Use rat-trap in servants_quarters | flour-sack availability | Rat problem resolved |
| `flour_delivered` | Give flour-sack to Cook | skeleton-key availability | Cook received flour |
| `skeleton-key-used` | Use skeleton-key on map room door | Act 1b gate | Map room accessible |
| `throne-weakened` | Sit on throne first time (use throne) | throne-collapse death trigger | Throne is structurally compromised |
| `spirit-brew-made` | Combine chalice + sage + well water | throne_room spirit reveal | Spirit brew crafted |
| `cook_befriended` | Complete Cook's request | Additional Cook dialogue | Cook trusts the player |
| `knows_kingdom_history` | Ghost King -> kingdom_info knot | Ghost King curse_info prerequisite | Player knows kingdom history |
| `knows_about_artifact` | Ghost King -> curse_info (with history) | Ghost King artifact_details option | Player knows about Crystal of Mundanity |
| `knows_artifact_location` | Ghost King -> artifact_details knot | Optional hint for Act 2 | Player knows crystal is in Screaming Caverns |

### Act 2 Flags

| Flag Name | Set By | Checked By | Purpose |
|-----------|--------|------------|---------|
| `registered_with_clerk` | Submit correct form to Clerk | queue-ticket availability | Officially registered for the test |
| `form_filled` | Use ancient-ink on form-27b-stroke-6 | Clerk submission check | Form properly completed |
| `queue_entered` | Enter waiting_room with ticket | Queue sequence start | Player is in the queue |
| `vip_stamped` | Use vip-stamp on queue-ticket | Skip queue check | Ticket has VIP authorization |
| `clerk-satisfied` | Clerk processes VIP ticket | West wing door unlock, Act 2 gate | Clerk has grudgingly approved passage |
| `west_wing_unlocked` | clerk-satisfied | cavern_west_wing access | West wing corridor accessible |
| `mushroom_pattern_solved` | Solve light puzzle in west wing | Crystal chamber view from balcony | Correct mushroom sequence activated |
| `boat_repaired` | Use planks + rope on old-boat | underground_river navigation | Boat is seaworthy (loosely) |
| `forge_lit` | Use coal + fire source on forge | Forging available | Ancient forge is operational |
| `seal_repaired` | Repair broken-seal-stamp at forge | ancient-seal available | Ancient kingdom seal restored |
| `guardian_awakened` | Use ancient-seal on pedestal | Guardian test begins | Stone guardian is active |
| `guardian_q1_correct` | Answer guardian question 1 | Guardian progress | First question passed |
| `guardian_q2_correct` | Answer guardian question 2 | Guardian progress | Second question passed |
| `guardian_q3_correct` | Answer guardian question 3 | Guardian progress | Third question passed |
| `guardian-defeated` | Pass all 3 guardian questions | Crystal barrier drops, Act 2 gate | Guardian test completed |
| `crystal_barrier_down` | guardian-defeated | crystal-of-mundanity takeable | Force barrier deactivated |
| `met_queue_ghost` | Talk to Patient Ghost | VIP hint available | Queue ghost encountered |
| `met_dwarven_spirit` | Talk to Forge Spirit | Forge assistance available | Forge spirit encountered |
| `echo_puzzle_solved` | Solve echo pattern | coal availability, clue revealed | Echo chamber puzzle done |
| `wrong_form_count_1` | Submit wrong form (first time) | Clerk patience tracking | One wrong submission |
| `wrong_form_count_2` | Submit wrong form (second time) | Clerk patience tracking | Two wrong submissions |
| `east_wing_accessed` | Unlock east wing door | cavern_east_wing access | East wing corridor accessible |

### Act 3 Flags

| Flag Name | Set By | Checked By | Purpose |
|-----------|--------|------------|---------|
| `curse_accelerating` | Enter Act 3 (auto-set) | Visual petrification effects, timer | Curse is spreading faster |
| `clock-fixed` | Repair clock tower clock | Petrification timer slowed | Clock repaired, buys time |
| `found_curse_contract` | Find original-curse-contract in archive | Rite requirements, Clerk confrontation | Original curse document located |
| `clerk_confronted` | Talk to Clerk in dungeon | Memory crystal option | Confrontation with the Clerk initiated |
| `clerk_remembers` | Show clerk-memory-crystal to Clerk | Clerk becomes ally | Clerk's memories restored |
| `clerk_outwitted` | Use curse-contract clauses in argument | Clerk concedes (alternative path) | Bureaucratic argument won |
| `clerk_allied` | clerk_remembers OR clerk_outwitted | Rite assistance available | Clerk is now helping |
| `treasury_opened` | Use treasury-key on treasury | Kingdom seal available | Treasury accessible |
| `wizard_explored` | Explore wizard_tower | clerk-memory-crystal hints | Wizard's tower investigated |
| `met_wizard_ghost` | Talk to Wizard Marlowe | Memory crystal location | Wizard ghost encountered |
| `mirror_truth_revealed` | Mirror Spirit reveals truth | Thematic dialogue option in finale | Pip knows they're ordinary |
| `guard_last_orders` | Talk to Petrified Guard Captain | Emotional weight, dungeon hint | Captain's final instructions |
| `clock_time_set` | Set clock to correct time | clock-fixed requirement | Clock shows correct time |
| `rite_prepared` | Have all 3 rite items in inventory | Rite sequence available | Ready to perform the Rite |
| `rite_started` | Begin Rite in throne_room_act3 | Rite sequence progression | Rite ceremony begun |
| `curse-broken` | Complete Rite successfully | Game ending trigger | THE CURSE IS BROKEN |
| `throne_accepted` | Accept throne offer | Ending variant | Pip becomes ruler |
| `throne_declined` | Decline throne offer | Ending variant | Pip walks away |
| `petrified_guard_saved` | Curse broken while guard alive | Ending variant detail | Captain de-petrifies |

**Total: 68 flags** across all acts

---

## Appendix A: Room Summary Table

| Act | Room ID | Name | Items | NPCs | Deaths | Exits |
|-----|---------|------|-------|------|--------|-------|
| 1a | `forest_clearing` | Forest Clearing | rusty-key, stick | -- | bee-death | east->cave_entrance |
| 1a | `cave_entrance` | Cave Entrance | glowing-mushroom, mysterious-bottle | -- | poison-death | west->forest_clearing, east->village_path, [door]->cave_depths |
| 1a | `village_path` | Village Path | -- | old_man | lost-death | west->cave_entrance, east->village_square |
| 1a | `cave_depths` | Cave Depths | -- | -- | dark-death | north->underground_pool, south->cave_entrance |
| 1a | `underground_pool` | Underground Pool | cave-crystal-shard | -- | drown-death | south->cave_depths |
| 1a | `village_square` | Village Square | notice-board-posting, bridge-toll-coin | stone_merchant | stone-touch | west->village_path, east->old_watchtower |
| 1a | `old_watchtower` | Old Watchtower | telescope-lens | -- | fall-death | west->village_square |
| 1b | `forest_bridge` | Forest Bridge | -- | bridge_troll | troll-rage | west->old_watchtower, east->castle_courtyard |
| 1b | `castle_courtyard` | Castle Courtyard | -- | -- | guard-arrest | north->castle_hallway, east->castle_garden, west->forest_bridge |
| 1b | `castle_hallway` | Castle Hallway | -- | -- | portrait-curse | south->castle_courtyard, east->throne_room, [key]->map_room, north->servants_quarters |
| 1b | `throne_room` | Throne Room | royal-seal | ghost_king | throne-collapse, ghost-wrath | west->castle_hallway |
| 1b | `royal_kitchen` | Royal Kitchen | empty-chalice | castle_cook | kitchen-fire | north->castle_hallway |
| 1b | `castle_garden` | Castle Garden | dried-sage, rat-trap | -- | poison-herb | west->castle_courtyard |
| 1b | `servants_quarters` | Servants' Quarters | blank-decree, flour-sack | -- | rat-swarm | south->castle_hallway |
| 2 | `cavern_entrance_hall` | Cavern Entrance Hall | -- | the_clerk | clerk-stamped | south->forest_bridge, west->cavern_west_wing, east->cavern_east_wing |
| 2 | `cavern_west_wing` | West Wing Corridor | -- | -- | mushroom-poison | east->cavern_entrance_hall, west->crystal_chamber, north->cavern_balcony |
| 2 | `crystal_chamber` | Crystal Chamber | crystal-of-mundanity | -- | barrier-zap | east->cavern_west_wing |
| 2 | `cavern_library` | Cavern Library | ancient-ink, wood-planks | -- | shelf-collapse | south->cavern_entrance_hall |
| 2 | `filing_room` | Filing Room | form-27b-stroke-6, vip-stamp | -- | filed-away, paper-cut | west->cavern_entrance_hall |
| 2 | `waiting_room` | The Waiting Room | -- | queue_ghost | boredom-death | east->cavern_entrance_hall |
| 2 | `cavern_east_wing` | East Wing Corridor | -- | -- | dark-water | west->cavern_entrance_hall, east->underground_river |
| 2 | `underground_river` | Underground River | old-boat | -- | drown-river, waterfall-death | west->cavern_east_wing, [boat]->forge_chamber |
| 2 | `forge_chamber` | Forge Chamber | broken-seal-stamp | dwarven_spirit | forge-burn | south->underground_river, north->guardian_chamber |
| 2 | `guardian_chamber` | Guardian Chamber | -- | -- | guardian-smash, guardian-wrong | south->forge_chamber, [test]->crystal_chamber |
| 2 | `echo_chamber` | Echo Chamber | coal | -- | echo-scream, stalactite-fall | south->cavern_west_wing |
| 2 | `cavern_balcony` | Cavern Balcony | rope | -- | balcony-fall | south->cavern_west_wing |
| 3 | `petrified_forest` | Petrified Forest | -- | -- | petrify-touch | east->castle_courtyard_act3, west->cavern_entrance_hall |
| 3 | `castle_courtyard_act3` | Castle Courtyard (Petrified) | -- | petrified_guard | petrify-slow | north->throne_room_act3, east->royal_archive, west->petrified_forest, south->clock_tower |
| 3 | `throne_room_act3` | Throne Room (Final) | -- | ghost_king | rite-fail | south->castle_courtyard_act3 |
| 3 | `royal_archive` | Royal Archive | original-curse-contract | -- | archive-collapse | west->castle_courtyard_act3 |
| 3 | `wizard_tower` | Wizard's Tower | clerk-memory-crystal, gear-spring | wizard_ghost | wizard-trap, wizard-explosion | south->castle_courtyard_act3 |
| 3 | `clock_tower` | Clock Tower | -- | -- | clock-crush, clock-fall | north->castle_courtyard_act3 |
| 3 | `dungeon` | Castle Dungeon | treasury-key | the_clerk | dungeon-pit | north->castle_courtyard_act3 |
| 3 | `mirror_hall` | Hall of Mirrors | -- | mirror_spirit | mirror-shatter | east->castle_courtyard_act3 |
| 3 | `rooftop` | Castle Rooftop | -- | -- | rooftop-fall | south->throne_room_act3 |
| 3 | `treasury` | Royal Treasury | kingdom-seal, clock-oil | -- | treasury-trap | east->dungeon |

**Total: 36 rooms** (3 existing + 33 new, across 4 acts: 7 + 7 + 12 + 10)
