EXTERNAL hasItem(itemId)
EXTERNAL hasFlag(flagName)
EXTERNAL setFlag(flagName)
EXTERNAL addItem(itemId)
EXTERNAL removeItem(itemId)
EXTERNAL visitedRoom(roomId)
EXTERNAL getDeathCount()

=== greeting ===
{hasFlag("met_dwarven_spirit"):
    {hasFlag("seal_repaired"):
        The dwarven spirit nods with respect. Good metal. Good work. The forge remembers. #speaker:Forge Spirit #emotion:satisfied
        -> menu_post_repair
    - else:
        The spirit opens one eye. You again. Have you brought materials worthy of the forge? #speaker:Forge Spirit #emotion:neutral
        -> menu
    }
- else:
    The spectral dwarf opens both eyes and regards you with the critical gaze of a master craftsman evaluating raw material. #speaker:Forge Spirit #emotion:skeptical
    Hmm. Living. Soft hands. Not a smith.
    He stands, barely reaching your chest. His ghostly beard brushes the floor.
    I am the keeper of this forge. I built the kingdom's first seal. The ADMINISTRATIVE seal. Not the royal one.
    The royal seal is just wax and ego. The administrative seal is LAW.
    ~ setFlag("met_dwarven_spirit")
    -> menu
}

=== menu ===
+ [What do you need to get the forge working?] -> forge_info
+ [Ask about the seal] -> seal_info
+ [Ask about the kingdom's founding] -> founding_info
+ {hasItem("broken-seal-stamp")} [Show the broken seal] -> show_seal
+ [Leave] -> farewell

=== menu_post_repair ===
+ [Ask about the kingdom's founding] -> founding_info
+ [Thank him] -> thanks
+ [Leave] -> farewell

=== forge_info ===
The spirit runs a ghostly hand along the anvil. #speaker:Forge Spirit #emotion:proud
This forge has stood for a thousand years. I built it with my own hands.
Dwarven engineering. The bellows draw air from three natural vents.
The chimney cuts through sixty feet of solid rock.
The fire pit can reach temperatures that would melt lesser metals and lesser people.
He cracks his ghostly knuckles.
To light it, you need coal -- ancient coal, from the echo chamber -- and a fire source.
Bring both, and the forge lives again. It has been waiting long enough.
-> greeting

=== seal_info ===
The spirit's expression grows somber. #speaker:Forge Spirit #emotion:serious
The ancient seal. The kingdom's first administrative stamp.
I forged it when Erelhain was young. A seal to bind contracts, authorize proceedings, close curses.
Yes, close curses. The founding bureaucrats were paranoid about magical contracts.
They insisted on an administrative seal that could close any bureaucratic proceeding, including magical ones.
It broke. Centuries ago. But the metal remembers its shape.
If someone found the pieces, this forge could make it whole again.
Good metal always remembers.
-> greeting

=== founding_info ===
The spirit strokes his ghostly beard. #speaker:Forge Spirit #emotion:reflective
Erelhain was founded by humans, dwarves, and one very organized elf.
The year was 847. The first act of government was filing the kingdom's charter.
The second act was building the Screaming Caverns -- a test to ensure only worthy rulers could access the kingdom's greatest artifact.
The test was designed to be difficult but fair. Paperwork, patience, and craftsmanship.
He nods.
The purpose of the bureaucracy was SERVICE. Not power. Service.
The founding bureaucrats understood that. Somewhere along the way, everyone else forgot.
-> greeting

=== show_seal ===
The spirit's eyes widen. His ghostly glow intensifies. #speaker:Forge Spirit #emotion:amazed
The seal. You FOUND it. Broken, but... the metal remembers.
He takes the pieces in ghostly hands, examining each fracture line.
Yes. I can repair this. But I need the forge lit.
Coal from the echo chamber. A fire source -- your torch will do.
Light the forge, bring me the pieces, and I will make it whole.
He sets the pieces down reverently.
This is good work. Bring me what I need and we finish what was started a thousand years ago.
-> greeting

=== thanks ===
The spirit closes his eyes and nods once. #speaker:Forge Spirit #emotion:content
A smith does not need thanks. The metal speaks for itself.
He runs a hand along the anvil one final time.
Go. Use the seal wisely. It was forged to close proceedings. To END things.
The curse is a proceeding. It can be closed.
Remember that.
-> greeting

=== farewell ===
The spirit sits cross-legged and closes his eyes. #speaker:Forge Spirit #emotion:neutral
The forge waits. As do I. We are patient.
His spectral glow dims to a meditation state.
Good metal is worth waiting for.
-> END
