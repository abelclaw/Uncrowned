EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL getDeathCount()

=== start ===

{hasFlag("guard_last_orders"):
    -> return_visit
- else:
    -> first_meeting
}

=== first_meeting ===

Captain Aldric's one living eye locks onto you. His stone jaw grinds as he speaks -- each word an effort, squeezed through lips that are half granite. "You. The one who passed the test." His voice sounds like gravel in a tin cup. "I've been briefed. Which is to say, I've been standing here watching the kingdom die and drawing my own conclusions."

* [Ask about the dungeon]
    -> dungeon_info
* [Ask about the treasury]
    -> treasury_info
* [Ask about the curse]
    -> curse_info
* [Ask what you can do]
    -> final_orders

=== dungeon_info ===

"The dungeon. Below the courtyard. The Clerk retreated there after you completed his test." Aldric's stone hand clenches -- or would, if it could still clench. "He's down there, doing paperwork. As if paperwork will fix this. Though..." He pauses. His living eye narrows. "In this kingdom, paperwork might actually fix this. Stranger things have happened. I'm half a statue and still giving orders, for instance."

* [Ask about the treasury]
    -> treasury_info
* [Ask what you can do]
    -> final_orders

=== treasury_info ===

"The treasury is through the dungeon. East door. The Clerk has the key -- he's been using it as a paperweight." A dry, gravelly laugh. "The Kingdom Seal is in there. Not the Royal Seal -- the Administrative one. Different departments. This kingdom runs on precision, even now." His stone half groans. "Especially now."

* [Ask about the dungeon]
    -> dungeon_info
* [Ask what you can do]
    -> final_orders

=== curse_info ===

"The curse is accelerating. You can see it." His living hand gestures at the courtyard -- the frozen guards, the stone well, the crumbling walls. "I've watched it take my guards. My walls. Half of me." He looks down at his stone arm. "It doesn't hurt. That's the worst part. It just... stops. You stop feeling. Stop moving. Stop being anything but rock." He meets your eye. "Fix this. Before I become a very loyal garden ornament."

{getDeathCount() > 30:
    "And you -- you've died {getDeathCount()} times. You keep coming back. That's either determination or a processing error in the afterlife. Either way, the kingdom needs that stubbornness now."
}

* [Ask what you can do]
    -> final_orders

=== final_orders ===

~ setFlag("guard_last_orders")

Aldric straightens -- his living side, at least. "Orders. Final orders. From the last functioning officer of the Kingdom of Erelhain." His voice is formal. Military. "One: find the Curse Contract in the Royal Archive. It has an exit clause. Two: get the Kingdom Seal from the treasury. Three: deal with the Clerk. Convince him or outwit him -- he needs to cooperate for the Rite to work. Four: perform the Rite of Administrative Closure in the throne room." He salutes -- half a salute, with his one working arm. "Save the kingdom, tinker. That's an order."

-> END

=== return_visit ===

"Still here." Aldric's voice is quieter now. More stone has crept across his jaw since you last spoke. "The curse is advancing. My orders stand. Archive. Treasury. Clerk. Throne room. In whatever order you can manage."

{hasFlag("found_curse_contract"):
    "You have the contract. Good. One down."
}
{hasFlag("treasury_opened"):
    "Treasury's open. The seal is there."
}
{hasFlag("clerk_allied"):
    "The Clerk is cooperating? I... didn't expect that. Well done."
}
{hasFlag("clock-fixed"):
    "The clock is running again. The curse has slowed. You've bought us time. Use it."
}

"Go. Before I run out of words to say with half a mouth."

-> END
