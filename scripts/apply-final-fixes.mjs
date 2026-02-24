import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const roomDir = 'public/assets/data/rooms';

const fixes = {
  "castle_courtyard": {
    "castle-guards": {
      "take": "You attempt to abduct a castle guard. The guard shifts his grip on his spear with the patience of someone who has seen this exact brand of stupidity before. You reconsider."
    },
    "cracked-flagstones": {
      "take": "The flagstones are part of the courtyard floor. Taking them would require a pickaxe, a wheelbarrow, and a fundamental misunderstanding of architecture."
    },
    "courtyard-walls": {
      "push": "You push against the courtyard wall. It was built to withstand sieges, battering rams, and the occasional angry wizard. Your shoulder barely registers."
    }
  },
  "castle_courtyard_act3": {
    "frozen-guards": {
      "pull": "You tug at a petrified guard. The cursed stone doesn't yield -- the guards are as immovable in death as they were in life. Stubbornness, it seems, survives the curse."
    },
    "stone-well": {
      "push": "You push against the stone well. It's built into the courtyard foundation and has survived three centuries of the curse. Your effort is heroic and entirely pointless.",
      "pull": "You pull at the well's rim. The stones hold firm, cemented by centuries of use and now fused further by the advancing petrification."
    },
    "petrified-hedges": {
      "pull": "You pull at a petrified branch. It snaps off in your hand, grey and brittle. Stone plants don't flex. They break. Like everything else in this courtyard."
    },
    "captain-aldric": {
      "open": "Captain Aldric is a person, not a container. His armor doesn't have convenient access panels. His emotional armor is equally impenetrable."
    }
  },
  "castle_garden": {
    "overgrown-hedges": {
      "pull": "You pull at the overgrown branches. They snap back with the vindictiveness of vegetation that has had decades to fortify itself. The garden fights dirty."
    },
    "gardeners-shed": {
      "take": "The gardener's shed is a structure built into the garden wall. You cannot pocket a structure. Your ambitions exceed your carrying capacity by a considerable margin."
    },
    "rat-trap": {
      "take": "The rat trap is wedged firmly between the shed and the wall. Whoever placed it was familiar with both rats and adventurers -- neither can be trusted around loose objects."
    }
  },
  "castle_hallway": {
    "locked-door": {
      "pull": "You pull at the locked door handle. The lock holds with the quiet confidence of something that has been keeping people out for generations."
    },
    "cursed-portrait": {
      "pull": "You try to pull the portrait from the wall. It clings with supernatural tenacity, the painted eyes following your hands with unmistakable disapproval."
    },
    "hallway-carpet": {
      "pull": "You pull at the hallway carpet. It bunches and wrinkles but remains stubbornly in place, anchored by the weight of centuries and an impressive amount of castle dust."
    }
  },
  "cave_entrance": {
    "stone-archway": {
      "pull": "You pull at the stone arch. It was carved from the hillside itself -- pulling it would require removing the hill, which exceeds both your strength and your authorization."
    },
    "rocky-hillside": {
      "pull": "You pull at the rocky hillside. Geology remains unmoved. The hillside has been here since before the kingdom existed and intends to remain after it's gone."
    },
    "mysterious-bottle": {
      "take": "The mysterious bottle is wedged between rocks and sealed with something that might be wax, might be magic, and definitely isn't cooperating with your fingers."
    }
  },
  "cavern_balcony": {
    "balcony-edge": {
      "use": "You lean on the balcony edge and immediately regret it. The stone shifts slightly under your weight, showering dust into the darkness below. Best not to push your luck. Or the balcony."
    },
    "rock-formation": {
      "take": "The rock formations are part of the cavern itself. Removing them would be like trying to take the ceiling home -- ambitious, destructive, and structurally inadvisable."
    }
  },
  "cavern_east_wing": {
    "stone-walkway": {
      "take": "The stone walkway is carved from the cavern floor. You'd need to dismantle the entire east wing to take it, which feels like an overcommitment for a souvenir."
    }
  },
  "cavern_entrance_hall": {
    "contradictory-signs": {
      "take": "The signs are bolted to the cave wall with bureaucratic thoroughness. Each bolt has a small tag reading 'PROPERTY OF THE DEPARTMENT OF SIGNAGE. THEFT IS PUNISHABLE.'"
    },
    "glowing-runes": {
      "pull": "You try to peel a rune from the wall. It flares hot under your fingers and you pull back. The runes are carved into the stone itself -- they're not stickers."
    },
    "velvet-rope": {
      "open": "The velvet rope is a loop on brass posts. It doesn't open so much as unhook, but the brass clasps are enchanted to resist unauthorized queue-jumping. The bureaucracy thinks of everything."
    }
  },
  "cavern_library": {
    "reading-desk": {
      "take": "The reading desk is carved from a single stalagmite. It was here before the library and will be here after. You cannot take geological furniture."
    },
    "ancient-ink": {
      "take": "The ancient ink has bonded with its inkwell over centuries. The two are inseparable -- a love story, if you romanticize stationery."
    },
    "wood-planks": {
      "take": "The wood planks are structural. They're holding up shelves that are holding up books that are holding up the cavern's reputation as a place of learning. Remove one plank and the whole system collapses."
    }
  },
  "cavern_west_wing": {
    "organic-growth": {
      "pull": "You pull at the organic growth. It stretches like warm taffy, then snaps back with a wet sound. The growth clings to the walls with the tenacity of something that has nowhere better to be."
    }
  },
  "clock_tower": {
    "tower-exterior": {
      "take": "The clock tower is a building. An entire building. Your inventory does not have a 'building' slot, and even if it did, you'd need planning permission."
    }
  },
  "crystal_chamber": {
    "crystal-pedestal": {
      "pull": "You brace against the pedestal and pull. It's anchored to the chamber floor by what appears to be both masonry and magic. The crystals above sway slightly in protest."
    }
  },
  "dungeon": {
    "trap-door": {
      "use": "You stamp on the trap door experimentally. It rattles but holds. Whatever mechanism opens it is either locked, rusted shut, or waiting for a specific trigger.",
      "pull": "You hook your fingers around the trap door's edge and pull. The hinges groan but the door holds fast -- locked from below, or perhaps just thoroughly rusted shut."
    },
    "barred-window": {
      "open": "The window is barred. That's rather the point of a dungeon window -- to let in just enough light to see how trapped you are, without offering any way out."
    },
    "dungeon-ceiling": {
      "pull": "You reach up and tug at a loose stone in the ceiling. Dust rains down. The stone holds, which is fortunate, because bringing the ceiling down would solve your problems permanently and counterproductively."
    }
  },
  "echo_chamber": {
    "coal": {
      "take": "The coal is embedded in the chamber walls, fused there by heat and pressure over geological time. You'd need mining equipment and considerably more motivation.",
      "open": "Coal is a solid mineral. It doesn't open. It burns, it crumbles, it stains your fingers, but it has never in the history of geology opened."
    }
  },
  "filing_room": {
    "filing-cabinets": {
      "take": "The filing cabinets are bolted to the floor, to the wall, and possibly to each other. The Clerk takes document security seriously. You'd need a crowbar and a disregard for administrative law."
    },
    "hidden-drawer": {
      "take": "The hidden drawer is built into the desk. You can't take a drawer without taking the desk, and the desk is built into the floor. It's turtles all the way down."
    },
    "vip-stamp": {
      "take": "The VIP stamp is chained to its desk. Even rubber stamps are subject to inventory control in this bureaucracy."
    }
  },
  "forest_bridge": {
    "bridge-structure": {
      "pull": "You pull at a bridge plank. It creaks alarmingly. The bridge sways. Something far below goes 'splash.' You stop pulling. Destroying your only means of crossing seems counterproductive."
    },
    "gorge": {
      "take": "The gorge is a geographical feature carved by millennia of erosion. Your pockets, however deep, are insufficient for topography."
    }
  },
  "forest_clearing": {
    "canopy": {
      "pull": "You reach up and pull at a low-hanging branch. Leaves shower down, along with a startled beetle that lands on your shoulder and expresses its displeasure."
    },
    "rusty-key": {
      "talk": "You address the rusty key. It says nothing, being a key. Keys communicate through function, not conversation. This one's message is: 'I open something. Find out what.'"
    },
    "stick": {
      "take": "The stick is tangled in undergrowth and seems determined to stay in the clearing. You tug, twist, and eventually accept that this particular stick has chosen its life path."
    }
  },
  "guardian_chamber": {
    "stone-guardian": {
      "take": "The stone guardian is twelve feet tall and carved from a single block of enchanted granite. It weighs several tons. You weigh considerably less. The math doesn't work in your favor."
    }
  },
  "mirror_hall": {
    "central-mirror": {
      "pull": "You try to pull the central mirror from its mounting. It's fixed to the wall with enchanted brackets that hum warningly when touched. The mirror intends to stay."
    }
  },
  "old_watchtower": {
    "dusty-shelf": {
      "pull": "You pull at the dusty shelf. It comes away from the wall slightly, spilling dust and mouse droppings. Then it swings back, having been attached all along by a rusty bracket."
    }
  },
  "rooftop": {
    "parapet": {
      "use": "You lean against the crumbling parapet. Stones shift underfoot. The wind tugs at you suggestively. Every instinct says: step back. The view isn't worth the risk."
    }
  },
  "servants_quarters": {
    "writing-desk": {
      "take": "The writing desk is built into the wall -- servants' furniture was designed to be functional, not portable. Someone carved their initials in it: 'M.L. was here.' M.L. is probably still here."
    },
    "storage-crates": {
      "take": "The storage crates are nailed to their shelves, which are nailed to the wall. The servants learned the hard way that loose objects vanish in a castle.",
      "open": "The crates are sealed with wax and hammered shut. Someone didn't want casual browsing. A label reads: 'Kitchen surplus -- DO NOT OPEN until feast day.' Feast day was three centuries ago."
    },
    "blank-decree": {
      "take": "The blank decree is pinned to the wall with an ornate brass tack. It's either a deliberate display piece or someone ran out of things to decree and gave up mid-thought."
    },
    "flour-sack": {
      "take": "The flour sack has been here so long it's become part of the room's identity. The flour inside has long since turned to chalk. Some things are better left where they petrified."
    }
  },
  "throne_room": {
    "throne": {
      "open": "The throne is solid wood and stone. There are no secret compartments, hidden panels, or conveniently placed levers. It's a chair. A grand one, but still a chair."
    },
    "faded-banners": {
      "use": "You pull a banner down and drape it over your shoulders like a cape. You look ridiculous. You look like a child playing at being king. You put it back."
    }
  },
  "throne_room_act3": {
    "stone-dais": {
      "pull": "You dig your fingers under the dais edge and pull. The stone platform is set into the floor, unmoved by your effort. It was built to hold the weight of sovereignty. Your tugging is merely atmospheric."
    }
  },
  "treasury": {
    "kingdom-seal": {
      "take": "The kingdom's seal is bolted to its ceremonial stand, which is in turn bolted to the floor. Whoever secured it understood that seals of authority tend to walk away when no one's watching."
    }
  },
  "underground_pool": {
    "pool-surface": {
      "use": "You dip your hand in the water. It's ice-cold, mineral-heavy, and your fingers immediately go numb. Whatever lives in these depths doesn't appreciate visitors."
    }
  },
  "underground_river": {
    "rocky-shore": {
      "use": "You kneel on the rocky shore and splash water on your face. It's freezing. Your skin tingles where the mineral-rich water touches it. Refreshing, in the way that being slapped is refreshing."
    }
  },
  "village_path": {
    "well": {
      "pull": "You pull at the well's bucket chain. It rattles and clinks, descending into darkness. From far below comes a distant splash, then silence. The well gives nothing back."
    },
    "rolling-hills": {
      "open": "The rolling hills stretch in every direction, already as open as landscape gets. There's no door in a hill. There's no mechanism to reveal. It's just... earth."
    }
  },
  "village_square": {
    "notice-board": {
      "pull": "You pull at the notice board. It rocks slightly on its post but holds firm, weighed down by centuries of accumulated notices, each more urgent and ignored than the last."
    },
    "bridge-toll-coin": {
      "take": "The toll coin is wedged in the collection box slot, just visible but thoroughly stuck. Previous travelers jammed it there, either by accident or spite."
    },
    "stone_merchant": {
      "pull": "You tug at the stone merchant's sleeve. He shrugs you off with the practiced irritation of someone who has been grabbed by customers before. 'Hands off the merchandise. That includes me.'"
    }
  },
  "wizard_tower": {
    "potion-shelves": {
      "use": "You uncork a random potion and sniff it. Your nose goes numb. Your left eye waters. A small voice in your head suggests this was unwise. You re-cork it hastily."
    },
    "trapped-chest": {
      "use": "You run your fingers over the chest's arcane symbols, trying to find a pattern. They pulse in sequence -- warming, then hot, then painfully hot. You pull away. The chest's security system has stages, and you've just passed 'warning.'",
      "open": "You reach for the chest's lid. The arcane symbols blaze white-hot. A force pushes your hands away -- firmly, the way a parent removes a child's fingers from a candle. The chest will not be opened casually."
    }
  }
};

let totalFixed = 0;

for (const [roomId, entities] of Object.entries(fixes)) {
  const filePath = join(roomDir, roomId + '.json');
  let data;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Could not read ${filePath}: ${e.message}`);
    continue;
  }

  const allEntities = [...(data.hotspots || []), ...(data.items || []), ...(data.npcs || [])];

  for (const [entityId, verbFixes] of Object.entries(entities)) {
    const entity = allEntities.find(e => e.id === entityId);
    if (!entity) {
      console.error(`Entity ${entityId} not found in ${roomId}`);
      continue;
    }
    if (!entity.responses) {
      console.error(`Entity ${entityId} in ${roomId} has no responses`);
      continue;
    }
    for (const [verb, newText] of Object.entries(verbFixes)) {
      const old = entity.responses[verb];
      if (old) {
        entity.responses[verb] = newText;
        totalFixed++;
        console.log(`Fixed: ${roomId}/${entityId}.${verb}`);
      } else {
        console.warn(`Verb ${verb} not found on ${entityId} in ${roomId}`);
      }
    }
  }

  writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n');
}

console.log(`\nTotal responses fixed: ${totalFixed}`);
