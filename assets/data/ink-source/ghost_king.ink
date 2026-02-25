EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("ghost_talked_once"):
    {getDeathCount() > 8:
        You again. You die so often that Death has started forwarding your mail here. #speaker:Ghost King #emotion:amused
    - else:
        The living return. How... persistent of you. #speaker:Ghost King #emotion:bored
    }
- else:
    The Ghost King regards you with the weary patience of someone who has been dead for too long to care about pleasantries. #speaker:Ghost King #emotion:irritated
    So. You're the one who poured sage water on my floor.
    I was having a perfectly adequate haunting before you interrupted. What do you want?
    ~ setFlag("ghost_talked_once")
}

+ [Ask about the kingdom] -> kingdom_info
+ [Ask how he died] -> death_story
+ {hasItem("sealed-decree")} [Show the sealed decree] -> decree_reaction
+ {hasFlag("knows_about_curse")} [Ask about the curse] -> curse_info
+ {hasFlag("knows_kingdom_history")} [Ask about the Crystal of Mundanity] -> artifact_info
+ {hasFlag("knows_about_artifact")} [Ask where to find the crystal] -> artifact_details
+ [Leave] -> farewell

=== kingdom_info ===
The Ghost King sighs, which is impressive for someone without lungs. #speaker:Ghost King #emotion:melancholy
Erelhain was founded in the year 847 by people who believed bureaucracy could solve anything.
They were wrong, obviously. But they were wrong in a very organized fashion.
The kingdom ran on paperwork. Seals, stamps, forms, procedures.
The founding bureaucrat, Aldric the Fastidious, built the Screaming Caverns as a test.
Anyone who wanted to rule had to prove they could navigate paperwork.
He leans forward.
It was stupid. But it worked. For a while.
~ setFlag("knows_kingdom_history")
-> greeting

=== death_story ===
The Ghost King's expression darkens, which is saying something for someone already translucent. #speaker:Ghost King #emotion:bitter
I choked on an olive. At my own coronation anniversary feast.
An OLIVE. Not poison. Not an assassin's blade. An olive from the appetizer course.
Three hundred guards, a court physician, and a food taster, and nobody thought to check the olive pit situation.
I haunted the olive grove for fifty years out of spite. Then I came back here. The grove was boring.
He straightens his spectral crown.
Don't tell anyone how I died. I mean, everyone already knows. But still.
-> greeting

=== decree_reaction ===
The Ghost King examines the sealed decree with the practiced eye of a monarch who signed thousands of them. #speaker:Ghost King #emotion:surprised
This... this is MY seal. On a blank decree. You forged a royal document.
A pause.
It's actually quite good forgery. The wax pattern is correct. The badger looks suitably disgruntled.
He straightens up.
Fine. I'll approve it. Not because it's legitimate, but because the kingdom needs someone who is willing to commit fraud in its service. That's the kind of pragmatism we need.
He touches the decree. It glows with spectral light.
Consider it blessed. Or cursed. Same thing, really, when a ghost is involved.
~ setFlag("ghost_approved_decree")
-> greeting

=== curse_info ===
The Ghost King's glow dims perceptibly. #speaker:Ghost King #emotion:serious
The petrification curse. Yes. It started after I died. Some say it's connected.
It came from deep in the kingdom's foundations. From the bureaucratic systems themselves.
Someone -- or something -- activated a clause in the kingdom's original charter.
The curse spreads from the edges inward. Trees, buildings, people.
There's a cure. There's always a cure. The founding bureaucrats were thorough.
But finding it requires passing a test that hasn't been attempted in centuries.
The Screaming Caverns hold the answer. And the Crystal of Mundanity.
~ setFlag("knows_about_artifact")
-> greeting

=== artifact_info ===
The Ghost King nods gravely. #speaker:Ghost King #emotion:serious
The Crystal of Mundanity. Fittingly named -- it's the most boring-looking artifact in existence.
A grey crystal. Plain. Unremarkable. And the only thing that can break the curse.
It's in the deepest part of the Screaming Caverns, behind a guardian and a force barrier.
The test to reach it involves bureaucratic puzzles, which I find both appropriate and infuriating.
~ setFlag("knows_about_artifact")
-> greeting

=== artifact_details ===
The Ghost King lowers his voice, though being a ghost, volume is somewhat optional. #speaker:Ghost King #emotion:serious
The caverns are north of the forest bridge. You'll need that map from the castle to find the entrance.
Inside, you'll meet the Clerk. An immortal bureaucrat. Very old. Very patient. Very irritating.
Navigate his paperwork, pass the guardian's test, and the crystal is yours.
Then bring it back here. The Rite of Administrative Closure requires the crystal, a kingdom seal, and the original curse contract.
He pauses.
I know. It sounds absurd. It IS absurd. But that's bureaucratic magic for you.
~ setFlag("knows_artifact_location")
-> greeting

=== farewell ===
The Ghost King waves dismissively. #speaker:Ghost King #emotion:bored
Go. Save the kingdom. Or don't. I'll be here either way.
Being dead is remarkably low-pressure. No deadlines. Ha. Dead-lines.
He pauses.
That was a joke. I've had centuries to workshop it. It has not improved.
-> END
