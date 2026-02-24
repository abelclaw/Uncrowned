/**
 * Apply agent findings for treasury, underground_pool, underground_river
 * Upgrades generic template responses with contextual ones
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
function findEntity(data, entityId) {
    for (const arr of [data.hotspots, data.items, data.npcs]) {
        if (!arr) continue;
        const e = arr.find(x => x.id === entityId);
        if (e) return e;
    }
    return null;
}

const GENERIC = [
    /doesn't open/i, /doesn't budge/i, /try from several angles/i,
    /wins this round/i, /structural advantage/i, /conspire against you/i,
    /says nothing back/i, /most productive conversation/i,
    /resistance as a mountain/i, /not that kind of thing/i,
    /not about to stop now/i, /You've accomplished nothing/i,
    /offers the same resistance/i, /Gravity and architecture/i,
    /wasn't designed to open/i, /at some point, you'll accept/i,
    /contemplative agreement/i, /mild strain in your lower back/i,
    /not a great conversationalist/i, /no hinges, no latch/i,
    /firmly attached to its current situation/i, /all your might turns out/i,
    /quiet determination of something/i, /maintains its silence/i,
    /It is what it is/i, /You, on the other hand, are debatable/i
];

function isGeneric(text) { return GENERIC.some(p => p.test(text)); }

function applyOverrides(data, overrides) {
    let count = 0;
    for (const [id, responses] of Object.entries(overrides)) {
        const e = findEntity(data, id);
        if (!e) { console.log(`  WARN: ${id} not found`); continue; }
        if (!e.responses) e.responses = {};
        for (const [verb, text] of Object.entries(responses)) {
            if (!e.responses[verb] || isGeneric(e.responses[verb])) {
                e.responses[verb] = text;
                count++;
            }
        }
    }
    return count;
}

// ==================== TREASURY ====================
{
    const data = loadRoom('treasury');
    console.log('treasury:');
    const c = applyOverrides(data, {
        'empty-pedestals': {
            talk: "You read the plaques aloud. 'Crown of Aldric the Fastidious -- Donated to Kingdom Defense Fund.' The pedestals listen. They've been listening to their own emptiness for centuries. Your commentary doesn't improve things.",
            open: "You check behind the pedestals for hidden compartments. Nothing. The treasury's secret is that there are no secrets. Just a kingdom that spent everything.",
            push: "You shove a pedestal. It scrapes across the floor with a noise that would have alarmed guards, had the treasury still warranted guarding. The plaque reads 'Diamond Tiara -- Lost in a card game.'",
            pull: "You pull a pedestal toward you. It's lighter than expected -- hollow stone, built to display things that no longer exist. Much like the monarchy itself."
        },
        'velvet-cushion': {
            take: "You could take the cushion, but what would you do with a velvet pillow? Sleep on it? In a treasury? The cushion's sole purpose is displaying the Kingdom Seal, and it's been doing that job longer than most dynasties.",
            talk: "You address the velvet cushion. It maintains a regal silence, which is more than the actual monarchy managed in its final decades.",
            open: "You lift the cushion, searching for something hidden beneath. Underneath: a perfect outline of the seal in the dust, and nothing else. The cushion kept one secret: how dusty this place really is.",
            push: "You push the cushion aside. The Kingdom Seal slides with it, coming perilously close to the edge. You nudge everything back into place before gravity makes an administrative decision.",
            pull: "You pull the cushion toward you. The seal slides off and lands on the pedestal with a heavy THUNK. You place it back on the cushion. This is not the heist you were planning."
        },
        'treasury-shelf': {
            take: "You can't take the shelf. It's bolted to the wall and contains the kingdom's last remaining assets, which fit on a single shelf. That's either efficient storage or tragic financial management.",
            talk: "You address the shelf. Its remaining contents -- a vial and an IOU note -- say more about this kingdom than any speech from the throne ever did.",
            open: "The shelf is open. Everything on it is visible. The kingdom's remaining wealth is: clock oil, an empty coin purse, and a promissory note from a curse. Transparent accounting, at last.",
            push: "You push the shelf. The vial of clock oil wobbles. The empty coin purse doesn't move, because empty coin purses have nothing to lose.",
            pull: "You pull the shelf away from the wall. Behind it: a spider, two dust bunnies, and the remnants of the kingdom's financial credibility."
        },
        'golden-urns': {
            talk: "You address the urns. They ring faintly, a hollow echo that says more about the treasury's emptiness than any inventory report. The urns are golden but the gold is thin -- plated, not solid. Even the display pieces were on a budget.",
            open: "You lift the lid of an urn. Inside: dust, a single copper coin wedged in the bottom, and what appears to be an IOU written on the back of a royal napkin. The kingdom's financial management was... comprehensive in its failure.",
            push: "You push an urn. It's bolted to its pedestal, but the lid clatters. A small puff of dust escapes, carrying the last particles of the kingdom's wealth into the air. Fiscal evaporation, literally.",
            pull: "You pull at an urn. The bolt holds. These were designed to stay put -- the one competent security decision in a treasury that's been systematically looted by its own government."
        },
        'treasury-torches': {
            talk: "You address the torches. They crackle in response. Magical fire doesn't need conversation, but it's the most responsive thing in the treasury. Low bar.",
            open: "You examine the torch bracket. It's a simple iron holder -- no hidden switch, no secret mechanism. The treasury's security relied on locked doors and booby-trapped pedestals, not torch puzzles.",
            push: "You push a torch bracket. It rotates slightly in its holder but triggers nothing. No secret doors, no hidden passages. Just a torch, doing torch things, forever.",
            pull: "You yank a torch from its bracket. It comes free, still burning. The flame doesn't waver. Magical torches: the one expense this kingdom didn't regret."
        },
        'kingdom-seal': {
            talk: "You speak to the Kingdom Administrative Seal. It bears the coat of arms: a badger arguing with a filing cabinet. The seal has more authority in its stamp than you have in your entire person. It knows this.",
            open: "The seal is solid metal, not a container. It stamps, it presses, it authenticates. If you're looking for something to open, try the door you came through.",
            push: "You press the seal against the velvet cushion. It leaves an impression -- the royal crest, slightly lopsided. Even the kingdom's official stamp can't quite get things straight anymore.",
            pull: "You pull the seal toward the edge of the cushion. It's heavy -- dense metal, weighted with centuries of administrative authority. The ghost of a thousand rubber-stamped documents hovers in the air."
        },
        'clock-oil': {
            talk: "You address the vial of clock oil. Its label reads 'Annual Budget: 2 Copper.' The clock hasn't been maintained in decades. This vial is proof that even the simplest maintenance gets forgotten when a kingdom is busy collapsing.",
            open: "You uncork the vial carefully. The oil inside is still liquid -- magical preservation, probably. It smells of machinery and good intentions. You re-cork it. No point spilling the one useful thing left in the treasury.",
            push: "You nudge the vial. It slides across the shelf with the nervous energy of something that knows it's important but doesn't know when it'll be needed.",
            pull: "You slide the vial toward you. The oil inside sloshes gently. 'For Official Use Only,' says the label. Everything in this treasury is for official use. The problem is, there are no officials left."
        }
    });
    saveRoom('treasury', data);
    console.log(`  ${c} responses upgraded`);
}

// ==================== UNDERGROUND POOL ====================
{
    const data = loadRoom('underground_pool');
    console.log('underground_pool:');
    const c = applyOverrides(data, {
        'pool-surface': {
            open: "You can't open water. Water is already in its most accessible state. If anything, the problem is that the pool is too open -- open enough to drown in.",
            push: "You press your hand against the water's surface. It's ice-cold. Ripples spread outward, disturbing your reflection. The bones at the bottom seem to shift. They didn't. Probably.",
            pull: "You scoop water and let it drain through your fingers. It's mineral-rich -- heavy, almost oily. Whatever's dissolved in this pool has been dissolving for a very long time."
        },
        'cave-crystals': {
            talk: "You address the crystal formations. One rings faintly in response -- a harmonic that makes the pool's surface shiver. The crystals have been listening to the cave for millennia. Your voice is a footnote.",
            open: "Crystals don't open. They grow, they refract, they look pretty. The concept of 'opening' a geological formation is bold but fundamentally misguided.",
            push: "You push against a crystal cluster. It's harder than steel and sharper than your judgment. A small piece chips off and lands in the pool, where it sinks and glows. Another tiny light joining the collection at the bottom.",
            pull: "You grip a crystal and pull. It doesn't budge. These formations have been growing since before the kingdom existed. They're not about to be evicted by someone with soft hands and poor planning."
        },
        'pool-reflection': {
            take: "You can't take a reflection. You can barely take responsibility. The reflection mimics your grasping motion with what looks like amusement.",
            talk: "You speak to your reflection. It mouths words back that don't match yours. This is either a magical phenomenon or you're losing your grip on reality. Both are equally likely at this point.",
            open: "You wave your hand through the reflection. It shatters into ripples, then reforms. The reflected you looks slightly different each time it returns -- same face, different expression. Watchful.",
            push: "You press your hand toward the reflection. The water's surface resists for a moment, then your fingers break through the cold. The reflected hand reaches back toward you from below. You pull away.",
            pull: "You try to pull the reflection from the water. Your hand comes back cold and empty. Reflections aren't objects. Though this one seems to have more personality than most."
        },
        'pool-cave-walls': {
            talk: "You speak to the cave walls. Your voice bounces back, slightly distorted by the mineral deposits. The cave has been sculpted by water for eons. Your words are the least interesting thing it's heard.",
            open: "Caves don't open. They erode, over millennia, with patience you will never possess. The walls here were carved by water, not by impatient adventurers.",
            push: "You lean against the cave wall. It's smooth, cold, and slightly wet. The rock doesn't yield. It hasn't yielded to anything in geological time, and you're not about to change that.",
            pull: "You try to pull a loose rock from the wall. It's not loose. Nothing here is loose. The cave has been settled into its current form for longer than human memory extends."
        },
        'light-shaft': {
            talk: "You address the light shaft. Your voice rises with the dust motes, spiraling up toward the crack in the ceiling. Nothing responds. The light simply continues being light, which is more than most things in this cave manage.",
            open: "The light comes from a crack far above -- natural, not mechanical. You can't open it wider any more than you can open the sky.",
            push: "You wave your hand through the light shaft. Dust motes scatter and swirl. For a moment, the light seems to bend around your fingers. Then physics reasserts itself.",
            pull: "You can't pull light toward you. It's already traveling at the maximum speed the universe allows. Your efforts to redirect it are noted and dismissed."
        },
        'cave-crystal-shard': {
            talk: "You speak to the crystal shard. It hums in response -- a warm vibration that passes from your fingers into your palm. The shard has been absorbing the cave's sounds for centuries. It has a lot to say, but only in frequencies you can't hear.",
            open: "The shard is solid crystal. There's nothing inside to access. Though it glows as if something is trying to get out. Magical resonance, probably. Not sentience. Probably.",
            push: "You press the shard against the ground. It leaves a faint glowing mark that fades after a moment. The crystal's magic is gentle -- a whisper, not a shout.",
            pull: "You tug the shard from where it rests. It comes free with a reluctant click, trailing a faint phosphorescent residue. The pool's glow dims slightly, as if noticing the loss."
        }
    });
    saveRoom('underground_pool', data);
    console.log(`  ${c} responses upgraded`);
}

// ==================== UNDERGROUND RIVER ====================
{
    const data = loadRoom('underground_river');
    console.log('underground_river:');
    const c = applyOverrides(data, {
        'river-current': {
            take: "You scoop river water. It's freezing and immediately leaks through your fingers. The current doesn't slow down for anyone, least of all someone trying to pocket it.",
            talk: "You shout over the rushing water. Your voice is drowned out instantly. The river has been making noise for centuries and isn't about to let you be heard over it.",
            open: "Rivers don't open. They flow. That's the one thing rivers do, and this one does it with aggressive competence.",
            push: "You push against the current with your hand. The water shoves back with the force of something that weighs several thousand tons and is going somewhere in a hurry.",
            pull: "You drag your hand through the current. It pulls your arm downstream with surprising force. The river wants you to go south, toward the waterfall. The river does not have your best interests at heart."
        },
        'rocky-shore': {
            take: "You pocket a smooth stone from the shore. It's cold, wet, and pointless. You now have a rock. The river has millions more. It will not miss this one.",
            use: "You use the shore as a launching point to survey the river. Upstream: the forge, behind rapids. Downstream: a waterfall and certain death. The shore is the only neutral ground here.",
            talk: "You address the rocky shore. The stones are smooth and silent. They've been polished by the river for longer than your kingdom has existed. They have nothing to say and all the time in the world.",
            open: "Shores don't open. They sit there, between water and land, committing to neither. The Switzerland of geological features.",
            push: "You kick a rock. It tumbles into the river and is immediately swept downstream. A moment of satisfying violence followed by the complete indifference of nature.",
            pull: "You pull a rock from the shore. Beneath it: more rock, wet silt, and a small cave beetle that scurries away, deeply offended by the sudden daylight."
        },
        'rushing-water': {
            talk: "You shout at the rushing water. It roars back, louder. The river wins every argument by sheer volume. You've been out-debated by a body of water.",
            open: "You can't open water. Water is already as open as a substance gets. The problem isn't access -- it's that the river wants to kill you. Open access to death is not an improvement.",
            push: "You thrust your hand into the rushing water. The cold hits first, then the force. The current nearly pulls you off your feet. You extract your hand and several important lessons about hydrodynamics.",
            pull: "You try to pull water from the river. It slips through your fingers, returning to the current with the indifference of something that has been flowing since before your ancestors learned to walk upright."
        },
        'cave-waterfall': {
            talk: "You shout at the waterfall. It responds by being louder. The waterfall has been winning shouting matches since before language existed. You are outclassed.",
            open: "You can't open a waterfall. It's already the most dramatically open thing in this cave -- water, falling, openly, with maximum theatrical commitment.",
            push: "You push your hand through the waterfall's curtain. Cold water hammers your wrist. Behind the falls: rock wall. No secret cave, no hidden passage. Just water and disappointment.",
            pull: "You try to pull the waterfall toward you. The waterfall continues falling exactly where it wants to. Gravity is not negotiable."
        },
        'old-boat': {
            take: "The boat weighs more than your resolve. It's beached on rocks and wedged in silt. Moving it requires repairs first -- then the river can carry it. Until then, it's an immovable monument to someone else's failed river journey.",
            talk: "You address the boat. It creaks. Wind in the hull? Or the boat expressing its opinion of your repair skills? Either way, it's the most responsive thing in this cavern.",
            open: "The boat has no cabin, no compartment, no hold. It's an open hull -- what you see is what you get. Which is two cracks, a missing plank, and a lot of optimism required.",
            push: "You shove the boat toward the water. It scrapes across the rocks, cracking further. Without repairs, pushing it into the river would just create more shore debris.",
            pull: "You pull the boat higher onto the shore. It grinds against the rocks with a sound like a dying animal. The boat has seen better days, better captains, and better rivers."
        }
    });
    saveRoom('underground_river', data);
    console.log(`  ${c} responses upgraded`);
}

console.log('\nDone!');
