EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_old_man"):
    {getDeathCount() > 5:
        You again. At this point, Death sends you back out of professional embarrassment. #speaker:Old Man #emotion:amused
    - else:
        {getDeathCount() > 2:
            Back again? You do have a remarkable talent for not staying dead. #speaker:Old Man #emotion:suspicious
        - else:
            Ah, you again. Back for more wisdom, are we? #speaker:Old Man #emotion:neutral
        }
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
+ {hasFlag("knows_about_curse")} [Ask about the curse] -> curse_info
+ {hasItem("cave-crystal-shard")} [Show the crystal shard] -> crystal_reaction
+ [Leave] -> farewell

=== cave_info ===
The cave? Oh, you mean the Screaming Caverns. #speaker:Old Man #emotion:serious
They don't actually scream. That's just the wind.
...Probably.
The locals sealed the deeper sections long ago. Something about 'unspeakable horrors.' The usual.
~ setFlag("knows_cave_name")
-> greeting

=== village_info ===
This village? It used to be something, once. Before the... unpleasantness. #speaker:Old Man #emotion:melancholy
{hasFlag("met_old_man"):
    But you don't want to hear an old man ramble. Or do you?
    + [Yes, tell me more] -> village_history
    + [No thanks] -> greeting
- else:
    -> greeting
}

=== village_history ===
The old man leans in conspiratorially. #speaker:Old Man #emotion:serious
There's something in that cave. Something old. Something that doesn't want to be found.
If you're fool enough to go looking, you'll need more than a rusty key.
You'll need light. Real light. Or at least... something that glows.
The mushrooms in the cave entrance, they have a certain... luminosity.
Stick one on a branch and you've got yourself a torch. Of sorts.
~ setFlag("warned_about_cave")
-> greeting

=== key_reaction ===
The old man's eyes narrow as he examines the key. #speaker:Old Man #emotion:surprised
Where did you find THAT? That key... it opens the old door deeper in the cave.
But I wouldn't go sticking it in every lock you find. Some doors are locked for a reason.
This particular door? It was locked to keep people OUT of the depths. Not to keep anything in.
...I'm about eighty percent sure it was to keep people out.
~ setFlag("knows_key_purpose")
-> greeting

=== bottle_reaction ===
The old man recoils at the sight of the bottle. #speaker:Old Man #emotion:alarmed
That's Grandmother's "medicine." Don't drink it. I'm serious.
Last fellow who took a swig grew a third ear. On his knee.
The one before that just... dissolved. Very gradually. Over a weekend.
Give it here, I'll dispose of it properly. Or you could keep it. Your funeral. Possibly literally.
~ setFlag("bottle_identified")
~ setFlag("bottle-safe")
-> greeting

=== cavern_details ===
{hasFlag("warned_about_cave"):
    The old man's voice drops to a whisper. #speaker:Old Man #emotion:serious
    You want to know more? Fine.
    The Screaming Caverns were built -- yes, BUILT -- by the kingdom's founders as a test.
    A guardian sits in the deepest chamber. It asks questions. Three of them.
    Answer correctly, and you find what the kingdom has hidden away for centuries.
    Answer incorrectly... well. The guardian isn't known for its patience. Or its mercy.
    Those who pass the test find what they seek. Those who don't... well, you've already died a few times, haven't you?
    ~ setFlag("knows_cavern_secret")
- else:
    The Screaming Caverns... old place. Older than this village. Older than me, even, which is saying something. #speaker:Old Man #emotion:neutral
    Ask me about the village first. There's context you'll need.
}
-> greeting

=== curse_info ===
The old man's expression darkens considerably. #speaker:Old Man #emotion:serious
So you've seen the notice. The petrification.
It started at the edges of the kingdom -- trees, stones, small animals. Now it's reaching the village.
That merchant in the square? Half stone already. Keeps trying to sell things. Admirable, in a grotesque sort of way.
The curse came from somewhere deep. Some say the cave. Some say the castle. I say it doesn't matter WHERE it came from.
What matters is that someone stops it before we're all garden ornaments.
-> greeting

=== crystal_reaction ===
The old man leans forward, eyes wide with surprise. #speaker:Old Man #emotion:surprised
Where did you find that? That crystal... it resonates with the old magic.
The castle guards -- what's left of them -- they recognize that kind of crystal.
If you're heading toward the castle, that shard might be your ticket in.
It proves you've been to the deep places. It proves you're... relevant.
Whether that's a good thing or not is debatable.
-> greeting

=== farewell ===
Come back anytime. Or don't. I'll be dead either way. Statistically speaking, so will you. #speaker:Old Man #emotion:melancholy
-> END
