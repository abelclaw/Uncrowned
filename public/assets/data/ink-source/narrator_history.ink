EXTERNAL hasFlag(flagName)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== room_commentary ===

// Death count milestones
{getDeathCount() > 10:
    You've died {getDeathCount()} times. At this rate, you should really be paying the underworld rent. You're their most frequent visitor. They've started leaving the light on.
- else:
    {getDeathCount() > 5:
        You've died {getDeathCount()} times now. At this point, Death has your number on speed dial. He's considering a loyalty program.
    - else:
        {getDeathCount() > 2:
            Another room, another opportunity for your untimely demise. You're getting quite the collection of death experiences. Variety is the spice of death, after all.
        - else:
            {getDeathCount() > 0:
                You've tasted death. It tastes like poor decisions and a faint hint of regret. Perhaps you'll be more careful now. Perhaps not.
            }
        }
    }
}

// Room visit commentary
{visitedRoom("forest_clearing") && visitedRoom("cave_entrance") && visitedRoom("village_path"):
    You've been around, haven't you? The forest, the cave, the village... quite the explorer. Or quite lost. The distinction is academic at this point.
- else:
    {visitedRoom("cave_entrance"):
        Fresh from the cave, I see. Still alive. Color me mildly surprised. The cave has a way of keeping visitors permanently.
    }
    {visitedRoom("village_path"):
        The village path. Charming. Try not to wander off into the forest. The sign about certain death is not decorative.
    }
}

// Cave progress
{visitedRoom("cave_depths") && visitedRoom("underground_pool"):
    You've ventured into the depths AND found the underground pool. Thorough. Most visitors turn back after the first pit trap. You pressed on, which is either brave or a sign of serious cognitive impairment.
- else:
    {visitedRoom("cave_depths"):
        You made it to the cave depths. The bones on the floor suggest not everyone does. Congratulations on your continued existence.
    }
}

// Village exploration
{visitedRoom("village_square") && visitedRoom("old_watchtower"):
    The village square and the watchtower. You've seen the curse up close and spotted the castle in the distance. The picture is becoming clearer, and it is not a pretty one.
- else:
    {visitedRoom("village_square"):
        The village square. You've seen what the petrification does. The fountain, the merchant... it's spreading. Tick tock.
    }
    {visitedRoom("old_watchtower"):
        The watchtower. A good vantage point for surveying the general state of catastrophe. At least the view is nice, assuming you ignore the encroaching apocalypse.
    }
}

// Knowledge flags
{hasFlag("met_old_man") && hasFlag("knows_cave_name") && hasFlag("knows_cavern_secret"):
    Armed with the old man's cryptic wisdom, you know about the Screaming Caverns, the guardian, and the test. Whether this knowledge will keep you alive is another matter entirely. Knowledge is power. Knowledge is also occasionally the thing that leads you into dark caves.
- else:
    {hasFlag("met_old_man") && hasFlag("knows_cave_name"):
        The old man told you about the Screaming Caverns. There's more to learn, if you can get him to talk. He knows things. Unhelpful things, mostly, but things nonetheless.
    - else:
        {hasFlag("met_old_man"):
            The old man's words echo in your mind. Mostly the unhelpful ones. He knows more than he's saying. Everyone always does.
        }
    }
}

// Curse awareness
{hasFlag("knows_about_curse"):
    The petrification curse weighs on your mind. The kingdom is turning to stone, and nobody seems to have a plan beyond 'filing the appropriate paperwork.' Bureaucracy: effective against everything except actual problems.
}

// Key puzzle progress
{hasFlag("door-unlocked"):
    You've opened the cave door. The depths await. Whether they await with hospitality or hostility is a matter of perspective. And torch availability.
}

// Crystal discovery
{hasFlag("pool_investigated"):
    The underground pool's reflections showed you something. Or showed you nothing in a very suggestive way. Either way, the crystal at its edge seems important.
}

// Castle sighting
{hasFlag("seen_castle"):
    Castle Erelhain sits on the horizon like a grey tooth in a sick jawline. The curse is visible even from here. Someone needs to do something about it, and you have the sinking feeling that someone is you.
}

// Bottle knowledge
{hasFlag("bottle_identified"):
    At least you know not to drink the mysterious bottle now. Small victories. In a kingdom turning to stone, you take what you can get.
}

// Death count milestones (higher tiers)
{getDeathCount() > 20:
    You've died {getDeathCount()} times. You should have a frequent-dying card by now. Tenth death free. Except they're all free. And permanent. Usually.
- else:
    {getDeathCount() > 15:
        Deaths: {getDeathCount()}. At this rate, the afterlife is going to need a bigger lobby. You're single-handedly overloading the system.
    }
}

