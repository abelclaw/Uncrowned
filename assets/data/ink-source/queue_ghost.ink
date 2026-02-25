EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_queue_ghost"):
    The ghost waves enthusiastically. You came back! I love visitors. Do you know how long it has been since I had company? #speaker:Patient Ghost #emotion:excited
    Two hundred and seven years. But who is counting?
    He holds up a tally-marked stone.
    I am. I am counting.
- else:
    A translucent figure on the stone bench turns to face you with an expression of pure delight. #speaker:Patient Ghost #emotion:overjoyed
    Another person! A LIVING person! In the QUEUE!
    I am Gilbert. Number 645. I have been waiting for... a while.
    He gestures at the number display, which reads 3.
    It was on 3 when I arrived. It has not changed. I remain optimistic.
    ~ setFlag("met_queue_ghost")
}

+ [Ask about the queue] -> queue_talk
+ [Ask about the VIP bypass] -> vip_info
+ [Ask how he died] -> death_story
+ [Ask about the ceiling cracks] -> ceiling_cracks
+ [Leave] -> farewell

=== queue_talk ===
Gilbert settles into his bench with the comfort of long practice. #speaker:Patient Ghost #emotion:content
The queue operates on a first-come, first-served basis.
I am number 645. I arrived approximately 200 years ago.
The number display has been on 3 for the entire time. It moved from 2 to 3 during my first decade.
At this rate, I should be served in approximately 128,600 years.
He smiles.
I have made peace with this. Waiting is a skill. I have become the world's foremost expert.
I can wait in fourteen different positions. My personal best is standing still for eleven years.
-> greeting

=== vip_info ===
Gilbert leans in conspiratorially, which is less effective when you are transparent. #speaker:Patient Ghost #emotion:sneaky
There is a way to skip the queue. I have heard rumors.
A VIP authorization stamp. Hidden somewhere in the Filing Room.
The Clerk does not know about it. Or he does and cannot admit it.
Either way, if you stamp your ticket with VIP authorization, the Clerk has to honor it.
It is, technically, valid. And in bureaucracy, technically valid is the BEST kind of valid.
He taps his ghostly nose.
I could have looked for it myself, but I am dead. And also, I have been sitting here for 200 years. The bench has become part of my identity.
-> greeting

=== death_story ===
Gilbert waves a hand dismissively. #speaker:Patient Ghost #emotion:cheerful
Oh, I died of waiting. Literally.
I sat down on this bench, waited for my number, and eventually my body simply gave up.
My ghost remained. Still waiting. The queue is eternal, and so, apparently, am I.
The irony is not lost on me. But I have had two centuries to process it, and I have reached acceptance.
There are worse ways to spend eternity. At least the bench is comfortable.
He pauses.
The bench is not comfortable. But I can no longer feel it, so the point is moot.
-> greeting

=== ceiling_cracks ===
Gilbert lights up. This is clearly his passion. #speaker:Patient Ghost #emotion:enthusiastic
The ceiling! Yes! I have counted every crack.
There are 73,847 cracks in this ceiling. I have numbered them all.
Crack number 4,201 is my favorite. It looks like a horse. Or a badger. Hard to tell.
Crack number 51,006 appeared during year 147 of my wait. I recorded the event in my journal.
He pats a ghostly notebook.
I have seventeen volumes of ceiling observations. They are fascinating to no one but me.
But that is the beauty of waiting. You develop niche interests.
-> greeting

=== farewell ===
Gilbert waves warmly. #speaker:Patient Ghost #emotion:happy
Good luck out there! If you get past the Clerk, give my regards to the Guardian.
I never made it that far. The queue, you understand.
He settles back into the bench.
I will be here. As always. Number 645. Still waiting.
He pulls out a ghostly notebook and begins counting ceiling cracks.
-> END
