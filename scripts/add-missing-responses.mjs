/**
 * Script to add missing verb responses to all room hotspots.
 * For each hotspot, checks which of the standard verbs (look, take, use, talk, open, push, pull)
 * are missing and adds sardonic dark comedy responses based on the hotspot name.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOMS_DIR = join(import.meta.dirname, '..', 'public', 'assets', 'data', 'rooms');

// Response templates for each verb - multiple options to add variety
const PUSH_RESPONSES = [
    name => `You push the ${name}. It doesn't budge. It has been not budging for longer than you've been alive, and it's not about to stop now.`,
    name => `You shove the ${name} with all your might. All your might turns out to be insufficient. The ${name} remains unmoved, both physically and emotionally.`,
    name => `You lean into the ${name} and push. Nothing happens, except a mild strain in your lower back. The ${name} wins this round.`,
    name => `You press against the ${name}. It offers the same resistance as a mountain, which is to say, total and indifferent.`,
];

const PULL_RESPONSES = [
    name => `You grab the ${name} and pull. It stays exactly where it is. You've accomplished nothing, but at least you've committed to the effort.`,
    name => `You tug at the ${name}. It refuses to move, with the quiet determination of something that has been here much longer than you and intends to stay.`,
    name => `You heave at the ${name}. Your muscles protest, the ${name} doesn't. It has the structural advantage of not caring.`,
    name => `You pull on the ${name}. Nothing happens. Gravity and architecture conspire against you, as usual.`,
];

const TALK_RESPONSES = [
    name => `You address the ${name}. It doesn't respond. This is the most productive conversation you've had today.`,
    name => `You speak to the ${name} in a calm, measured tone. The ${name} maintains its silence, which is more than can be said for most things in this kingdom.`,
    name => `You talk to the ${name}. It says nothing back. You choose to interpret this as deep, contemplative agreement.`,
    name => `You attempt a conversation with the ${name}. The ${name} is not a great conversationalist. Then again, neither are you.`,
];

const OPEN_RESPONSES = [
    name => `The ${name} doesn't open. It wasn't designed to open. Not everything is a door or a chest, despite what your adventuring instincts suggest.`,
    name => `You try to open the ${name}. It has no hinges, no latch, and no sympathy for your confusion. It is what it is.`,
    name => `The ${name} doesn't open. You try from several angles, each equally unsuccessful. At some point, you'll accept this.`,
    name => `You search the ${name} for a way to open it. There isn't one. It's not that kind of thing.`,
];

const USE_RESPONSES = [
    name => `You're not entirely sure how to use the ${name}. Neither is the ${name}, for what it's worth.`,
    name => `You fiddle with the ${name} for a moment, then give up. Whatever its purpose, you haven't figured it out.`,
    name => `Using the ${name} doesn't accomplish anything obvious. Perhaps it needs to be used with something else. Or perhaps it's just decorative.`,
];

const TAKE_RESPONSES = [
    name => `You can't take the ${name}. It's firmly attached to its current situation, much like your growing sense of confusion.`,
    name => `The ${name} isn't going anywhere with you. It belongs here. You, on the other hand, are debatable.`,
    name => `You try to take the ${name}, but it's far too heavy, too large, or too attached to where it is. Possibly all three.`,
];

const LOOK_RESPONSES = [
    name => `You study the ${name}. It's exactly what it appears to be: a ${name.toLowerCase()}. Sometimes things are just things.`,
    name => `The ${name} sits there, being a ${name.toLowerCase()}. You've now looked at it. You are no wiser.`,
];

function pickTemplate(templates, name) {
    // Use name's character codes to deterministically pick a template
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return templates[hash % templates.length](name);
}

function processRoom(filePath) {
    const raw = readFileSync(filePath, 'utf8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error(`  SKIP (invalid JSON): ${filePath}`);
        return { modified: false };
    }

    let changes = 0;
    const VERBS = ['look', 'take', 'use', 'talk', 'open', 'push', 'pull'];
    const TEMPLATES = {
        look: LOOK_RESPONSES,
        take: TAKE_RESPONSES,
        use: USE_RESPONSES,
        talk: TALK_RESPONSES,
        open: OPEN_RESPONSES,
        push: PUSH_RESPONSES,
        pull: PULL_RESPONSES,
    };

    // Process hotspots
    if (data.hotspots) {
        for (const hotspot of data.hotspots) {
            if (!hotspot.responses) hotspot.responses = {};
            for (const verb of VERBS) {
                if (!hotspot.responses[verb]) {
                    hotspot.responses[verb] = pickTemplate(TEMPLATES[verb], hotspot.name);
                    changes++;
                }
            }
        }
    }

    // Process items (they also have responses)
    if (data.items) {
        for (const item of data.items) {
            if (!item.responses) item.responses = {};
            for (const verb of VERBS) {
                if (!item.responses[verb]) {
                    item.responses[verb] = pickTemplate(TEMPLATES[verb], item.name);
                    changes++;
                }
            }
        }
    }

    if (changes > 0) {
        writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n');
        console.log(`  ${changes} responses added`);
    } else {
        console.log(`  already complete`);
    }

    return { modified: changes > 0, changes };
}

// Process all room files
const roomFiles = readdirSync(ROOMS_DIR).filter(f => f.endsWith('.json'));
let totalChanges = 0;
let modifiedFiles = 0;

for (const file of roomFiles) {
    console.log(`Processing ${file}...`);
    const result = processRoom(join(ROOMS_DIR, file));
    if (result.modified) {
        totalChanges += result.changes;
        modifiedFiles++;
    }
}

console.log(`\nDone! Added ${totalChanges} responses across ${modifiedFiles} files.`);