// Act 1b room commentary
{visitedRoom("forest_bridge"):
    Bertram's bridge. The troll with a book club and a mortgage. The kingdom's infrastructure may be crumbling, but the bridge tolling industry remains robust.
}

{visitedRoom("castle_courtyard") && visitedRoom("castle_hallway"):
    Castle Erelhain. Once grand. Now grand in the way that ruins are grand -- impressively sad. The guards maintain standards despite having nothing left to guard but standards.
- else:
    {visitedRoom("castle_courtyard"):
        The castle courtyard. Weeds in the flagstones, guards at the gate, and the general atmosphere of an empire in its final PowerPoint presentation.
    }
}

{visitedRoom("throne_room") && hasFlag("met_ghost_king"):
    You've met the Ghost King. A dead monarch who haunts his own throne room and makes jokes about his death by olive. Erelhain's leadership situation has not improved since his passing.
}

{visitedRoom("royal_kitchen") && hasFlag("cook_befriended"):
    Martha the Cook. The most competent person in the castle. Possibly the most competent person in the kingdom. She runs the kitchen with an iron fist and a very sharp cleaver. You brought her flour. She considers you family now.
}

{visitedRoom("servants_quarters") && hasFlag("rats_caught"):
    The rat problem in the servants' quarters has been resolved. Democracy has been restored among the surviving rodents, who have relocated to parts of the castle that are Someone Else's Problem.
}

// Act 1b progression
{hasFlag("decree-sealed") && hasFlag("ghost_approved_decree"):
    You forged a royal decree and got a ghost to approve it. In any other kingdom, this would be a crime. In Erelhain, it's a leadership quality.
}

{hasFlag("skeleton-key-used"):
    The skeleton key opened the locked door and revealed the route to the Screaming Caverns. The map shows the way. Your better judgment shows the exit. You're following the map.
}

// Act transition commentary
{visitedRoom("cavern_entrance_hall"):
    The Screaming Caverns. Where bureaucracy goes to become architecture. The Clerk awaits. The test beckons. The paperwork is eternal.
}

// Act 2 room commentary
{visitedRoom("filing_room") && visitedRoom("waiting_room"):
    You've navigated the filing room and the waiting room. The bureaucratic gauntlet is behind you. The physical gauntlet lies ahead. Both are equally hostile, but only one involves paperwork.
}

{visitedRoom("cavern_west_wing") && hasFlag("mushroom_pattern_solved"):
    The mushroom pattern is solved. Bioluminescent navigation: left, right, center, left, center. The caverns glow with living light, which is beautiful and also deeply unnecessary for a cave system designed to test bureaucrats.
}

{visitedRoom("forge_chamber") && hasFlag("forge_lit"):
    The ancient forge burns again. After centuries of cold darkness, fire returns. The dwarven spirit approves. Good metal is being shaped once more.
}

{hasFlag("guardian-defeated"):
    The guardian's test is passed. 847, Aldric the Fastidious, Service. Three answers that summarize a kingdom's entire philosophy. The crystal is yours.
}

{hasFlag("clerk-satisfied"):
    The Clerk has been satisfied. Grudgingly. Your VIP stamp has bypassed centuries of queue management, and the Clerk's left eye will never stop twitching. You've done more damage to his filing system than time itself.
}

// Act 2->3 transition
{visitedRoom("petrified_forest"):
    The forest is stone now. The place where you first arrived -- the clearing, the wildflowers, the stump -- all grey granite. The curse has eaten the edges of the kingdom and is working inward. Whatever you're going to do, the time to do it is now. The time to do it was actually yesterday, but you were busy navigating bureaucratic cave systems.
}

// Act 3 room commentary
{visitedRoom("castle_courtyard_act3"):
    The castle courtyard, revisited. The guards who challenged you are statues now. The well is stone. Captain Aldric holds his post with half a body and twice the determination. Erelhain's final hours are counting down.
}

{visitedRoom("royal_archive"):
    The Royal Archive. Centuries of paperwork, most of it now stone. But the curse contract -- the one document that matters -- was filed correctly. Of course it was. This kingdom may be dying, but its filing system is impeccable.
}

{visitedRoom("wizard_tower"):
    The wizard's tower. Marlowe's tower. The place where a parking grudge became an apocalypse. Every great catastrophe starts with a petty grievance. This one just happened to come with an administrative exit clause.
}

