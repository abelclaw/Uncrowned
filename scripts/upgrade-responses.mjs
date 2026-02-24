/**
 * Script to replace generic template responses with custom, contextual ones.
 * The earlier add-missing-responses script filled in template responses like
 * "You push the X. It doesn't budge..." but agents wrote room-specific ones.
 * This script upgrades key hotspots where custom text is significantly better.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOMS_DIR = join(import.meta.dirname, '..', 'public', 'assets', 'data', 'rooms');

// ============================================================================
// CUSTOM RESPONSE OVERRIDES BY ROOM
// Format: { roomId: { hotspotId: { verb: "custom response" } } }
// ============================================================================

const OVERRIDES = {
    // ---- VILLAGE SQUARE ----
    village_square: {
        "market-stalls": {
            talk: "You try to strike up conversation with the empty stalls. A half-petrified merchant behind one stall stares blankly. The other stalls say nothing, but their emptiness speaks volumes about the local economy.",
            open: "You rummage through an abandoned stall drawer. Inside: dust, a dead spider, and a receipt from a world that doesn't exist anymore. You close it gently.",
            push: "You shove one of the stalls. It rocks slightly on uneven cobblestones but stays upright. The half-petrified merchant's frozen hand continues its eternal sales gesture, unmoved.",
            pull: "You pull at a stall's awning. The fabric tears, rotten with neglect. The stall looks even sadder now, if that were possible."
        },
        "cobblestones": {
            talk: "You look down and address the cobblestones. They endure your words the way they endure everything else: silently and with geological indifference.",
            open: "You pry at the gaps between cobblestones, looking for a hidden compartment. You find dirt, a fossilized crumb, and nothing of value. The square keeps its secrets in plain sight.",
            push: "You press against the cobblestones. It offers the same resistance as a mountain, which is to say, total and indifferent.",
            pull: "You try to pry up a cobblestone. It refuses to budge, cemented by centuries of foot traffic and civic neglect."
        },
    },

    // ---- MIRROR HALL ----
    mirror_hall: {
        "cracked-mirror": {
            take: "You consider prying it off the wall and immediately think better of it. Carrying a cracked mirror is a one-way ticket to seven years of bad luck and a lifetime of glass splinters.",
            talk: "You speak to the cracked mirror. Your fragmented reflections all mouth along, a chorus of broken yous. None of them answer. They're too busy being metaphors.",
            push: "You give the cracked mirror a shove. It creaks ominously, and a tiny shard tinkles to the floor. Maybe don't do that to the thing that's already barely holding itself together.",
            pull: "You tug at the tarnished frame. More cracks spiderweb across the surface. You're not fixing this by pulling on it. A life lesson delivered by broken glass.",
            open: "It's a mirror, not a secret passage. Though in a place like this, you can't blame yourself for checking."
        },
        "potted-plants": {
            talk: "You lean in and whisper encouragement to a fern. It does not respond, which is the best possible outcome when talking to plants in a room full of magical mirrors.",
            push: "You shove a pot an inch to the left. Nothing happens. You shove it back. The plant endures your rearranging with the silent dignity of all potted things.",
            pull: "You drag a pot toward you, scraping it across the floor. The sound echoes off every mirror in the hall. Congratulations, you've invented the world's worst instrument.",
            open: "It's a plant in a pot. There's nothing to open unless you count the soil, and digging through someone else's potted plants is a social boundary even adventurers shouldn't cross."
        },
        "hall-chandelier": {
            talk: "You address the chandelier. It says nothing, but continues to make you look dramatic. Some relationships are better left unspoken.",
            push: "It's on the ceiling. Your arms are not that long. Your ambitions, however, clearly are.",
            pull: "You'd need to be eight feet tall and supremely foolish. You're only one of those things, and even that's debatable.",
            open: "The chandelier is not a container, a door, or a puzzle box. It is a light fixture. It has achieved its purpose in life. Let it be."
        },
        "purple-carpet": {
            pull: "You grab a corner and yank. The carpet doesn't move. The bolts holding it down were installed by someone who'd met adventurers before and had zero faith in their restraint.",
            push: "You try to bunch up the carpet with your foot. It refuses to wrinkle. This carpet has more structural integrity than most of the castle's political alliances.",
            talk: "You compliment the carpet on its colour. It says nothing, but you sense a quiet pride radiating from its fibres. Or that might be dust.",
            open: "You lift a corner looking for a trapdoor. There's nothing underneath but cold stone and the faint smell of disappointment. Not every carpet hides a secret passage."
        },
    },

    // ---- FORGE CHAMBER ----
    forge_chamber: {
        "ancient-forge": {
            talk: "You address the forge directly. It does not respond. It is a forge. In its defence, it never claimed to be a conversationalist.",
            open: "The forge doesn't open. It's not a box. It's a millennia-old monument to dwarven engineering. You stand before it, not beside a lid.",
            push: "You push against the forge. It doesn't move. You have successfully confirmed that several tons of dwarven stonework outweighs your ambition.",
            pull: "You pull at the forge. Nothing happens, except a faint sense that the dwarven spirit is judging you. Which he is. He absolutely is."
        },
        "forge-anvil": {
            take: "You attempt to lift the anvil. It weighs more than your entire future. Dwarves didn't build things to be portable. They built things to be there when the mountain eroded around them.",
            talk: "You speak to the anvil. It absorbs your words the way it has absorbed ten thousand hammer blows -- silently, and with an air of having heard better.",
            open: "Anvils don't open. They are solid iron. This is, in fact, the entire point of being an anvil.",
            push: "You push the anvil. It doesn't move. It hasn't moved in centuries. It has outlasted dynasties by being exactly where it is.",
            pull: "You try to drag the anvil. The anvil wins. It was always going to win. This was never a contest."
        },
        "bellows": {
            talk: "You whisper encouragement to the bellows. They wheeze in response. This is either a connection or a respiratory condition.",
            open: "Bellows don't open in the traditional sense. They expand and contract, like lungs, or like your confidence when you try things you're not qualified for.",
            push: "You shove the bellows closed. They compress with a defeated sigh and a puff of ancient dust.",
            pull: "You pull the bellows open. They inhale with a geriatric wheeze, filling with air they've no fire to feed. Potential energy, wasted."
        },
        "forge-chains": {
            talk: "You talk to the chains. They clink softly in response. You choose to interpret this as meaningful dialogue rather than a draft.",
            open: "These are chains, not a gate. There's nothing to open. They just hang there, being ominous. It's what chains do.",
            push: "You push a chain. It swings away and then back toward you. Physics is undefeated. The chain doesn't care about your intentions.",
            pull: "You yank a chain. The ceiling groans. Dust falls. You release the chain with the sudden clarity of someone who nearly made a load-bearing mistake."
        },
        "smith-tools": {
            talk: "You address the tools. They do not respond. The dwarven spirit gives you a look that says, 'I've been dead for centuries and even I don't talk to hammers.'",
            open: "Tools don't open. They're not a gift set. Though they are arranged with obsessive precision that suggests someone would notice if you rearranged them.",
            push: "You push the tools along the wall. They clatter and rearrange themselves. The dwarven spirit's eye twitches. You have committed a sin against organisational metallurgy.",
            pull: "You pull a hammer off the wall. It's heavier than expected. You put it back, pretending you were just testing gravity. The spirit pretends not to have noticed."
        },
    },

    // ---- WAITING ROOM ----
    waiting_room: {
        "number-display": {
            take: "You try to pry the display from the wall. It doesn't budge. The number 3 is committed to this spot in a way you have never been committed to anything.",
            talk: "You address the number 3 directly. It does not respond. You are now the kind of person who talks to numbers. The waiting room has claimed another victim.",
            push: "You push the display. The number flickers to 4 for one glorious, heart-stopping instant -- then snaps back to 3.",
            pull: "You pull at the display board. A small plaque underneath reads: 'TAMPERING WITH QUEUE INFRASTRUCTURE IS PUNISHABLE BY ADDITIONAL WAITING.'",
            open: "The display has no door, no hatch, no secret panel. Whatever dark engine powers the queue, it was not designed to be understood."
        },
        "stone-benches": {
            take: "You attempt to lift a stone bench. It weighs approximately the same as your remaining will to live, which is to say: far too much.",
            use: "You sit on the stone bench. It is exactly as comfortable as sitting on a stone bench. A brass plaque reads 'PLEASE REMAIN SEATED.' It wasn't a suggestion.",
            talk: "You whisper to the bench: 'How do you do it? How do you just... sit here?' The bench does not answer. It has mastered patience through the simple expedient of having no nervous system.",
            push: "You shove the bench. It doesn't move. It has been here longer than most civilisations and has no intention of going anywhere.",
            pull: "You pull at the bench. It is fused to the floor by time, magic, or the sheer accumulated weight of boredom. Probably all three.",
            open: "There is nothing to open on a stone bench. You check anyway, because you are in a waiting room with no end."
        },
        "motivational-posters": {
            take: "You peel a poster from the wall. Underneath is another poster. Underneath that, another. It's posters all the way down.",
            talk: "You read the posters aloud, as though they might hear themselves and feel ashamed. 'Hang in there.' The words echo off stone. The posters remain unrepentant.",
            push: "You push the posters flat against the wall. They spring back, curled at the edges, defiant. Four hundred years of ageing has given them structural opinions.",
            pull: "You pull a corner of one poster. It tears, revealing an inscription on the wall: 'Gerald was here. Day 12,045.' Below it: 'Gerald left. Day 12,046. Nobody noticed.'",
            open: "These are posters, not doors. Though at this point, you'd try opening a poster if it meant getting out of this queue."
        },
    },

    // ---- CLOCK TOWER ----
    clock_tower: {
        "clock-mechanism": {
            take: "You consider disassembling the kingdom's only hope of slowing the curse and putting it in your pocket. The mechanism weighs roughly as much as your life's regret, which is considerable.",
            talk: "You whisper encouragement to the frozen mechanism. 'You can do it. Believe in yourself.' The gears do not respond. Motivational speaking has its limits.",
            open: "The mechanism is already exposed -- its housing long since corroded away. There's nothing to open except the philosophical question of why you tried.",
            push: "You shove the mechanism. Several tons of precision clockwork shift imperceptibly and then settle back. Congratulations: great effort, zero results.",
            pull: "You pull at the mechanism. It does not budge. It has survived a curse, centuries of neglect, and now you. It is unimpressed by all three."
        },
        "clock-face": {
            take: "You attempt to pry the clock face off. It's bolted to the tower with the conviction of medieval masonry. The bolts have been here longer than your bloodline.",
            talk: "You ask the clock face what time it is. It says 3:47. It has been saying 3:47 for centuries. Consistency is a virtue, you suppose.",
            open: "The clock face isn't a door, despite your optimistic approach to architecture. It's a solid disc of iron and glass, and it opens for no one.",
            push: "You push against the clock face. The hands don't move. Time itself seems mildly offended by the attempt.",
            pull: "You pull at the clock face. The frozen hands resist with the stubbornness of a kingdom that refuses to acknowledge what century it's in."
        },
        "green-pool": {
            talk: "You address the bubbling pool. 'Hello? Anyone down there?' A bubble rises and pops. You interpret this as 'go away.' Wise.",
            open: "It's a pool. An open body of liquid. It cannot be more open unless you'd like to widen the floor, which seems structurally inadvisable.",
            push: "You push at the green liquid. Your hand goes in. It's warm and slightly viscous. You pull back immediately. It's fine. Probably fine.",
            pull: "You cannot pull a liquid. This is a fundamental property of matter that predates the curse, the kingdom, and your questionable decision-making."
        },
    },

    // ---- OLD WATCHTOWER ----
    old_watchtower: {
        "telescope": {
            open: "You try to pry open the lens housing. It's rusted shut, fused by decades of neglect into a single corroded unit.",
            push: "You push the telescope. It swivels grudgingly on its mount, squealing like a cat in a bath. It now points at a slightly different section of blur.",
            pull: "You pull the telescope toward you. The eyepiece lurches uncomfortably close to your face, offering an intimate view of absolutely nothing."
        },
        "railing": {
            talk: "You address the railing sternly, reminding it of its structural responsibilities. It creaks noncommittally.",
            pull: "You pull the railing toward you. It bends inward with a groan of rusty protest, then slowly bends back, swaying like a drunk trying to look sober.",
            open: "The railing is not a door. It's barely a railing. Asking it to be something else entirely seems unfair to everyone involved."
        },
        "tower-view": {
            take: "You want to take the view. It exists in the space between your eyes and the horizon. You can't fold it up and pocket it, though several artists have tried.",
            talk: "You shout into the distance. The wind carries your words away to places that don't care. An echo returns, but it sounds vaguely mocking.",
            push: "You lean forward to push the... view? The view remains unmoved. Figuratively and literally.",
            pull: "You reach out as if to pull the horizon closer. It stays exactly where it is, smugly distant.",
            open: "You can't open a view. It's already open. That's the entire point of views."
        },
    },

    // ---- CRYSTAL CHAMBER ----
    crystal_chamber: {
        "force-barrier": {
            talk: "You address the force barrier. It hums at the same frequency it was already humming at. This is either profound indifference or the magical equivalent of being put on hold.",
            open: "You look for a handle, a latch, a polite request form. Force barriers don't come with doors. They come with consequences."
        },
        "crystal-pedestal": {
            take: "It's a stone pedestal. It weighs more than your ambitions and is roughly as movable.",
            use: "You run your hands along the pedestal's surface. The carved symbols are cool and completely unresponsive. It's a pedestal. Its job is to hold things up.",
            talk: "You speak to the pedestal. It supports you emotionally about as well as it supports the crystal -- silently, and with geological patience.",
            open: "You search the pedestal for secret compartments, drawers, or hidden panels. Nothing. Sometimes a pedestal is just a pedestal.",
            push: "You shove the pedestal. It doesn't move. It has been here for centuries and has no plans to relocate.",
            pull: "You brace yourself and pull. The pedestal remains exactly where it is. It was carved in place and intends to die in place."
        },
        "chamber-pillars": {
            talk: "You whisper to a pillar. It says nothing. But the patterns on its surface shift slightly, which is either a response or a coincidence.",
            open: "These are solid stone pillars, not doors. Though given dwarven craftsmanship, you wouldn't be surprised if there were secrets inside.",
            push: "You push against a pillar. It holds firm. The ceiling remains where it is. Everyone benefits from your failure here.",
            pull: "You wrap your arms around the pillar and pull. Nothing happens, except you now look like someone hugging a very large, very uninterested stone column."
        },
    },

    // ---- ECHO CHAMBER ----
    echo_chamber: {
        "stalactites": {
            talk: "You address the stalactites. Your voice multiplies in the dome, bouncing back as a chorus. For a moment, the cave itself seems to be speaking. Then it stops. It was just you, all along.",
            open: "Stalactites don't open. They grow. One drip at a time, over millennia. They are the most patient things in the world, and they're not waiting for you.",
            push: "You push a stalactite. It's solid stone attached to the ceiling by geological forces. Your push registers somewhere between 'insignificant' and 'adorable.'",
            pull: "You pull on a low-hanging stalactite. It holds firm. It's been growing here for longer than your entire civilisation has existed. Your tug is noted and dismissed."
        },
        "wall-carvings": {
            take: "You chip at a carving with your fingernail. A tiny flake comes loose. At this rate, you could remove the entire carving in approximately four thousand years.",
            talk: "You read the carvings aloud. Your voice distorts in the echo, making the ancient words sound like something entirely different. The original carvers would be appalled.",
            open: "The carvings are not a door. They're art. Very old art. The kind that doesn't come with handles.",
            push: "You press your hand against the carvings. The stone is cool and the patterns are deep. Someone spent a lifetime making these. You've spent ten seconds touching them.",
            pull: "You try to pull a carving from the wall. It's part of the wall. The wall is part of the mountain. You are attempting to disassemble geography."
        },
    },

    // ---- DUNGEON ----
    dungeon: {
        "dungeon-door": {
            talk: "You knock on the dungeon door and call through it. No response comes from the other side. Either no one's there, or they've learned that responding to knocks in a dungeon rarely improves one's situation.",
            push: "You slam your shoulder against the dungeon door. It rattles in its frame but holds fast. The door was built by people who understood that the whole point of a dungeon door is to not open when pushed.",
            pull: "You pull at the dungeon door. Locked. Bolted. And quite possibly magically sealed. This door takes its job very seriously."
        },
    },

    // ---- PETRIFIED FOREST ----
    petrified_forest: {
        "petrified-trees": {
            use: "You're not sure what you expected. Rub two stone trees together and start a geological fire?",
            open: "You search the stone bark for a seam, a hinge, a secret compartment. Trees don't have doors. Petrified trees especially don't have doors.",
            push: "You put your shoulder into a petrified trunk. It doesn't budge. It weighs roughly the same as your accumulated regrets, which is to say: immovable.",
            pull: "You wrap your arms around a stone trunk and heave. Nothing moves except your lower back, which objects strenuously."
        },
        "stone-flowers": {
            use: "You attempt to use the stone flowers. For what? A bouquet? A romantic gesture? Stone flowers say 'I care about you' and 'I have concerning hobbies' simultaneously.",
            talk: "You whisper encouragement to the petrified wildflowers. They do not perk up. Encouragement cannot reverse mineral transmutation. You knew this.",
            open: "You try to pry open a stone bud, hoping for a secret inside. It crumbles. Inside: more stone. The curse doesn't do subtlety.",
            push: "You nudge a stone flower with your boot. It snaps off at the stem and rolls away. You've just committed botanical vandalism on a geological timescale.",
            pull: "You tug at a stone flower. The stem snaps with a dry crack. It lies in your hand like a grey cigarette. You set it down carefully. Respect for the dead is all you've got."
        },
        "curse-boundary": {
            take: "You crouch and try to scoop up the spreading grey. It's not a substance. It's an absence -- colour being drained, life being silenced. You can't take nothing. That's the whole problem.",
            talk: "You address the advancing curse directly. 'Stop,' you say, with all the authority of someone who has none. The grey does not stop. It has never stopped.",
            open: "The curse is not a door, a box, or a metaphor you can crack open. It's a force. It's spreading. And it doesn't have a handle.",
            push: "You press your hands toward the grey line as if you could hold it back. The stone prickles against your palms. You pull away quickly. It's warmer than it should be.",
            pull: "You cannot pull a curse backward. That's not how curses work. That's not how anything works."
        },
    },
};


// ============================================================================
// MAIN SCRIPT
// ============================================================================

function processRoom(filePath, roomId) {
    const raw = readFileSync(filePath, 'utf8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error(`  SKIP (invalid JSON): ${filePath}`);
        return { modified: false };
    }

    const roomOverrides = OVERRIDES[roomId];
    if (!roomOverrides) return { modified: false };

    let changes = 0;

    // Process hotspots
    const allEntities = [
        ...(data.hotspots || []),
        ...(data.items || []),
        ...(data.npcs || []),
    ];

    for (const entity of allEntities) {
        const entityOverrides = roomOverrides[entity.id];
        if (!entityOverrides) continue;
        if (!entity.responses) entity.responses = {};

        for (const [verb, text] of Object.entries(entityOverrides)) {
            entity.responses[verb] = text;
            changes++;
        }
    }

    if (changes > 0) {
        writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n');
        console.log(`  ${changes} responses upgraded`);
    } else {
        console.log(`  no changes needed`);
    }

    return { modified: changes > 0, changes };
}

// Process all room files
const roomFiles = readdirSync(ROOMS_DIR).filter(f => f.endsWith('.json'));
let totalChanges = 0;
let modifiedFiles = 0;

for (const file of roomFiles) {
    const roomId = file.replace('.json', '');
    if (OVERRIDES[roomId]) {
        console.log(`Processing ${file}...`);
        const result = processRoom(join(ROOMS_DIR, file), roomId);
        if (result.modified) {
            totalChanges += result.changes;
            modifiedFiles++;
        }
    }
}

console.log(`\nDone! Upgraded ${totalChanges} responses across ${modifiedFiles} files.`);
