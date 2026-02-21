EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_old_man"):
    {getDeathCount() > 2:
        Back again? You do have a remarkable talent for not staying dead.
    - else:
        Ah, you again. Back for more wisdom, are we?
    }
- else:
    Well, well. A visitor. Haven't had one of those since the last one died. #speaker:Old Man #emotion:suspicious
    ~ setFlag("met_old_man")
}

What brings you to my hovel?
+ [Ask about the cave] -> cave_info
+ [Ask about the village] -> village_info
+ {hasItem("rusty-key")} [Show the rusty key] -> key_reaction
+ {hasItem("mysterious-bottle")} [Show the mysterious bottle] -> bottle_reaction
+ {hasFlag("knows_cave_name")} [Ask about the Screaming Caverns] -> cavern_details
+ [Leave] -> farewell

=== cave_info ===
The cave? Oh, you mean the Screaming Caverns. #speaker:Old Man
They don't actually scream. That's just the wind.
...Probably.
~ setFlag("knows_cave_name")
-> greeting

=== village_info ===
This village? It used to be something, once. Before the... unpleasantness. #speaker:Old Man
{hasFlag("met_old_man"):
    But you don't want to hear an old man ramble. Or do you?
    + [Yes, tell me more] -> village_history
    + [No thanks] -> greeting
- else:
    -> greeting
}

=== village_history ===
*The old man leans in conspiratorially* #speaker:Old Man #emotion:serious
There's something in that cave. Something old. Something that doesn't want to be found.
If you're fool enough to go looking, you'll need more than a rusty key.
~ setFlag("warned_about_cave")
-> greeting

=== key_reaction ===
*The old man's eyes narrow* #speaker:Old Man #emotion:surprised
Where did you find THAT? That key... it opens the old chest deeper in the cave.
But I wouldn't go sticking it in every lock you find. Some doors are locked for a reason.
~ setFlag("knows_key_purpose")
-> greeting

=== bottle_reaction ===
*The old man recoils slightly* #speaker:Old Man #emotion:alarmed
That's Grandmother's "medicine." Don't drink it. I'm serious.
Last fellow who took a swig grew a third ear. On his knee.
~ setFlag("bottle_identified")
-> greeting

=== cavern_details ===
{hasFlag("warned_about_cave"):
    You want to know more? Fine. The caverns have a guardian. A test. #speaker:Old Man #emotion:serious
    Those who pass the test find what they seek. Those who don't... well, you've already died a few times, haven't you?
    ~ setFlag("knows_cavern_secret")
- else:
    The Screaming Caverns... old place. Older than this village. Older than me, even, which is saying something. #speaker:Old Man
    Ask me about the village first. There's context you'll need.
}
-> greeting

=== farewell ===
Come back anytime. Or don't. I'll be dead either way. #speaker:Old Man #emotion:melancholy
-> END
