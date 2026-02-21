EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_bridge_troll"):
    {getDeathCount() > 5:
        Back again? You die more than my last three bridge-crossers combined. Impressive, in a morbid way. #speaker:Bertram #emotion:concerned
    - else:
        Ah, you again. Still trying to cross, I take it? #speaker:Bertram #emotion:friendly
    }
- else:
    A large troll adjusts his reading glasses and sets down a well-thumbed mystery novel. #speaker:Bertram #emotion:friendly
    Good afternoon. Or morning. Hard to tell from a bridge. I'm Bertram, licensed bridge troll, Local 47.
    Before you ask: yes, I have to do this. It's in my contract. Section 4, paragraph 12, subclause B.
    ~ setFlag("met_bridge_troll")
}

How can I help you today?
+ [Ask about the riddle] -> riddle_info
+ [Ask about the bridge] -> bridge_info
+ [Ask about his book] -> book_info
+ {hasItem("bridge-toll-coin")} [Offer the toll coin] -> toll_offer
+ {hasFlag("riddle_answered")} [Just passing through] -> farewell_friendly
+ [Leave] -> farewell

=== riddle_info ===
Bertram straightens his vest professionally. #speaker:Bertram #emotion:serious
Bridge Troll Regulations, Chapter 7: All crossers must answer one riddle OR pay one toll coin.
I didn't make the rules. Well, actually, we voted on them at the union meeting. But the SPIRIT of the rules predates me.
The riddle is: I am tall when I am young, and short when I am old. What am I?
He waits with the patience of someone who has asked this question ten thousand times.
A candle. The answer is a candle. Everyone gets it. I really need new material.
~ setFlag("riddle_answered")
-> greeting

=== bridge_info ===
Bertram pats the bridge railing affectionately. #speaker:Bertram #emotion:proud
This bridge has been here for three hundred years. I've been here for one hundred and forty of them.
The previous troll retired. Moved to the coast. Got into pottery. Lives a simple life now.
I'd retire too, but the pension doesn't kick in until year two hundred, and I still have sixty to go.
The bridge connects the forest to Castle Erelhain. Or what's left of it. The curse has not been kind.
-> greeting

=== book_info ===
Bertram holds up the novel with genuine enthusiasm. #speaker:Bertram #emotion:excited
"Murder at the Drawbridge" by Constance Moorhen. Third in the series.
The detective is a gnome who solves crimes using only forensic accounting.
It's gripping. I've read it four times. The troll book club meets every second Thursday.
We're a small group. Me, a bridge troll from the eastern pass, and a cave troll who reads audiobooks because caves are dark.
He pauses.
Books are the best part of bridge trolling. Well, books and the occasional toll coin. Not much foot traffic these days.
-> greeting

=== toll_offer ===
Bertram examines the coin with professional interest. #speaker:Bertram #emotion:pleased
A toll coin! Haven't seen one of these in... well, longer than I'd like to admit.
Bit worn, but legal tender is legal tender. He drops it into a lockbox.
You may cross without the riddle. Personally, I think you're missing out. It was a good one.
But the union contract is clear on alternatives. Coin accepted. Bridge is yours.
~ setFlag("toll_paid")
~ removeItem("bridge-toll-coin")
-> greeting

=== farewell_friendly ===
Bertram waves cheerfully. #speaker:Bertram #emotion:happy
Safe travels! Watch out for the castle guards. They're a bit... tense. Understandably.
And if you see a bookshop anywhere, I'm looking for "Murder at the Millpond." Fourth in the series.
-> END

=== farewell ===
Bertram nods politely. #speaker:Bertram #emotion:neutral
Come back anytime. The bridge isn't going anywhere. Neither am I.
He picks up his book and resumes reading.
Sixty more years.
-> END
