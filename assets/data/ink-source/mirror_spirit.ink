EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL getDeathCount()

=== start ===

{hasFlag("mirror_truth_revealed"):
    -> after_truth
- else:
    -> first_meeting
}

=== first_meeting ===

The mirror glows. A voice emerges -- not from one direction, but from all of them, bouncing between glass surfaces until it sounds like a chorus of one. "Ah. The Uncrowned Sovereign. Or so they call you." The voice pauses. "Shall I show you what you really are?"

* [Yes, show me the truth]
    -> reveal_truth
* [Who are you?]
    -> who_are_you
* [What is this place?]
    -> about_hall

=== who_are_you ===

"I am the reflection that does not lie. I have lived in these mirrors since the castle was built. I have watched kings and queens, heroes and cowards, and a surprising number of people checking their teeth." The spirit's face shifts in the glass. "I show truth. Not always welcome truth. But the only kind worth having."

* [Show me the truth, then]
    -> reveal_truth
* [What is this place?]
    -> about_hall

=== about_hall ===

"The Hall of Mirrors was built as a meditation space. Kings came here to see themselves clearly before making decisions." A pause. "Most of them stopped coming after the first visit. Truth is an acquired taste, and monarchs prefer something sweeter. Like flattery. Or wine."

* [Show me the truth]
    -> reveal_truth

=== reveal_truth ===

~ setFlag("mirror_truth_revealed")

The mirrors around you shift. Every reflection changes. They show you -- not as you are, but as every version of what people think you are. A crowned figure. A prophesied savior. A legendary hero.

Then, one by one, the false reflections fade. What's left is just you. Pip. A tinker with messy hair and a pack full of items you've been collecting because a series of strangers told you to.

"You are not the Uncrowned Sovereign," the spirit says. "There is no Uncrowned Sovereign. The prophecy was a committee decision, filed without peer review."

The voice softens -- as much as a chorus of reflected voices can soften.

"But you opened the locked door. You crossed the bridge. You navigated the bureaucracy. You passed the guardian's test. Not because you were chosen. Because you chose to keep going."

{getDeathCount() > 20:
    "You've died {getDeathCount()} times and come back every time. That isn't destiny. That's stubbornness. And stubbornness, tinker, is worth more than prophecy."
- else:
    {getDeathCount() > 5:
        "You've died and returned. Multiple times. Destiny doesn't do that. Determination does."
    }
}

"The kingdom doesn't need a hero. It needs someone willing to do the paperwork. And that, Pip, is you."

The mirrors return to normal. Just glass. Just reflections. Just you, looking back at yourself, ordinary and sufficient.

-> END

=== after_truth ===

The Mirror Spirit's face appears briefly in the central mirror. "You know who you are now. Ordinary. Determined. Enough." The face fades. "Go. The kingdom is waiting for someone exactly like you. Which is to say: someone with no qualifications and excellent filing skills."

-> END
