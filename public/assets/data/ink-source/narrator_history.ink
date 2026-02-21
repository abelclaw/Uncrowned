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

-> END