{visitedRoom("clock_tower") && hasFlag("clock-fixed"):
    The clock runs again. Time flows. The curse slows. A gear spring and some oil -- the kingdom's salvation was a maintenance task. The annual clock budget was two copper coins. Underfunding has consequences.
- else:
    {visitedRoom("clock_tower"):
        The clock tower stands frozen at 3:47. The moment the curse began. The moment a wizard lost his parking spot and the kingdom lost its future. Time is the enemy, and time has stopped cooperating.
    }
}

{visitedRoom("dungeon") && hasFlag("clerk_allied"):
    The Clerk is an ally now. The immortal bureaucrat who created the curse is helping you destroy it. Redemption through paperwork. Only in Erelhain.
- else:
    {visitedRoom("dungeon"):
        The dungeon. The Clerk's true office. Filing cabinets where cells should be. A trap door helpfully labeled. The bureaucratic heart of the kingdom, beating with stamps and disapproval.
    }
}

{visitedRoom("mirror_hall") && hasFlag("mirror_truth_revealed"):
    The Mirror Spirit showed you the truth. You are not the Uncrowned Sovereign. There is no Uncrowned Sovereign. There is just Pip, a tinker who kept walking forward because no one told you convincingly enough to stop. The most honest mirror in the kingdom showed you something better than destiny: adequacy.
}

{visitedRoom("rooftop"):
    The rooftop. The kingdom spread below like a map of failure. Grey in every direction. But also: a view worth saving. Fields, forests, rivers, villages -- all of it worth one more attempt. One more puzzle. One more form filed correctly.
}

{visitedRoom("treasury"):
    The Royal Treasury. Nearly empty. The kingdom spent its wealth on wars, feasts, and one very expensive funeral. What remains is a seal on a cushion and a vial of oil. The essentials, as it turns out.
}

// Act 3 progression milestones
{hasFlag("found_curse_contract"):
    The curse contract is in your hands. Clause 47-B: Administrative Closure. The wizard who cast the curse followed the rules even while breaking them. Bureaucracy is inescapable, even for apocalypses.
}

{hasFlag("clerk_remembers"):
    The Clerk remembers. Marlowe remembers. The immortal bureaucrat who has been running the test for four hundred years now knows he created it. He cast the curse. Over a parking spot. The therapy bills would be staggering, but at least he's helping fix it now.
}

{hasFlag("clerk_outwitted"):
    You outwitted the Clerk with his own rules. Clause 47-B, procedurally valid closure request, registered applicant. He couldn't argue. His own bureaucracy defeated him. The irony is so thick you could file it.
}

{hasFlag("guard_last_orders"):
    Captain Aldric gave his final orders. Archive. Treasury. Clerk. Throne room. A half-petrified man giving military directives. Duty doesn't stop for curses. Apparently.
}

{hasFlag("mirror_truth_revealed"):
    You know the truth now. No prophecy. No destiny. Just a tinker with a collection of items and a willingness to do the work. The kingdom's savior is the least qualified person in the room. As usual.
}

// Death count milestones (Act 3 tiers)
{getDeathCount() > 40:
    Deaths: {getDeathCount()}. You have died more times than some kingdoms have existed. The afterlife has installed a revolving door for you specifically. Your persistence in the face of repeated mortality is either inspiring or a cosmic clerical error.
- else:
    {getDeathCount() > 30:
        You've died {getDeathCount()} times. At this point, Death doesn't even stand up when you arrive. He just waves you through. 'Back again? Third door on the left. You know the way.'
    - else:
        {getDeathCount() > 25:
            Deaths: {getDeathCount()}. A quarter-century of deaths. You've experienced more ends than most people experience beginnings. The narrator has run out of novel ways to express sympathy.
        }
    }
}

// Endgame commentary
{hasFlag("rite_prepared"):
    Everything is in place. The Crystal. The Seal. The Contract. The Clerk. The Ghost King. The rite circle glows. This is the moment. All the deaths, all the puzzles, all the paperwork -- it comes down to this. One final stamp. One final filing. One final bureaucratic act to save a kingdom.
}

{hasFlag("curse-broken"):
    The curse is broken. The kingdom lives. Color returns to stone. Water flows from wells. People wake from granite sleep. And at the center of it all: Pip. A tinker. An ordinary person who did extraordinary paperwork. The narrator has watched many heroes. None of them saved a kingdom by filing a form. This is, perhaps, the most honest kind of heroism: showing up, doing the work, and asking for nothing but directions and a warm meal. Well done, Pip. Well done.
}

-> END
