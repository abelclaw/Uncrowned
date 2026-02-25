EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_castle_cook"):
    {hasFlag("cook_befriended"):
        Martha nods with something approaching warmth. You brought flour. You're practically family now. #speaker:Martha #emotion:friendly
    - else:
        Martha glances up from her chopping. You again. I'm busy. What do you need? #speaker:Martha #emotion:neutral
    }
- else:
    Martha the Cook looks up from her chopping block with the expression of someone who has been the only competent person in a building for far too long. #speaker:Martha #emotion:irritated
    Another visitor. Wonderful. I don't suppose you've brought flour?
    No? Of course not. Nobody brings flour. They bring problems.
    ~ setFlag("met_castle_cook")
}

+ [Ask about the flour situation] -> flour_problem
+ [Ask about the castle] -> castle_info
+ [Ask about the spirit brew] -> spirit_brew_hint
+ {hasFlag("cook_befriended")} [Ask about the dungeon] -> dungeon_hint
+ {hasItem("flour-sack")} [Offer the flour] -> flour_delivery
+ [Leave] -> farewell

=== flour_problem ===
Martha stabs the chopping block with her cleaver for emphasis. #speaker:Martha #emotion:frustrated
The rats. THE RATS. They've taken over the servants' quarters.
Every sack of flour, every grain of wheat, eaten. By rats.
I've been trying to bake bread with DUST. Do you know what dust bread tastes like?
She pauses.
It tastes like dust. Obviously. I'm a cook, not a miracle worker.
If someone could deal with the rats, I could get to the last flour sack they haven't found.
There's a rat trap in the old gardener's shed. In the garden. If someone were so inclined.
-> greeting

=== castle_info ===
Martha leans against the counter. #speaker:Martha #emotion:tired
This castle has been falling apart since the king choked on that olive.
I'm the only staff left. The others fled, got petrified, or just stopped showing up.
The guards stay because they're contractually obligated. I stay because someone has to feed them.
There's a hallway through there -- leads to the throne room, the servants' quarters, and one locked room.
She taps her apron pocket.
I have a key to that room. A skeleton key. Found it in the old king's sock drawer.
Don't ask why I was in the sock drawer. A cook needs to know where everything is.
But I'm not giving it away for free. Bring me flour and we'll talk.
-> greeting

=== spirit_brew_hint ===
Martha raises an eyebrow. #speaker:Martha #emotion:curious
Spirit brew? You want to summon ghosts? In my castle?
She sighs.
Fine. I've seen the recipe. Sage, water, and a silver vessel. The sage grows wild in the garden.
There's an old chalice here in the kitchen you can have. Fill it from the courtyard well.
Combine the water and sage and you've got yourself a ghost-summoning cocktail.
Use it in the throne room if you want to meet His Translucent Majesty.
She waves a hand.
King Mortimer. Dead from an olive. Haunts the throne room. Very chatty for a corpse.
-> greeting

=== dungeon_hint ===
Martha lowers her voice. #speaker:Martha #emotion:serious
Since you brought flour, I'll tell you something useful.
The castle has a dungeon. Below the courtyard. Nobody goes there anymore.
But I've heard sounds. Footsteps. Paper shuffling.
Someone -- or something -- is still working down there. In the dark. Filing.
She shivers.
I don't go near the dungeon. I'm a cook, not an explorer.
But if you're heading to Act 3's territory, that's where you'll find answers.
-> greeting

=== flour_delivery ===
Martha's eyes light up with an intensity normally reserved for religious experiences. #speaker:Martha #emotion:overjoyed
FLOUR! Real flour! Not stone flour, not dust flour, ACTUAL FLOUR!
She snatches the sack, weighs it expertly, and clutches it to her chest.
You beautiful, beautiful person. Do you know how long I've been waiting for this?
A deal's a deal. Here.
She reaches into her apron and produces a bone-shaped key.
Skeleton key. Opens the locked door in the hallway. Kitchen stores and the castle map are through there.
Don't lose it. Skeleton keys are single-use. Like most things in this castle.
~ setFlag("flour_delivered")
~ setFlag("cook_befriended")
~ removeItem("flour-sack")
~ addItem("skeleton-key")
-> greeting

=== farewell ===
{hasFlag("cook_befriended"):
    Martha waves a flour-dusted hand. Come back anytime. The bread will be ready in an hour. #speaker:Martha #emotion:friendly
- else:
    Martha returns to her chopping. Bring flour next time. Or don't come back. #speaker:Martha #emotion:neutral
}
-> END
