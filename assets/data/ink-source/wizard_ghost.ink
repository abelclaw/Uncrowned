EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL getDeathCount()

=== start ===

{hasFlag("met_wizard_ghost"):
    -> return_visit
- else:
    -> first_meeting
}

=== first_meeting ===

~ setFlag("met_wizard_ghost")

The spectral figure blinks at you. "A visitor? I haven't had a visitor since..." He trails off, eyes unfocusing. "What year is it? Never mind. Doesn't matter. I'm Marlowe. Wizard Marlowe. This is my tower. I'm not dead." He looks down at his translucent hands. "I'm... transparent. That's different. Transparent is a fashion choice."

* [Ask about the curse]
    -> curse_info
* [Ask about the memory crystal]
    -> memory_crystal
* [Ask about the potions]
    -> potions
* [Ask about the parking spot]
    -> parking

=== curse_info ===

"Curse? What curse?" Marlowe floats in a circle, agitated. "There's a curse? On the kingdom?" He peers out a window. "Oh. The grey thing. I thought that was just the weather. It's been grey for... how long has it been grey?" He frowns. "I feel like I should know something about this. There's a gap in my memory. Right where important information should be. It's very inconvenient."

* [Ask about the memory crystal]
    -> memory_crystal
* [Ask about the parking spot]
    -> parking

=== memory_crystal ===

"Memory crystal? Oh, yes. I made those. Brilliant invention. You can extract specific memories and store them in crystal. Very useful for... for..." He trails off again. "I made one for myself, I think. Extracted something. Can't remember what. Because I extracted the memory of what I extracted." He laughs, then stops. "That's not funny, is it? It's concerning. The crystal should be around here somewhere. Small, glowing, full of regret. If you find it, don't give it back to me without warning. Or do. I can't remember if I have opinions about that."

* [Ask about the potions]
    -> potions
* [Ask about the parking spot]
    -> parking

=== potions ===

"The potions! Yes, be careful with those. Some of them are centuries old and have developed personalities. The blue one thinks it's better than the green one. The red one is explosive. The one labeled 'Definitely Not Poison' is, in fact, poison. I labeled it that as a joke." He pauses. "Or as a warning. I can't remember which."

{hasFlag("found_curse_contract"):
    "You have a contract? A curse contract? Let me see... 'Clause 47-B, Administrative Closure...' This handwriting is familiar. Very familiar. It's MY handwriting." He stares. "Did I...? No. I couldn't have. Could I?"
}

* [Ask about the parking spot]
    -> parking
* [Ask about the curse]
    -> curse_info

=== parking ===

"The parking spot!" Marlowe's ghostly form flares with remembered outrage. "Spot 47-B! Right in front of the feast hall! I'd been parking there for THREE HUNDRED YEARS and they gave it to some visiting dignitary! Do you know what that's like? Three centuries of consistent parking, and some duke from abroad gets your spot because he brought a nicer horse!" He fumes, floating higher. "I may have... overreacted. I don't remember exactly what I did. But I was VERY angry. The kind of angry where you... where you might..." He trails off, looking at the scorch mark on the wall. "I'm sure it was nothing significant."

{getDeathCount() > 15:
    "You seem to die a lot. That's not a criticism. I die-adjacent myself, being a ghost and all. Solidarity."
}

* [Ask about the curse]
    -> curse_info
* [Ask about the memory crystal]
    -> memory_crystal

=== return_visit ===

"You're back! I forgot you were here. I forget a lot of things. Essential things. Important things. Things that are probably relevant to the grey apocalypse happening outside." He gestures vaguely at the window.

{hasFlag("clerk_remembers"):
    "The Clerk... remembers? He knows he's me? Or I'm him? The pronouns are confusing when your past self is a separate person. I hope he's taking it well. He's probably filing a complaint about it."
}

{hasFlag("clock-fixed"):
    "The clock is working again? Interesting. I always liked that clock. It was the one thing in this kingdom that ran on time. Unlike the kingdom itself."
}

* [Ask about the curse]
    -> curse_info
* [Ask about the potions]
    -> potions
* [Goodbye]
    "Right, yes. Off you go. Saving the kingdom and whatnot. I'll be here. Floating. Forgetting things. As one does."
    -> END

-> END
