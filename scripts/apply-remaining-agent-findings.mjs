/**
 * Applies remaining agent findings for 6 rooms:
 * throne_room, castle_courtyard, castle_garden, wizard_tower, dungeon, royal_kitchen
 *
 * For each room:
 * 1. Adds new hotspots for objects mentioned in descriptions
 * 2. Upgrades generic template responses with contextual ones
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const roomsDir = join(import.meta.dirname, '..', 'public', 'assets', 'data', 'rooms');

function loadRoom(id) {
    return JSON.parse(readFileSync(join(roomsDir, id + '.json'), 'utf8'));
}

function saveRoom(id, data) {
    writeFileSync(join(roomsDir, id + '.json'), JSON.stringify(data, null, 4) + '\n');
}

// Find entity in hotspots, items, or npcs
function findEntity(data, entityId) {
    for (const arr of [data.hotspots, data.items, data.npcs]) {
        if (!arr) continue;
        const e = arr.find(x => x.id === entityId);
        if (e) return e;
    }
    return null;
}

// Apply response overrides (only if current response matches generic template pattern)
const GENERIC_PATTERNS = [
    /doesn't open/i, /doesn't budge/i, /You try from several angles/i,
    /wins this round/i, /structural advantage/i, /conspire against you/i,
    /says nothing back/i, /most productive conversation/i,
    /resistance as a mountain/i, /It's not that kind of thing/i,
    /not about to stop now/i, /You've accomplished nothing/i,
    /It offers the same resistance/i, /Gravity and architecture/i,
    /It wasn't designed to open/i, /at some point, you'll accept/i,
    /deep, contemplative agreement/i, /mild strain in your lower back/i
];

function isGeneric(text) {
    return GENERIC_PATTERNS.some(p => p.test(text));
}

function applyOverrides(data, overrides) {
    let count = 0;
    for (const [entityId, responses] of Object.entries(overrides)) {
        const entity = findEntity(data, entityId);
        if (!entity) { console.log(`  WARN: entity ${entityId} not found`); continue; }
        if (!entity.responses) entity.responses = {};
        for (const [verb, text] of Object.entries(responses)) {
            if (!entity.responses[verb] || isGeneric(entity.responses[verb])) {
                entity.responses[verb] = text;
                count++;
            }
        }
    }
    return count;
}

function addHotspots(data, hotspots) {
    if (!data.hotspots) data.hotspots = [];
    let count = 0;
    for (const h of hotspots) {
        if (data.hotspots.some(x => x.id === h.id)) {
            console.log(`  SKIP: hotspot ${h.id} already exists`);
            continue;
        }
        data.hotspots.push(h);
        count++;
    }
    return count;
}

// ==================== THRONE ROOM ====================
{
    const data = loadRoom('throne_room');
    console.log('throne_room:');
    const oc = applyOverrides(data, {
        'throne': {
            open: "You search behind the cushion, under the armrests. The throne yields no hidden compartments, no secret levers. It's just a chair. A very large, very pretentious chair that has outlasted the person who sat in it.",
            push: "You shove the throne. It rocks slightly, ancient wood groaning. Something skitters behind it -- a mouse, probably. Even the rodents in this castle have claimed seats above their station.",
            pull: "You pull the throne forward. Behind it: dust, cobwebs, and a single dried flower pressed flat by centuries. Someone left it there deliberately. You push the throne back. Some things are meant to stay hidden."
        },
        'faded-banners': {
            use: "You wave a banner like a flag of surrender. The moth-eaten fabric tears slightly. The kingdom has already surrendered plenty without your help.",
            talk: "You address the banners. They sway in a draft, which is not a response so much as a consequence of medieval ventilation. The banners have heard every speech ever given in this room and are tired of all of them.",
            open: "You spread a banner wide. The royal crest is barely visible -- a crown above crossed swords, all of it faded to ghosts. Once this symbol meant something. Now it means 'we used to mean something.'",
            push: "You push a banner aside. Behind it: more wall, equally depressing. The banners aren't hiding anything except the castle's structural decline.",
            pull: "You pull a banner. The rod it hangs from groans. The fabric tears at the top -- one more tug and the whole thing comes down. You decide to let it hang. It has enough problems."
        },
        'royal-dais': {
            take: "You try to take the dais. It's a raised stone platform built into the floor. You'd need a quarrying team and a fundamental misunderstanding of the word 'portable.'",
            talk: "You address the dais. 'You've seen better days,' you tell it. It has. Every day for the last three centuries has been worse than the one before. The dais could say the same about you.",
            open: "You search the dais for hidden compartments. Your fingers find a crack in the stone, but it's just age damage, not a secret. Not everything hides something. Some things are just broken.",
            push: "You push against the dais. Stone doesn't push. Stone endures. The dais has endured coronations, funerals, and now you. It rates you somewhere between 'mild inconvenience' and 'forgettable.'",
            pull: "You pull at a loose stone on the dais edge. It wiggles but holds. Beneath it: more stone. The dais is solid all the way through, like the disappointment in this room."
        },
        'curtains': {
            talk: "You whisper behind the curtains. Your voice is muffled by velvet and regret. If anyone is hiding behind them, they're too polite -- or too dead -- to answer.",
            open: "You draw the curtains apart. Behind them: a stone wall and a family of moths who are deeply upset about the sudden exposure. No window. The curtains are decorating nothing.",
            push: "You push through the curtains. Dust cascades from the velvet in a grey waterfall. On the other side: wall. The curtains were hiding the castle's bare walls, which is the most useful thing they've done in decades.",
            pull: "You pull a curtain aside. The fabric is so old it practically crumbles at your touch. A moth flutters past your face, offended. The curtain rod sags. Everything in this room is one touch away from collapse."
        },
        'skylight': {
            talk: "You shout up at the skylight. The glass rattles. A bird on the other side startles and flies away. You've now scared a bird. Add that to your list of accomplishments.",
            open: "The skylight is far above your head and sealed shut. Even if you could reach it, the mechanism is rusted solid. The throne room's one source of natural light is not accepting visitors.",
            push: "You can't reach the skylight. It's twenty feet above you, filtering light through decades of grime. You'd need a ladder, scaffolding, or considerably longer arms.",
            pull: "The skylight is built into the ceiling. You'd need to fly to reach it, and your attempts at levitation have been consistently unsuccessful."
        },
        'ghost-king': {
            talk: "You address the ghost. He flickers, regarding you with hollow eyes that hold centuries of regret. 'The crown weighs nothing now,' he murmurs. 'It weighs everything.'",
            open: "You cannot open a ghost. Ghosts are not containers, doors, or envelopes. They are the lingering emotional residue of the deceased. Opening them is not a valid action.",
            push: "Your hand passes through the ghost. Cold shoots up your arm like ice water in your veins. The ghost flickers with mild annoyance. 'That,' he says quietly, 'was rude.'",
            pull: "You swipe at the ghost. Your hand passes through freezing air that smells faintly of old stone and royal disappointment. The ghost regards you with the weariness of someone who has been grabbed at by the living for centuries."
        },
        'royal-seal': {
            talk: "You speak to the royal seal. It gleams dully, stamped with the authority of a dead king. The seal has pressed its mark on more important documents than you will ever produce.",
            open: "The seal is a solid object. It stamps, it presses, it authenticates. It does not open. Not everything needs to open. Some things are complete as they are.",
            push: "You press the seal against the table. It leaves a faint impression in the dust -- the royal crest, still sharp after all these years. The king is dead; the paperwork endures.",
            pull: "You pull the seal toward you. It's heavier than expected -- solid metal, weighted with authority. The ghost-king watches you handle it with an expression caught between pride and sorrow."
        }
    });
    const hc = addHotspots(data, [
        {
            id: "velvet-cushion", name: "Moth-Eaten Cushion",
            zone: {x: 430, y: 360, width: 40, height: 20},
            interactionPoint: {x: 450, y: 420},
            responses: {
                look: "The throne's cushion has seen better centuries. Moth-eaten velvet in what was once royal purple, now a shade best described as 'bruised twilight.' The stuffing pokes through in places like cotton trying to escape.",
                take: "You pull at the cushion. It comes away in a puff of dust and moths. The throne looks worse without it, which is impressive. You put it back. Even ruined dignity is better than none.",
                use: "You sit on the cushion. A small cloud of moths erupts around you. The cushion wheezes. Something inside it crunches. You stand up quickly, having learned that not all thrones welcome all bottoms.",
                talk: "You address the cushion. A moth flies out of it, which you choose to interpret as a response. The cushion has hosted kings. It now hosts larvae. The career trajectory is regrettable.",
                open: "You tear the cushion open. Stuffing spills out -- wool, horsehair, and what appears to be a very old love letter. You tuck the stuffing back in. The letter is none of your business.",
                push: "You press the cushion. Dust puffs out. It's like deflating something that's already been deflated by history. The cushion sags back into shape, or what passes for shape after three centuries of neglect.",
                pull: "You tug the cushion free from the throne seat. Beneath it: a worn impression in the wood, shaped by countless royal posteriors. The throne remembers every king. The cushion just remembers moths.",
                default: "The cushion exists in a state between furniture and archaeology. It's unclear whether it supports the throne or the throne supports it."
            }
        },
        {
            id: "fallen-banner", name: "Fallen Banner",
            zone: {x: 100, y: 400, width: 60, height: 40},
            interactionPoint: {x: 130, y: 430},
            responses: {
                look: "One banner has given up entirely, crumpled on the floor like a flag of surrender that nobody bothered to pick up. The royal crest is visible if you squint -- a crown above crossed swords, now covered in dust and defeat.",
                take: "You pick up the fallen banner. It's heavier than expected, waterlogged with centuries of damp. The fabric tears slightly as you lift it. Even the flag doesn't want to be carried anymore.",
                use: "You could drape the banner over yourself like a royal cape. But wearing a fallen kingdom's flag while its ghost watches feels like the wrong kind of dress-up.",
                talk: "You address the fallen banner. 'Get up,' you tell it. It does not get up. Banners, like kingdoms, don't recover from falling just because someone tells them to.",
                open: "You unfurl the banner across the floor. The full crest is visible now -- larger than you expected, more detailed than the faded ones still hanging. This was the king's personal standard. It fell with him.",
                push: "You nudge the banner with your foot. It slides across the stone floor, trailing dust. Somewhere, a royal protocol officer turns in their grave.",
                pull: "You drag the banner toward you. It catches on a crack in the floor, tears slightly. You've now damaged a historical artifact. The ghost-king's expression does not change, which is somehow worse than anger.",
                default: "A fallen banner for a fallen kingdom. At least they match."
            }
        },
        {
            id: "throne-room-floor", name: "Stone Floor",
            zone: {x: 200, y: 450, width: 400, height: 50},
            interactionPoint: {x: 400, y: 460},
            responses: {
                look: "Cold stone tiles stretch across the throne room, dulled by centuries of footsteps that will never come again. Dust lies thick where courtiers once stood. The occasional crack runs through the stone like a timeline of the kingdom's decline.",
                take: "You cannot take the floor. It is, definitionally, below you. This is the most literal dead-end in the castle.",
                use: "You're standing on it. That's about all the use a floor offers. It's fulfilling its purpose. You should aspire to the same.",
                talk: "You address the floor. The echo returns your voice slightly distorted, as if the room itself is mocking you. Given the acoustics of empty throne rooms, it probably is.",
                open: "You search for loose tiles. A few wiggle, but beneath them is only more stone and the foundations of a castle that was built to last longer than the dynasty it housed.",
                push: "You press a floor tile with your foot. It rocks slightly. Beneath it: mortar, substrate, and the bedrock of a kingdom's ambitions. Nothing useful. Nothing ever useful.",
                pull: "You pry at a loose tile. It comes up, revealing grey foundation stone and a single coin that rolled under here sometime during the last century. Finders keepers.",
                default: "The floor endures. That's what floors do. Everything above them falls eventually."
            }
        }
    ]);
    saveRoom('throne_room', data);
    console.log(`  ${oc} responses upgraded, ${hc} hotspots added`);
}

// ==================== CASTLE COURTYARD ====================
{
    const data = loadRoom('castle_courtyard');
    console.log('castle_courtyard:');
    const oc = applyOverrides(data, {
        'castle-guards': {
            take: "You reach toward the nearest guard's arm. He doesn't flinch, but his hand drifts to his sword hilt with the casual confidence of someone who has rehearsed this exact scenario. You withdraw your hand. Wise.",
            open: "The guards are not doors. They are, in fact, the opposite of doors -- things specifically designed to prevent passage.",
            pull: "You tug at the nearest guard's sleeve like a lost child at a market. He looks down at your hand with the expression of someone discovering something unpleasant on their boot. You let go."
        },
        'courtyard-well': {
            talk: "You lean over the well and say hello. Your voice echoes back, distorted and hollow. Talking to wells is not a sign of stable mental health, but given what you've been through, it barely registers.",
            open: "The well is already open. It's a hole in the ground with a stone rim around it. That's the default state of wells. They don't come with lids. Budget cuts.",
            push: "You push against the well's stone rim. It was here before you were born and will be here long after you're forgotten. The well wins this contest of stubbornness by several centuries.",
            pull: "You grab the well rope and pull. The bucket rises, dripping. It's the one mechanism in this castle that responds to effort with results instead of bureaucratic resistance."
        },
        'cracked-flagstones': {
            take: "You try to pry up a flagstone. It's heavier than your sense of purpose and approximately as cracked. You manage to wiggle one loose enough to confirm there's dirt underneath.",
            talk: "You address the flagstones directly. They do not respond, which puts them in the majority of things you've tried to have conversations with today.",
            open: "You wedge your fingers under a cracked flagstone and lift. Beneath it: dirt, a beetle, and the crushing realization that not everything conceals a secret passage.",
            push: "You push a loose flagstone with your foot. It seesaws satisfyingly. The beetle underneath relocates with an air of quiet indignation.",
            pull: "You pull at a cracked flagstone. It comes loose with a grinding noise that makes the guards glance over. Underneath: soil. You set it back, trying to look casual."
        },
        'stone-arches': {
            talk: "You whisper to the stone arches. They've heard centuries of whispered conspiracies, declarations of war, and at least one very ill-advised marriage proposal. Yours doesn't even register.",
            open: "The arches are open by design. That's the whole point of an arch -- it's an opening with pretensions of grandeur. Architecture 101.",
            push: "You push against a stone arch. Several tons of ancient masonry regard your effort with geological indifference. The arch has survived wars, sieges, and centuries of weather.",
            pull: "You pull at a stone block in the archway. Mortar dust trickles down. The arch does not collapse, because unlike this monarchy, it was built by people who knew what they were doing."
        },
        'courtyard-walls': {
            talk: "You talk to the wall. The wall does not talk back. This is actually the healthiest relationship you've had all day.",
            open: "These are walls. Their entire purpose is to be closed. Asking a wall to open is like asking a guard to be friendly -- technically possible, but against union rules.",
            push: "You lean against the courtyard wall and push. The wall has been standing for three hundred years. You have been pushing for three seconds. The math is not in your favor.",
            pull: "You try to pull a stone from the wall. The mortar crumbles a bit, but the stone holds firm. Somewhere, a long-dead mason feels a brief moment of posthumous satisfaction."
        }
    });
    const hc = addHotspots(data, [
        {
            id: "courtyard-weeds", name: "Courtyard Weeds",
            zone: {x: 300, y: 450, width: 100, height: 40},
            interactionPoint: {x: 350, y: 450},
            responses: {
                look: "Weeds push through every crack in the flagstones with the relentless optimism of things that don't know they're unwanted. Dandelions, crabgrass, and something that might be creeping thyme if you're feeling generous.",
                take: "You yank out a fistful of weeds. They come up easily, roots trailing dirt. You hold them for a moment, realize you have no use for a bouquet of crabgrass, and let them fall.",
                use: "You step on the weeds. They spring back immediately. These weeds have survived decades of neglect and a petrification curse. Your foot is not a meaningful threat.",
                talk: "You address the weeds. 'You're doing well for yourselves,' you say. They are. They're the only things in this kingdom with a growth strategy that's actually working.",
                open: "Weeds don't open. They just grow, spread, and conquer -- the only successful territorial expansion this kingdom has seen in decades.",
                push: "You push the weeds aside with your foot. They bend, spring back, and continue existing with aggressive indifference.",
                pull: "You pull up a weed. Another one is already growing in its place. It's like the monarchy's problems -- remove one and two more appear.",
                default: "You contemplate the weeds. They've inherited the courtyard. No one told them. No one had to."
            }
        },
        {
            id: "castle-entrance", name: "Castle Entrance",
            zone: {x: 450, y: 310, width: 60, height: 50},
            interactionPoint: {x: 480, y: 420},
            responses: {
                look: "The main entrance to Castle Erelhain looms behind the guards -- heavy oak doors reinforced with iron bands. They're closed, and the guards have made it abundantly clear they'll stay that way until you produce proof of purpose.",
                take: "You cannot take a castle entrance. Even if you could, where would you put it? It's a pair of doors the size of a small house.",
                use: "The guards step together, blocking your path. 'Proof of purpose,' the left one says. 'Then you can use the entrance.' Until then, it's purely decorative.",
                talk: "You address the castle doors. They are silent, as doors tend to be. The guards exchange a look that suggests they've seen visitors lose their minds before.",
                open: "You reach for the door handles. Both guards shift to block you in perfect synchronization. 'Proof of purpose first,' says one. The doors remain firmly shut.",
                push: "You press against the entrance doors. They don't budge -- partly because they're locked, and partly because two armed guards are standing in front of them.",
                pull: "You pull at the entrance door handles. Nothing happens. The doors are either locked, barred from inside, or simply too heavy.",
                default: "The castle entrance is right there. So close. Guarded by two men whose entire career is preventing exactly what you're trying to do."
            }
        }
    ]);
    saveRoom('castle_courtyard', data);
    console.log(`  ${oc} responses upgraded, ${hc} hotspots added`);
}

// ==================== CASTLE GARDEN ====================
{
    const data = loadRoom('castle_garden');
    console.log('castle_garden:');
    const oc = applyOverrides(data, {
        'overgrown-hedges': {
            talk: "You address the hedges. They rustle. It's the wind, obviously. But for a moment you felt heard, which says more about your social life than the hedges.",
            open: "You try to part the hedges like curtains. They part like hedges -- reluctantly, painfully, and with thorns.",
            push: "You shove the hedge wall. It absorbs your effort like a green, prickly therapist. The hedge doesn't move. You, however, now have scratches.",
            pull: "You grab a fistful of hedge and pull. The hedge pulls back. It has roots, you have stubbornness, and roots win every time."
        },
        'petrified-trees': {
            talk: "You whisper to the petrified trees. They don't respond. They haven't responded to anything since the curse turned them to stone, which is a reasonable excuse.",
            open: "They're trees, not doors. Solid stone trees, at that. The concept of 'opening' a tree is botanical nonsense even when the tree isn't made of rock.",
            push: "You push against a petrified trunk. It has the structural integrity of a small monument, because that's essentially what it is now.",
            pull: "You try to pull a stone branch. It doesn't bend, flex, or acknowledge your existence. Petrified wood: zero out of ten for cooperative interaction."
        },
        'gardeners-shed': {
            take: "You consider taking the shed. The entire shed. You'd need a cart, a team of oxen, and significantly lower standards for what constitutes a worthwhile possession.",
            talk: "You address the empty shed. 'Hello?' The cobwebs sway. A spider regards you from the doorframe with the quiet judgment of something that actually lives here.",
            push: "You lean against the shed wall. It creaks with the weariness of a structure that would rather not be leaned upon. One more push and this becomes firewood.",
            pull: "You tug at the shed door. It comes off in your hand. Well, not entirely -- the top hinge holds, leaving the door at an even more dramatic angle."
        },
        'nightshade-bush': {
            talk: "You lean toward the nightshade bush and whisper sweet nothings. The berries glisten back at you, pretty and lethal. It's the most honest relationship you've had in weeks.",
            open: "You try to part the bush's branches. Thorns prick your fingers, and you find yourself uncomfortably close to berries that could end your biography.",
            push: "You push the nightshade bush aside. Some berries drop to the ground, glistening wetly. One rolls toward your boot like a tiny, beautiful assassination attempt.",
            pull: "You yank at the bush. It springs back, and a berry bounces off your cheek. You spend the next thirty seconds frantically wiping your face."
        },
        'garden-statue': {
            talk: "'Hello,' you say to the statue. The statue says nothing. It's been saying nothing for centuries and has gotten remarkably good at it.",
            open: "It's a solid block of eroded stone. There's nothing to open. Unless you're hoping for a secret compartment, in which case: no. Life is not that generous.",
            push: "You push the statue. It rocks slightly on its pedestal, then settles back. For one heart-stopping moment you envision it toppling and crushing you.",
            pull: "You pull at the statue. It doesn't budge. It weighs approximately 'too much' and has been standing here longer than anyone can remember."
        },
        'stone-pavilion': {
            talk: "You speak into the pavilion. Your voice echoes off the remaining stones, bouncing back slightly distorted. For a moment, it almost sounds like a reply. It isn't.",
            open: "It's an open-air pavilion. The 'open' part is right there in the name. It couldn't be more open if it tried.",
            push: "You push against one of the crumbling pillars. Dust rains down. A chunk of mortar drops at your feet. The pavilion would very much like to remain standing.",
            pull: "You pull at a loose stone. It comes free with a grinding sound, and a section of remaining roof sags perceptibly. You've accelerated centuries of architectural decay."
        },
        'dried-sage': {
            talk: "You hold the sage to your ear. It doesn't speak. Herbs communicate through scent, not words, and this one's message is 'I've been dead for a while and I'm fine with it.'",
            open: "It's a bundle of dried herbs, not a package. There's nothing to open. What you see is what you get: dead leaves, tied with string, smelling of grandmothers and exorcisms.",
            push: "You press the sage bundle. It crumbles slightly, releasing a puff of fragrant dust. Your sinuses object. The sage is indifferent to your sinuses.",
            pull: "You pull a sprig from the bundle. It comes away in a shower of tiny dried leaves, like confetti at a funeral for flavor."
        },
        'rat-trap': {
            talk: "You address the rat trap. It has no opinions. It has a spring, a platform, and a single-minded purpose. More focused than most people you've met.",
            open: "You carefully open the trap mechanism. It clicks into the set position, spring coiled, platform ready. One wrong move and it'll snap shut on your fingers.",
            push: "You press the trigger plate. The trap snaps shut with a vicious CLACK that echoes through the shed. Your fingers are intact, but your heartbeat takes several seconds to agree.",
            pull: "You pull the spring back to reset the trap. The mechanism resists, then clicks into place with the quiet menace of something designed to ruin a rodent's evening."
        }
    });
    const hc = addHotspots(data, [
        {
            id: "stone-paths", name: "Stone Paths",
            zone: {x: 200, y: 440, width: 180, height: 40},
            interactionPoint: {x: 290, y: 460},
            responses: {
                look: "Stone paths wind through the garden, or rather, they used to. Now they're suggestions of paths -- occasional flagstones poking through ivy like the spine of a buried creature.",
                take: "You pry at a loose flagstone. It lifts slightly, revealing damp earth and a colony of woodlice who are deeply offended by the sudden daylight. You put it back.",
                use: "You follow the remnants of the path. It leads in a meandering circle back to roughly where you started, which feels like a metaphor for something.",
                talk: "You address the path. 'Where do you lead?' Nowhere, apparently. The path has been going nowhere for decades, and it's made peace with the journey.",
                open: "Paths are already open by definition. That's the entire point of a path. An unopenable path is just 'ground.'",
                push: "You push aside the ivy covering the flagstones. Beneath it: more flagstones, more ivy, and the unsettling realization that nature reclaims everything.",
                pull: "You pull ivy off a section of path. The stones beneath are cracked and moss-covered but still there, patiently waiting for someone to walk on them again.",
                default: "Every garden path leads somewhere, though in this case 'somewhere' and 'nowhere' have become functionally synonymous."
            }
        },
        {
            id: "garden-ivy", name: "Creeping Ivy",
            zone: {x: 450, y: 360, width: 100, height: 50},
            interactionPoint: {x: 500, y: 420},
            responses: {
                look: "Ivy covers everything -- paths, walls, statues, and most of the shed. It creeps with the patient ambition of something that has nowhere to be and all the time in the world.",
                take: "You tear off a length of ivy. It comes away easily, revealing the crumbling stone beneath. The ivy was the only thing holding things together. Some structural lies are best left undisturbed.",
                use: "Ivy is decorative at best, destructive at worst, and useful for absolutely nothing in between. It grows, it clings, it slowly demolishes masonry.",
                talk: "You speak to the ivy. It continues growing, indifferent to your words. Ivy doesn't care about your feelings. Ivy just grows. There's a lesson there, but it's depressing.",
                open: "You part the ivy curtain. Behind it: more wall. The ivy wasn't hiding anything except the disappointing truth that there's nothing to hide.",
                push: "You push through the ivy. It drapes across your shoulders like a clingy relative at a family gathering. You emerge covered in tiny leaves and mild resentment.",
                pull: "You pull a handful of ivy from the wall. It makes a satisfying ripping sound. The exposed stone beneath looks pale and startled. More ivy immediately begins plotting to reclaim the territory.",
                default: "The ivy is the real owner of this garden. Everything else is just temporary."
            }
        },
        {
            id: "dead-roses", name: "Dead Roses",
            zone: {x: 80, y: 370, width: 60, height: 40},
            interactionPoint: {x: 110, y: 420},
            responses: {
                look: "The remnants of what were once prize-winning roses. The bushes are still here, thorny and defiant, but the blooms are long gone. A few dried petals cling to stems like confetti at a party that ended years ago.",
                take: "You pluck a dried rose stem. It's all thorns and no beauty, which is nature's version of a personality without charm. You drop it. Some souvenirs aren't worth the puncture wounds.",
                use: "You could arrange them, press them, or weep over them. All equally productive. Dead roses are good for symbolism and absolutely nothing else.",
                talk: "'You were beautiful once,' you tell the dead roses. They were. They aren't now. This conversation is going exactly as well as conversations with dead flowers typically go.",
                open: "There's nothing to open on a rose bush. Roses bloom on their own schedule, and this bush's schedule expired sometime during the previous decade.",
                push: "You push through the rose bushes. Thorns snag your clothes and scratch your skin. The roses may be dead, but their defense mechanisms are thriving.",
                pull: "You pull at a dead rose cane. It snaps with a dry crack, releasing a faint ghost of perfume -- the olfactory equivalent of a sad goodbye.",
                default: "Dead roses. Once the pride of the castle garden, now a thorny reminder that beauty is temporary and neglect is permanent."
            }
        },
        {
            id: "birds-nest", name: "Petrified Bird's Nest",
            zone: {x: 620, y: 350, width: 40, height: 30},
            interactionPoint: {x: 640, y: 420},
            responses: {
                look: "Nestled in a petrified branch, a bird's nest has been turned to solid stone along with its tree. Every twig, every woven strand is preserved in perfect grey detail. If there were eggs inside, they're stone now too.",
                take: "The stone nest is fused to the tree -- one continuous piece of rock. The curse didn't distinguish between tree and tenant. Thorough, that curse.",
                use: "It's a stone nest in a stone tree. Its days of housing birds are comprehensively over. As a decorative object, it's stunning. As a functional nest, it's a rock.",
                talk: "You murmur sympathetically at the petrified nest. Whatever lived here left before the curse, or didn't. Either way, the nest isn't accepting new residents.",
                open: "You peer into the nest. Inside: three small stone eggs, perfectly preserved. They'll never hatch. It's the saddest thing in the garden, and the garden has stiff competition.",
                push: "You push the nest gently. It's part of the tree now -- solid stone, immovable. The curse fused everything together with the thoroughness of someone who deeply disliked nature.",
                pull: "You try to pry the nest loose. Stone doesn't pry. The nest and tree are one object now, united in geological permanence.",
                default: "Someone's home, turned to stone mid-existence. The curse didn't care about collateral damage."
            }
        }
    ]);
    saveRoom('castle_garden', data);
    console.log(`  ${oc} responses upgraded, ${hc} hotspots added`);
}

// ==================== WIZARD TOWER ====================
{
    const data = loadRoom('wizard_tower');
    console.log('wizard_tower:');
    const oc = applyOverrides(data, {
        'potion-shelves': {
            open: "You uncork a potion labeled 'Ambient Freshener.' The room now smells like lavender and regret. The other potions bubble disapprovingly.",
            push: "You shove the shelves. Several potions wobble dangerously. One tips, catches itself, and slowly rights back up -- enchanted to resist the stupidity of passersby.",
            pull: "You pull a shelf toward you. The potions rattle in protest. A vial labeled 'Liquid Spite' hisses steam at your face. You push the shelf back.",
            talk: "You address the potions. 'Definitely Not Poison' bubbles enthusiastically, as if finally someone is paying attention. The others remain aloof."
        },
        'spell-notes': {
            use: "You try to cast from the notes. The words rearrange themselves into a polite but firm message: 'Unauthorized use of proprietary spellwork is punishable under Section 12-C of the Arcane Licensing Act.'",
            open: "The notes are already open. Unfolded. Spread across every surface. The wizard didn't believe in filing so much as in strategic dispersal.",
            push: "You push the notes into a pile. They immediately scatter themselves back across the desk, as if tidiness personally offends them.",
            pull: "You tug at a note pinned under a paperweight shaped like a parking meter. It doesn't budge. The wizard's grudge extends to his office supplies.",
            talk: "You read the notes aloud. The words echo with faint magical resonance, and for a moment you feel the wizard's rage about parking spot 47-B as if it were your own."
        },
        'trapped-chest': {
            take: "You attempt to lift the iron chest. It doesn't move. It weighs approximately one metric ton of 'absolutely not.' The chest was enchanted to stay put.",
            push: "You push the chest. The arcane symbols flare warningly, like a cat whose tail you've just stepped on. You stop pushing. Some things push back.",
            pull: "You pull at the chest. The symbols glow brighter -- a graduated threat response. The chest has a better security system than most banks.",
            talk: "You speak to the chest. 'Hello?' The symbols pulse once, dismissively. The chest heard you. The chest does not care."
        },
        'scorch-mark': {
            take: "You try to scrape some soot off the wall. It clings with magical stubbornness, the way a stain on your reputation does. Some marks are permanent.",
            open: "It's a scorch mark on a wall, not a door. Though given the wizard's experiments, there's a nonzero chance it used to be one.",
            push: "You press your hand flat against the scorch mark. It's warm. Uncomfortably warm. Like pressing your hand against a memory of fire. You pull away.",
            pull: "You can't pull a scorch mark off a wall. Physics still applies here, despite the wizard's best efforts to overturn it.",
            talk: "You address the silhouette. 'So, the parking thing -- was it worth it?' The scorch mark offers no reply, which is itself a kind of answer."
        },
        'magic-books': {
            open: "You open a book at random. It's a chapter on 'Temporal Parking Enforcement: A Theoretical Framework.' Somehow every book circles back to parking.",
            push: "You push a stack of books aside. They slide grudgingly, then one at the bottom snaps open and flutters its pages at you. Territorial. Like a pigeon, but literate.",
            pull: "You pull a book from a shelf. It comes free with a sucking sound, as if the shelf was reluctant to part with it. The book vibrates in your hands. You put it back.",
            talk: "You ask the self-reading book what it's studying. It turns to a page that simply says 'MIND YOUR OWN BUSINESS' in illuminated script. Fair enough."
        },
        'tower-window': {
            open: "The window is sealed shut. Possibly by magic, possibly by centuries of grime, possibly by the wizard's paranoia about fresh air.",
            push: "You push against the window. The glass holds firm, enchanted to withstand magical explosions. It certainly isn't going to yield to you.",
            pull: "You pull at the window frame. Nothing happens. The window was built to survive a wizard's worst day. Your best effort doesn't even register.",
            talk: "You whisper to the window. The glass fogs briefly where your breath touches it, then clears. Even the window doesn't want to hear your thoughts."
        },
        'clerk-memory-crystal': {
            open: "It's a crystal, not a locket. You can't open it. The memories are stored magically, not physically. Though you appreciate the hands-on approach.",
            push: "You nudge the memory crystal. It rolls slightly and the glow intensifies, as if the memories inside are jostled and annoyed.",
            pull: "You pull the crystal toward you. It slides across the desk, leaving a faint trail of light. The memories inside shift like liquid, restless.",
            talk: "You speak to the crystal. For a moment, you hear a faint whisper -- the Clerk's voice, or the wizard's, or both. 'Parking spot 47-B...' it murmurs."
        },
        'gear-spring': {
            open: "It's a spring. It's already open. It's also already closed. Springs exist in a philosophical gray area between the two states.",
            push: "You press the spring down. It compresses with satisfying resistance, then bounces back with more force than expected, nearly taking your eye out.",
            pull: "You stretch the spring. It extends reluctantly, then snaps back to its coiled shape with a sharp twang. The spring knows what it is.",
            talk: "You talk to a spring. It does not respond. Springs are famously poor conversationalists, ranking just below rocks and just above certain feast committee members."
        },
        'wizard_ghost': {
            open: "You cannot open a ghost. This is not a concept that applies to spectral entities. The wizard's ghost glances at you with weary patience.",
            push: "Your hands pass through the ghost. He flickers irritably. 'Physical contact is not possible, metaphysically speaking. I wrote a paper on it.'",
            pull: "You swipe at the ghost. Your hand passes through cold air that smells faintly of old books and unresolved resentment. The wizard doesn't even acknowledge the attempt."
        }
    });
    const hc = addHotspots(data, [
        {
            id: "star-charts", name: "Star Charts",
            zone: {x: 200, y: 310, width: 90, height: 50},
            interactionPoint: {x: 245, y: 400},
            responses: {
                look: "Scattered star charts mapping constellations you don't recognize, because the wizard invented his own. 'The Parking Meter.' 'The Denied Application.' 'The Bureaucrat's Revenge.' He literally rewrote the heavens to validate his grudge.",
                take: "You roll up a star chart. It immediately unrolls itself and flattens back onto the table with passive-aggressive force. The charts have been here for centuries.",
                use: "You try to navigate by the charts, but the constellations are fictional and the coordinates are emotional. 'Turn left at Resentment, proceed until you reach Vindication.'",
                talk: "You ask the star charts for guidance. A constellation labeled 'The Fool' twinkles faintly. You choose to believe that's coincidence.",
                open: "The charts are already spread across every available surface. They cannot be more open. This is peak openness.",
                push: "You push the charts aside. They slide across the table and several drift to the floor, where they land face-up and continue being incomprehensible.",
                pull: "You pull a chart from under a stack of books. It rips slightly. The tear mends itself instantly, the parchment knitting back together with offended precision.",
                default: "The star charts are beautiful, intricate, and completely useless for anyone who isn't nursing a three-century grudge about parking."
            }
        },
        {
            id: "spell-components", name: "Spell Components",
            zone: {x: 750, y: 340, width: 100, height: 60},
            interactionPoint: {x: 800, y: 420},
            responses: {
                look: "Half-finished spell components litter the workbench: dried herbs in unlabeled jars, ground crystals in cracked bowls, a severed newt tail that still twitches occasionally. Everything is precisely measured and covered in dust.",
                take: "You pocket some spell components. Then you remember you have no idea what they do and a track record that suggests touching mysterious substances will end badly. You put them back.",
                use: "You attempt to combine spell components at random. Nothing happens, which is the best possible outcome and frankly more luck than you deserve.",
                talk: "You address the spell components. The newt tail twitches. Whether in response to your voice or in its death throes is unclear and you'd rather not know.",
                open: "You open a jar. It smells like burnt ambition and ground cinnamon. You close it. Some jars are better left sealed.",
                push: "You push the components around the workbench. A jar of ground crystal rolls to the edge, teeters, and stops. The universe is giving you exactly one warning.",
                pull: "You pull a tray of components toward you. The dried herbs crumble slightly, releasing a smell that is equal parts thyme and existential dread.",
                default: "Spell components in various states of preparation, waiting for a wizard who will never finish the job."
            }
        },
        {
            id: "parking-book", name: "Parking Regulations Book",
            zone: {x: 430, y: 340, width: 70, height: 40},
            interactionPoint: {x: 465, y: 400},
            responses: {
                look: "A thick volume titled 'Municipal Parking Regulations, Seventh Edition (Annotated With Fury).' Every page is covered in the wizard's margin notes, growing increasingly unhinged. Page one: 'Reasonable enough.' Page three hundred: 'THEY WILL ALL PAY.'",
                take: "You pick up the book. It's heavier than expected, weighed down by the sheer density of annotations. You flip through it, feel a migraine forming, and set it down.",
                use: "You read a passage aloud: 'Section 47-B: Reserved spots may be reassigned at the discretion of the feast committee.' The room temperature drops two degrees.",
                talk: "You read Section 47-B aloud. Somewhere in the tower, a spectral draft sighs. The parking regulations book is the wizard's bible, manifesto, and therapy journal.",
                open: "The book falls open to Section 47-B, as it always does. The spine is cracked there from centuries of furious re-reading. The page is tear-stained.",
                push: "You push the book off the desk. It hits the floor, falls open to Section 47-B, and stays there. The book knows what it's about.",
                pull: "You pull the book toward you. It resists slightly, as if the desk has grown attached to it. Stockholm syndrome, but for furniture.",
                default: "The most dangerous book in the tower isn't a grimoire -- it's municipal code."
            }
        }
    ]);
    saveRoom('wizard_tower', data);
    console.log(`  ${oc} responses upgraded, ${hc} hotspots added`);
}

// ==================== DUNGEON ====================
{
    const data = loadRoom('dungeon');
    console.log('dungeon:');
    const oc = applyOverrides(data, {
        'clerk-desk': {
            open: "You reach for a desk drawer. The Clerk's hand lands on yours with the speed and precision of a stamping mechanism. 'Drawer access requires Form 12-C,' he says. 'Filed in triplicate.'",
            push: "You push against the desk. It doesn't move. It has the gravitational permanence of an institution. The Clerk doesn't even look up.",
            pull: "You try to pull the desk toward you. The Clerk raises one eyebrow -- the bureaucratic equivalent of drawing a weapon. The desk stays where it has always been.",
            talk: "You address the desk directly. It does not respond. This makes it the second most communicative object in the room, after the Clerk."
        },
        'trap-door': {
            open: "You kneel down and tug at the trap door's edge. It creaks open an inch, releasing a gust of cold air that smells like regret and limestone. From below: a distant, wet thud. You let it fall shut.",
            push: "You press your foot against the trap door experimentally. It gives slightly. The sign says 'DO NOT STEP.' Pressing is not stepping, technically.",
            pull: "You grip the edge of the trap door and pull. It lifts slightly, revealing nothing but darkness and a draft that chills your soul. You lower it carefully.",
            talk: "You lean toward the trap door and call down into the darkness. Something echoes back. It might be your voice. It might not be."
        },
        'filing-cells': {
            take: "You grab a handful of files. The Clerk clears his throat with the authority of someone who has cleared throats professionally for centuries. You put the files back.",
            open: "The cell doors swing open freely -- they haven't held prisoners in centuries. They hold something far more dangerous now: organized information.",
            push: "You push against a cell door. It swings open with a creak. Inside: more files. The cells are full. The bureaucracy is overflowing.",
            pull: "You pull a cell door closed. It clangs shut with a finality that suggests the files inside are now serving a life sentence.",
            talk: "You address the filing cells. 'Anyone in there?' Silence. The files don't talk. They don't need to -- their contents speak volumes."
        },
        'desk-lamp': {
            open: "The lamp doesn't open. It's a lamp, not a door. Though in this dungeon, the distinction between furniture categories has become somewhat philosophical.",
            push: "You push the lamp. It slides across the surface, briefly illuminating a section of wall that turns out to be deeply uninteresting. The Clerk adjusts it back.",
            pull: "You pull the lamp toward you. The cord goes taut. Somewhere, whatever this lamp is plugged into objects silently. You push it back.",
            talk: "You whisper to the lamp. It flickers. Coincidence, probably. But in a dungeon run by a four-hundred-year-old bureaucrat, 'probably' carries less certainty than it used to."
        },
        'filing-cabinets': {
            open: "You pull open a drawer labeled 'Miscellaneous (Sub-Category: Uncategorizable).' Inside are forms requesting the creation of new categories. Bureaucracy eating its own tail.",
            push: "You shove a filing cabinet. It doesn't budge. It's bolted to the wall, the floor, and possibly to the concept of permanence itself.",
            pull: "You yank on a cabinet. The bolts hold. The wall holds. Your dignity does not hold. The Clerk watches with detached interest.",
            talk: "You mutter at the filing cabinets. They contain centuries of secrets, none of which they are willing to share conversationally."
        },
        'barred-window': {
            open: "The window doesn't open. The bars don't yield. This was designed as a ventilation feature, not an escape route.",
            push: "You push against the bars. They are iron. You are not. The iron wins, as iron tends to do in contests against human ambition.",
            pull: "You wrap your hands around the bars and pull. Nothing happens, except you now have rust on your palms and a renewed appreciation for medieval ironwork.",
            talk: "You shout through the bars. Your voice echoes off stone and returns unchanged and unhelpful. If anyone's out there, they're not interested."
        },
        'the_clerk': {
            open: "The Clerk is not a door, a drawer, or a filing cabinet, though he shares many qualities with all three -- rigid, full of old information, and difficult to get anything useful out of.",
            push: "You push the Clerk's shoulder. He doesn't move. He continues writing. Your push has been noted, categorized, and filed under 'Assault (Minor, Unproductive).'",
            pull: "You tug the Clerk's sleeve. He pauses. 'Physical contact with administrative personnel requires Form 8-D,' he says. 'Subsection: Unwanted.' He returns to his paperwork."
        },
        'treasury-key': {
            open: "The key opens things. It doesn't get opened. That's not how keys work. Even in a dungeon where the rules of logic have been gently bent by centuries of bureaucracy.",
            push: "You nudge the key across the desk. It slides over a stack of forms, leaving a gold scratch on a denial notice. The Clerk notes the damage.",
            pull: "You drag the key toward the edge of the desk. The Clerk watches. 'If you want the paperweight,' he says, 'there are forms for that.'",
            talk: "You address the key. 'What do you open?' The key maintains its customary silence. Somewhere, a lock waits patiently for someone to make the obvious connection."
        }
    });
    const hc = addHotspots(data, [
        {
            id: "paperwork-stacks", name: "Paperwork",
            zone: {x: 350, y: 350, width: 80, height: 40},
            interactionPoint: {x: 390, y: 420},
            responses: {
                look: "Stacks of forms, applications, and stamped documents cover every horizontal surface. Each one represents someone's hope, duly received and thoroughly crushed by bureaucratic process.",
                take: "You pick up a form. 'UNAUTHORIZED REMOVAL OF DOCUMENTS IS A VIOLATION OF--' reads the header. You put it back. Even the paperwork threatens you.",
                use: "You attempt to fill out a form. It requires three references, two forms of identification, and the signature of someone who died two centuries ago. Standard procedure.",
                talk: "You read a form aloud. It's a request to request a request form. The recursion is deliberate. The Clerk designed this system and it is perfect.",
                open: "You unfold a document. It's a denial letter for someone named 'Everybody.' The Clerk believes in efficiency -- one rejection for the entire population.",
                push: "You push a stack of papers. They topple, scattering across the floor. The Clerk's pen pauses. The silence is worse than any reprimand.",
                pull: "You pull a paper from the bottom of a stack. The stack collapses. The Clerk begins writing a damage report before the last page hits the floor.",
                default: "The paperwork grows. Nobody adds to it. Nobody removes it. It simply generates itself, like bureaucratic mitosis."
            }
        },
        {
            id: "dungeon-ceiling", name: "Dungeon Ceiling",
            zone: {x: 200, y: 30, width: 400, height: 80},
            interactionPoint: {x: 400, y: 400},
            responses: {
                look: "Low stone arches overhead, blackened by centuries of torch smoke and lamp oil. Cobwebs drape between the keystones like bunting for the world's worst party. The ceiling is just high enough that you don't have to duck, but low enough to make you uncomfortable about it.",
                take: "You cannot take a ceiling. This should not need explaining, but here we are, in a dungeon, reaching upward.",
                use: "The ceiling's primary use is not falling on you. It has performed this function admirably for centuries. Leave it alone.",
                talk: "You address the ceiling. A cobweb drifts down in response, landing on your face. The ceiling's sense of humor is dry and deeply unwelcome.",
                open: "Ceilings don't open. If this ceiling opened, you'd be standing in whatever room is above you, which would raise questions about structural engineering that nobody is prepared to answer.",
                push: "You press your palm against the ceiling. It's damp, cold, and slightly slimy. You lower your hand and wipe it on your clothes. The ceiling continues to be a ceiling.",
                pull: "You grab a cobweb and pull. It comes away in your hand, sticky and revolting. More cobwebs remain. You've made no meaningful impact on the ceiling's ecosystem.",
                default: "The dungeon ceiling hangs above you with the quiet menace of something that knows exactly how heavy it is."
            }
        }
    ]);
    saveRoom('dungeon', data);
    console.log(`  ${oc} responses upgraded, ${hc} hotspots added`);
}

// ==================== ROYAL KITCHEN ====================
{
    const data = loadRoom('royal_kitchen');
    console.log('royal_kitchen:');
    const oc = applyOverrides(data, {
        'iron-stove': {
            pull: "You attempt to pull the iron stove away from the wall. It weighs more than your sense of self-preservation. The stove wins this round.",
            open: "You crack open the stove door. A wave of heat hits your face. Inside, something that was once bread has achieved a state of carbon that alchemists would find academically interesting.",
            talk: "You address the stove. It responds with a creak of expanding metal, which is more engagement than you've gotten from most of the castle staff."
        },
        'pantry-shelves': {
            push: "You shove the pantry shelves. They creak ominously and a jar of something pickled wobbles toward the edge. You stop pushing before gravity and Martha's wrath combine forces.",
            pull: "You pull the shelves toward you. Behind them: wall. No secret passage, no hidden treasure. Just more wall.",
            open: "The shelves are open by design. The jars on them are sealed by desperation -- whatever's inside has been preserved so long it may have achieved sentience."
        },
        'hearth': {
            push: "You push against the hearth stones. They've been in place since the castle was built and they intend to stay. Your shoulder now has a bruise with character.",
            pull: "You try to pull stones from the hearth. They're mortared in place by centuries of soot, grease, and the structural stubbornness of medieval masonry.",
            open: "You peer into the hearth's firebox. Embers glow back at you like angry orange eyes. There's no hidden compartment, just heat, ash, and carbonised memories.",
            talk: "You whisper into the hearth. The fire crackles in response. It's the most productive conversation you've had in this castle."
        },
        'kitchen-shelves': {
            push: "You give the shelves a shove. Crockery rattles. A plate slides to the edge, teeters, and -- through sheer spite -- stays put. Martha glares at you.",
            pull: "You pull on the shelves. Plates rattle like ceramic teeth chattering in fear. Nothing comes loose except your confidence in this plan.",
            open: "They're shelves, not cabinets. They're as open as they're going to get. The crockery is as exposed as the castle's budget deficit."
        },
        'cooking-pots': {
            push: "You push a copper pot across the counter. It grinds against the stone with a noise that makes Martha's left eye twitch. You stop.",
            pull: "You pull a pot off its hook. It swings back and clangs against its neighbour, starting a chain reaction of metallic percussion. Martha's grip tightens. You rehang it.",
            open: "You lift the lid of the nearest pot. Inside: emptiness, a faint smell of last week's stew, and the lingering sadness of a kitchen without supplies."
        },
        'castle_cook': {
            push: "You put your hand on Martha's shoulder. She looks at it. She looks at her cleaver. She looks back at your hand. You remove your hand. The entire exchange takes two seconds and ages you five years.",
            pull: "You tug Martha's sleeve. She spins with a speed that contradicts her build, cleaver at the ready. 'Touch me again and I'll julienne your fingers,' she says calmly.",
            open: "Martha is a person, not a cupboard. Though she does contain a surprising amount of useful information -- if you can get past the wall of culinary hostility."
        },
        'empty-chalice': {
            open: "It's a chalice, not a locket. It's already open. Maximally open. The most open a drinking vessel can be.",
            push: "You push the chalice across the shelf. It scrapes along with the indignity of former royalty reduced to casual shoving.",
            pull: "You pull the chalice toward the edge of the shelf. It teeters with the dramatic instinct of something that was once centre stage at state banquets.",
            talk: "You speak to the chalice. It doesn't answer, but the tarnish on its surface seems to deepen, as though embarrassed on your behalf."
        }
    });
    const hc = addHotspots(data, [
        {
            id: "chopping-block", name: "Chopping Block",
            zone: {x: 430, y: 390, width: 70, height: 50},
            interactionPoint: {x: 465, y: 440},
            responses: {
                look: "A thick oak chopping block, its surface scarred with a thousand cuts like a map of Martha's frustrations. It's been chopped on so extensively that the centre has worn into a shallow bowl. Currently, it holds nothing but memories and wood shavings.",
                take: "The chopping block weighs roughly as much as Martha's disapproval, which is considerable. It's not going anywhere. Neither, apparently, are you.",
                use: "You mime chopping on the block. Martha watches you pretend to be useful with the expression of someone who has seen many interns and been impressed by none of them.",
                talk: "You address the chopping block. It says nothing. It's heard things you haven't -- the thud of the cleaver, Martha's muttered curses, the occasional scream of an onion meeting its fate.",
                open: "It's a solid block of wood. There's nothing inside it except more wood. This is how blocks work. You're thinking of boxes.",
                push: "You push the chopping block. It scrapes across the floor half an inch. Martha's glare pins you in place with more force than the block's weight ever could.",
                pull: "You pull the chopping block toward you. It grinds across stone. Martha says, 'Put that back.' You put it back. Survival instincts: finally functioning.",
                default: "The chopping block endures. It has been battered, scarred, and soaked with the juices of a thousand vegetables. It perseveres. There's a lesson there."
            }
        },
        {
            id: "ceiling-hooks", name: "Ceiling Hooks",
            zone: {x: 380, y: 30, width: 180, height: 60},
            interactionPoint: {x: 470, y: 440},
            responses: {
                look: "Iron hooks hang from ceiling beams, most still holding copper pots and dried herbs. A few are empty, their former cargo claimed by rust, gravity, or Martha's throwing arm during a particularly bad supply day.",
                take: "The hooks are embedded in century-old ceiling beams. You'd need a ladder, a pry bar, and a death wish -- the last because Martha uses those hooks and Martha does not share.",
                use: "You hang your jacket on a hook. Martha removes it, hands it back to you, and says nothing. The hooks are for kitchen implements only. You are not a kitchen implement. Debatable.",
                talk: "You address the ceiling hooks. They don't respond. They've been silently holding pots for decades. Strong, reliable, uncomplaining. More than can be said for most people.",
                open: "Hooks don't open. They hook. That's the one thing they do, and they do it without complaint or existential crisis.",
                push: "You push a hanging pot. It swings on its hook, clanging against its neighbor. The percussion echoes through the kitchen. Martha's eye twitches. You stop the swinging.",
                pull: "You pull a pot off a hook. It's heavier than expected and nearly brains you on the way down. You rehang it quickly. The hook accepts it back without judgment.",
                default: "The ceiling hooks do their job. Silently. Indefinitely. They're the most competent employees in this castle."
            }
        },
        {
            id: "kitchen-cleaver", name: "Martha's Cleaver",
            zone: {x: 440, y: 380, width: 40, height: 30},
            interactionPoint: {x: 460, y: 430},
            responses: {
                look: "Martha's cleaver rests within arm's reach at all times. It's less a cooking tool and more an extension of her personality -- sharp, heavy, and capable of ending a conversation from across the room.",
                take: "You reach for the cleaver. Martha's hand is there first, having moved at a speed that shouldn't be possible for someone who claims to have a bad hip. 'Mine,' she says.",
                use: "You suggest you could help with the chopping. Martha looks at you, looks at the cleaver, and makes a decision about which of you she trusts more. It's the cleaver.",
                talk: "You admire the cleaver aloud. Martha almost smiles. Almost. The cleaver is the one thing in this kitchen she's genuinely proud of. It was her mother's. Don't touch it.",
                open: "It's a cleaver, not a Swiss army knife. It has one function, performed with devastating efficiency. Simplicity is a virtue Martha understands.",
                push: "You nudge the cleaver with a finger. Martha's hand slams down next to yours with a THWACK that makes the pots rattle. 'Don't,' she says. Message received.",
                pull: "You try to slide the cleaver toward you. Martha intercepts it mid-slide. 'I will use this on the next person who touches it,' she says. She's not joking. She's never joking about the cleaver.",
                default: "Martha's cleaver: the real authority in this kitchen. The cook just swings it."
            }
        }
    ]);
    saveRoom('royal_kitchen', data);
    console.log(`  ${oc} responses upgraded, ${hc} hotspots added`);
}

console.log('\nDone! All remaining agent findings applied.');
