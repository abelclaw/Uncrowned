EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_the_clerk"):
    {hasFlag("clerk-satisfied"):
        The Clerk adjusts his spectacles. Your paperwork has been processed. The wings are open. Proceed. #speaker:The Clerk #emotion:neutral
        -> menu_post_approval
    - else:
        The Clerk does not look up. Number? Form? Identification? Proceed in orderly fashion. #speaker:The Clerk #emotion:neutral
        -> menu
    }
- else:
    The Clerk looks up from his desk with the expression of a person who has looked up from this desk approximately forty million times and has never once been pleased about what he saw. #speaker:The Clerk #emotion:neutral
    State your business. Fill out the appropriate form. Wait your turn.
    These are not suggestions. They are the natural order.
    ~ setFlag("met_the_clerk")
    -> menu
}

=== menu ===
+ [Ask about the test] -> test_info
+ [Ask about the forms] -> form_info
+ [Ask about him] -> personal_info
+ {hasFlag("registered_with_clerk")} [Ask about the queue] -> queue_info
+ [Leave] -> farewell

=== menu_post_approval ===
+ [Ask about the test] -> test_info
+ [Ask about him] -> personal_info
+ [Leave] -> farewell

=== test_info ===
The Clerk speaks without inflection. #speaker:The Clerk #emotion:neutral
The Bureaucratic Test of Sovereign Worthiness. Established in Year One.
The test consists of: registration, queue processing, and passage through both wings.
The West Wing contains a light-based verification puzzle.
The East Wing contains a water-navigation and forge challenge.
Beyond both lies the Guardian Chamber. The Guardian asks questions.
Answer correctly and the Crystal of Mundanity becomes available for authorized retrieval.
He pauses.
The pass rate is zero percent. This is not a concern. The test is functioning as designed.
-> greeting

=== form_info ===
The Clerk produces a catalogue of forms the size of a small dictionary. #speaker:The Clerk #emotion:neutral
You require Form 27-B Stroke 6: Application for Sovereign Worthiness Test.
Available in the Filing Room. East of the entrance hall.
The form must be completed in proper ink. Ancient bureaucratic ink is acceptable.
Ink is available in the Cavern Library. North of the entrance hall.
Submit the completed form to this desk. A queue ticket will be issued.
Do not attempt to submit an incomplete form. The consequences are... administrative.
-> greeting

=== personal_info ===
The Clerk pauses. The pause lasts longer than any previous pause. #speaker:The Clerk #emotion:confused
Personal? I am the Clerk. I administer the test. I process forms.
I have been here for... a considerable period of time.
He adjusts his spectacles.
I do not recall when I started. The records indicate I have always been here.
This is acceptable. The position is permanent. The benefits are adequate.
There is a pension plan, though I have never needed to access it.
He stares at his desk.
I sometimes dream of a tower. And a parking spot. But dreams are not in my jurisdiction.
-> greeting

=== queue_info ===
The Clerk consults a ledger. #speaker:The Clerk #emotion:neutral
The queue is currently serving number 3. Your ticket is number 847.
Estimated wait time: approximately three hundred and forty-seven years.
However. VIP authorization bypasses the standard queue.
VIP authorization stamps are, officially, non-existent.
He returns to his paperwork.
Unofficially, the Filing Room has not been audited in four centuries.
This is all I can say on the matter. Officially.
-> greeting

=== farewell ===
The Clerk does not look up. #speaker:The Clerk #emotion:neutral
Your interaction has been logged. Reference number: {getDeathCount()}47-B.
Retain your receipt for your records.
He stamps a piece of paper reflexively. Stamping is his default state.
-> END
