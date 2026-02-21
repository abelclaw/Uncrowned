EXTERNAL hasFlag(flagName)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== room_commentary ===
{getDeathCount() > 5:
    You've died {getDeathCount()} times now. At this point, Death has your number on speed dial.
- else:
    {getDeathCount() > 2:
        Another room, another opportunity for your untimely demise. You're getting quite the collection.
    }
}

{visitedRoom("cave_entrance") && visitedRoom("village_path"):
    You've been around, haven't you? The cave, the village... quite the explorer. Or quite lost.
- else:
    {visitedRoom("cave_entrance"):
        Fresh from the cave, I see. Still alive. Color me mildly surprised.
    }
    {visitedRoom("village_path"):
        The village path. Charming. Try not to wander off into the forest again.
    }
}

{hasFlag("met_old_man") && hasFlag("knows_cave_name"):
    Armed with the old man's cryptic advice, you press on. Whether that advice was helpful remains to be seen.
- else:
    {hasFlag("met_old_man"):
        The old man's words echo in your mind. Mostly the unhelpful ones.
    }
}
-> END
