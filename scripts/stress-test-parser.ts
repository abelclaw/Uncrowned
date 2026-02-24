/**
 * Stress test for the parser stack (HybridParser = TextParser + CompromiseParser).
 * Tests synonym resolution, fuzzy matching, phrase verbs, and NLP fallback
 * against various room contexts.
 */

import { HybridParser } from '../src/game/llm/HybridParser.ts';
import type { HotspotData, ExitData } from '../src/game/types/RoomData.ts';

const parser = new HybridParser();

// ============================================================
// Room contexts (simplified from real room JSONs)
// ============================================================

const forestClearing: { hotspots: HotspotData[]; exits: ExitData[]; items: Array<{id: string; name: string}> } = {
    hotspots: [
        { id: 'old_tree_stump', name: 'Old Tree Stump', interactionPoint: {x:0,y:0}, responses: { look: 'A weathered stump.' } },
        { id: 'suspicious_beehive', name: 'Suspicious Beehive', interactionPoint: {x:0,y:0}, responses: { look: 'A papery wasp nest.', talk: 'The bees ignore you.' } },
        { id: 'wildflowers', name: 'Wildflowers', interactionPoint: {x:0,y:0}, responses: { look: 'A carpet of wildflowers.' } },
        { id: 'rusty_key', name: 'Rusty Key', interactionPoint: {x:0,y:0}, responses: { look: 'A rusty key glinting.' } },
        { id: 'sturdy_stick', name: 'Sturdy Stick', interactionPoint: {x:0,y:0}, responses: { look: 'A sturdy stick.' } },
    ] as HotspotData[],
    exits: [
        { id: 'to-cave', targetRoom: 'cave_entrance', direction: 'east', label: 'cave', spawnPoint: {x:0,y:0}, hitArea: {x:0,y:0,width:0,height:0} },
    ] as ExitData[],
    items: [],
};

const caveEntrance: { hotspots: HotspotData[]; exits: ExitData[]; items: Array<{id: string; name: string}> } = {
    hotspots: [
        { id: 'dark_cave_mouth', name: 'Dark Cave Mouth', interactionPoint: {x:0,y:0}, responses: { look: 'A dark cave mouth.' } },
        { id: 'heavy_oak_door', name: 'Heavy Oak Door', interactionPoint: {x:0,y:0}, responses: { look: 'A heavy oak door.' } },
        { id: 'rock_ledge', name: 'Rock Ledge', interactionPoint: {x:0,y:0}, responses: { look: 'A rock ledge.' } },
        { id: 'mysterious_bottle', name: 'Mysterious Bottle', interactionPoint: {x:0,y:0}, responses: { look: 'A mysterious bottle.' } },
        { id: 'glowing_mushroom', name: 'Glowing Mushroom', interactionPoint: {x:0,y:0}, responses: { look: 'A glowing mushroom.' } },
    ] as HotspotData[],
    exits: [
        { id: 'to-forest', targetRoom: 'forest_clearing', direction: 'west', label: 'forest', spawnPoint: {x:0,y:0}, hitArea: {x:0,y:0,width:0,height:0} },
        { id: 'to-depths', targetRoom: 'cave_depths', direction: 'down', label: 'depths', spawnPoint: {x:0,y:0}, hitArea: {x:0,y:0,width:0,height:0} },
    ] as ExitData[],
    items: [
        { id: 'rusty-key', name: 'Rusty Key' },
        { id: 'stick', name: 'Sturdy Stick' },
    ],
};

const villageSquare: { hotspots: HotspotData[]; exits: ExitData[]; items: Array<{id: string; name: string}> } = {
    hotspots: [
        { id: 'village_well', name: 'Village Well', interactionPoint: {x:0,y:0}, responses: { look: 'A stone well.' } },
        { id: 'stone_merchant', name: 'Stone Merchant', interactionPoint: {x:0,y:0}, responses: { look: 'A petrified merchant.' } },
        { id: 'notice_board', name: 'Notice Board', interactionPoint: {x:0,y:0}, responses: { look: 'A weathered board.' } },
        { id: 'old_signpost', name: 'Old Signpost', interactionPoint: {x:0,y:0}, responses: { look: 'A crooked signpost.' } },
    ] as HotspotData[],
    exits: [
        { id: 'to-path', targetRoom: 'village_path', direction: 'north', label: 'path', spawnPoint: {x:0,y:0}, hitArea: {x:0,y:0,width:0,height:0} },
        { id: 'to-watchtower', targetRoom: 'old_watchtower', direction: 'east', label: 'watchtower', spawnPoint: {x:0,y:0}, hitArea: {x:0,y:0,width:0,height:0} },
        { id: 'to-bridge', targetRoom: 'forest_bridge', direction: 'west', label: 'bridge', spawnPoint: {x:0,y:0}, hitArea: {x:0,y:0,width:0,height:0} },
    ] as ExitData[],
    items: [
        { id: 'rusty-key', name: 'Rusty Key' },
        { id: 'mushroom', name: 'Glowing Mushroom' },
    ],
};

const forgeChamber: { hotspots: HotspotData[]; exits: ExitData[]; items: Array<{id: string; name: string}> } = {
    hotspots: [
        { id: 'ancient_forge', name: 'Ancient Forge', interactionPoint: {x:0,y:0}, responses: { look: 'An ancient forge.' } },
        { id: 'anvil', name: 'Anvil', interactionPoint: {x:0,y:0}, responses: { look: 'A heavy anvil.' } },
        { id: 'forge_coal', name: 'Forge Coal', interactionPoint: {x:0,y:0}, responses: { look: 'A pile of coal.' } },
        { id: 'bellows', name: 'Bellows', interactionPoint: {x:0,y:0}, responses: { look: 'Leather bellows.' } },
    ] as HotspotData[],
    exits: [
        { id: 'to-hall', targetRoom: 'cavern_entrance_hall', direction: 'north', label: 'hall', spawnPoint: {x:0,y:0}, hitArea: {x:0,y:0,width:0,height:0} },
    ] as ExitData[],
    items: [
        { id: 'chalice', name: 'Ornate Chalice' },
        { id: 'torch', name: 'Makeshift Torch' },
    ],
};

const throneRoom: { hotspots: HotspotData[]; exits: ExitData[]; items: Array<{id: string; name: string}> } = {
    hotspots: [
        { id: 'grand_throne', name: 'Grand Throne', interactionPoint: {x:0,y:0}, responses: { look: 'A grand throne.' } },
        { id: 'ghost_king', name: 'Ghost King', interactionPoint: {x:0,y:0}, responses: { look: 'A spectral king.', talk: 'The ghost speaks.' } },
        { id: 'royal_banner', name: 'Royal Banner', interactionPoint: {x:0,y:0}, responses: { look: 'A faded banner.' } },
        { id: 'red_carpet', name: 'Red Carpet', interactionPoint: {x:0,y:0}, responses: { look: 'A threadbare carpet.' } },
        { id: 'dais', name: 'Dais', interactionPoint: {x:0,y:0}, responses: { look: 'A raised dais.' } },
    ] as HotspotData[],
    exits: [
        { id: 'to-hallway', targetRoom: 'castle_hallway', direction: 'south', label: 'hallway', spawnPoint: {x:0,y:0}, hitArea: {x:0,y:0,width:0,height:0} },
    ] as ExitData[],
    items: [
        { id: 'chalice', name: 'Ornate Chalice' },
        { id: 'kingdom-seal', name: 'Kingdom Seal' },
        { id: 'decree', name: 'Royal Decree' },
    ],
};

// ============================================================
// Test runner
// ============================================================

interface TestCase {
    input: string;
    room: { hotspots: HotspotData[]; exits: ExitData[]; items: Array<{id: string; name: string}> };
    roomName: string;
    expectedVerb?: string;
    expectedSubject?: string;
    expectSuccess: boolean;
    category: string;
}

const tests: TestCase[] = [
    // ── Standard commands (baseline) ──
    { input: 'look', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectSuccess: true, category: 'standard' },
    { input: 'look at stump', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'old_tree_stump', expectSuccess: true, category: 'standard' },
    { input: 'take key', room: forestClearing, roomName: 'forest', expectedVerb: 'take', expectedSubject: 'rusty_key', expectSuccess: true, category: 'standard' },
    { input: 'go east', room: forestClearing, roomName: 'forest', expectedVerb: 'go', expectSuccess: true, category: 'standard' },
    { input: 'use key on door', room: caveEntrance, roomName: 'cave', expectedVerb: 'use', expectedSubject: 'rusty-key', expectSuccess: true, category: 'standard' },
    { input: 'talk to ghost king', room: throneRoom, roomName: 'throne', expectedVerb: 'talk', expectedSubject: 'ghost_king', expectSuccess: true, category: 'standard' },
    { input: 'open door', room: caveEntrance, roomName: 'cave', expectedVerb: 'open', expectedSubject: 'heavy_oak_door', expectSuccess: true, category: 'standard' },

    // ── Synonym tests ──
    { input: 'look at the log', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'old_tree_stump', expectSuccess: true, category: 'synonym' },
    { input: 'look at the hive', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'suspicious_beehive', expectSuccess: true, category: 'synonym' },
    { input: 'grab the twig', room: forestClearing, roomName: 'forest', expectedVerb: 'take', expectedSubject: 'sturdy_stick', expectSuccess: true, category: 'synonym' },
    { input: 'take the lockpick', room: forestClearing, roomName: 'forest', expectedVerb: 'take', expectedSubject: 'rusty_key', expectSuccess: true, category: 'synonym' },
    { input: 'look at the toadstool', room: caveEntrance, roomName: 'cave', expectedVerb: 'look', expectedSubject: 'glowing_mushroom', expectSuccess: true, category: 'synonym' },
    { input: 'examine the flask', room: caveEntrance, roomName: 'cave', expectedVerb: 'look', expectedSubject: 'mysterious_bottle', expectSuccess: true, category: 'synonym' },
    { input: 'take the vial', room: caveEntrance, roomName: 'cave', expectedVerb: 'take', expectedSubject: 'mysterious_bottle', expectSuccess: true, category: 'synonym' },
    { input: 'open the gate', room: caveEntrance, roomName: 'cave', expectedVerb: 'open', expectedSubject: 'heavy_oak_door', expectSuccess: true, category: 'synonym' },
    { input: 'look at the shroom', room: caveEntrance, roomName: 'cave', expectedVerb: 'look', expectedSubject: 'glowing_mushroom', expectSuccess: true, category: 'synonym' },
    { input: 'take the elixir', room: caveEntrance, roomName: 'cave', expectedVerb: 'take', expectedSubject: 'mysterious_bottle', expectSuccess: true, category: 'synonym' },
    { input: 'look at the fountain', room: villageSquare, roomName: 'village', expectedVerb: 'look', expectedSubject: 'village_well', expectSuccess: true, category: 'synonym' },
    { input: 'examine the sign', room: villageSquare, roomName: 'village', expectedVerb: 'look', expectedSubject: 'old_signpost', expectSuccess: true, category: 'synonym' },
    { input: 'look at the smithy', room: forgeChamber, roomName: 'forge', expectedVerb: 'look', expectedSubject: 'ancient_forge', expectSuccess: true, category: 'synonym' },
    { input: 'look at the furnace', room: forgeChamber, roomName: 'forge', expectedVerb: 'look', expectedSubject: 'ancient_forge', expectSuccess: true, category: 'synonym' },
    { input: 'take the goblet', room: forgeChamber, roomName: 'forge', expectedVerb: 'take', expectedSubject: 'chalice', expectSuccess: true, category: 'synonym' },
    { input: 'grab the cup', room: forgeChamber, roomName: 'forge', expectedVerb: 'take', expectedSubject: 'chalice', expectSuccess: true, category: 'synonym' },
    { input: 'take the flame', room: forgeChamber, roomName: 'forge', expectedVerb: 'take', expectedSubject: 'torch', expectSuccess: true, category: 'synonym' },
    { input: 'grab the lantern', room: forgeChamber, roomName: 'forge', expectedVerb: 'take', expectedSubject: 'torch', expectSuccess: true, category: 'synonym' },
    { input: 'look at the ember', room: forgeChamber, roomName: 'forge', expectedVerb: 'look', expectedSubject: 'forge_coal', expectSuccess: true, category: 'synonym' },
    { input: 'look at the charcoal', room: forgeChamber, roomName: 'forge', expectedVerb: 'look', expectedSubject: 'forge_coal', expectSuccess: true, category: 'synonym' },
    { input: 'use goblet on forge', room: forgeChamber, roomName: 'forge', expectedVerb: 'use', expectedSubject: 'chalice', expectSuccess: true, category: 'synonym' },
    { input: 'look at the chair', room: throneRoom, roomName: 'throne', expectedVerb: 'look', expectedSubject: 'grand_throne', expectSuccess: true, category: 'synonym' },
    { input: 'look at the seat', room: throneRoom, roomName: 'throne', expectedVerb: 'look', expectedSubject: 'grand_throne', expectSuccess: true, category: 'synonym' },
    { input: 'examine the flag', room: throneRoom, roomName: 'throne', expectedVerb: 'look', expectedSubject: 'royal_banner', expectSuccess: true, category: 'synonym' },
    { input: 'look at the rug', room: throneRoom, roomName: 'throne', expectedVerb: 'look', expectedSubject: 'red_carpet', expectSuccess: true, category: 'synonym' },
    { input: 'look at the podium', room: throneRoom, roomName: 'throne', expectedVerb: 'look', expectedSubject: 'dais', expectSuccess: true, category: 'synonym' },
    { input: 'look at the stage', room: throneRoom, roomName: 'throne', expectedVerb: 'look', expectedSubject: 'dais', expectSuccess: true, category: 'synonym' },
    { input: 'take the sigil', room: throneRoom, roomName: 'throne', expectedVerb: 'take', expectedSubject: 'kingdom-seal', expectSuccess: true, category: 'synonym' },
    { input: 'take the edict', room: throneRoom, roomName: 'throne', expectedVerb: 'take', expectedSubject: 'decree', expectSuccess: true, category: 'synonym' },
    { input: 'look at the specter', room: throneRoom, roomName: 'throne', expectedVerb: 'look', expectedSubject: 'ghost_king', expectSuccess: true, category: 'synonym' },
    { input: 'talk to the phantom', room: throneRoom, roomName: 'throne', expectedVerb: 'talk', expectedSubject: 'ghost_king', expectSuccess: true, category: 'synonym' },
    // Two-noun with synonyms
    { input: 'use lockpick on gate', room: caveEntrance, roomName: 'cave', expectedVerb: 'use', expectedSubject: 'rusty-key', expectSuccess: true, category: 'synonym-two-noun' },
    { input: 'pour elixir on toadstool', room: caveEntrance, roomName: 'cave', expectedVerb: 'use', expectedSubject: 'mysterious_bottle', expectSuccess: true, category: 'synonym-two-noun' },
    { input: 'give goblet to phantom', room: throneRoom, roomName: 'throne', expectedVerb: 'use', expectedSubject: 'chalice', expectSuccess: true, category: 'synonym-two-noun' },

    // ── Fuzzy/typo tests ──
    { input: 'look at beehve', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'suspicious_beehive', expectSuccess: true, category: 'fuzzy' },
    { input: 'look at stumpp', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'old_tree_stump', expectSuccess: true, category: 'fuzzy' },
    { input: 'look at wildflwoers', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'wildflowers', expectSuccess: true, category: 'fuzzy' },
    { input: 'look at mushrrom', room: caveEntrance, roomName: 'cave', expectedVerb: 'look', expectedSubject: 'glowing_mushroom', expectSuccess: true, category: 'fuzzy' },
    { input: 'look at bottel', room: caveEntrance, roomName: 'cave', expectedVerb: 'look', expectedSubject: 'mysterious_bottle', expectSuccess: true, category: 'fuzzy' },
    { input: 'look at trhone', room: throneRoom, roomName: 'throne', expectedVerb: 'look', expectedSubject: 'grand_throne', expectSuccess: true, category: 'fuzzy' },
    { input: 'look at anvl', room: forgeChamber, roomName: 'forge', expectedVerb: 'look', expectedSubject: 'anvil', expectSuccess: true, category: 'fuzzy' },

    // ── Phrase verb idioms ──
    { input: 'take a look around', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectSuccess: true, category: 'idiom' },
    { input: 'have a look', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectSuccess: true, category: 'idiom' },
    { input: 'take a peek at the stump', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'old_tree_stump', expectSuccess: true, category: 'idiom' },
    { input: 'take a gander at the flowers', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'wildflowers', expectSuccess: true, category: 'idiom' },
    { input: 'have a peek at the door', room: caveEntrance, roomName: 'cave', expectedVerb: 'look', expectedSubject: 'heavy_oak_door', expectSuccess: true, category: 'idiom' },
    { input: 'have a word with the ghost king', room: throneRoom, roomName: 'throne', expectedVerb: 'talk', expectedSubject: 'ghost_king', expectSuccess: true, category: 'idiom' },
    { input: 'pick up the key', room: forestClearing, roomName: 'forest', expectedVerb: 'take', expectedSubject: 'rusty_key', expectSuccess: true, category: 'idiom' },

    // ── NLP fallback (CompromiseParser) ──
    { input: 'I want to steal the flowers', room: forestClearing, roomName: 'forest', expectedVerb: 'take', expectedSubject: 'wildflowers', expectSuccess: true, category: 'nlp' },
    { input: 'steal the key', room: forestClearing, roomName: 'forest', expectedVerb: 'take', expectedSubject: 'rusty_key', expectSuccess: true, category: 'nlp' },
    { input: 'smash the door', room: caveEntrance, roomName: 'cave', expectedVerb: 'open', expectedSubject: 'heavy_oak_door', expectSuccess: true, category: 'nlp' },
    { input: 'chat with the king', room: throneRoom, roomName: 'throne', expectedVerb: 'talk', expectedSubject: 'ghost_king', expectSuccess: true, category: 'nlp' },
    { input: 'flee south', room: throneRoom, roomName: 'throne', expectedVerb: 'go', expectSuccess: true, category: 'nlp' },
    { input: 'destroy the banner', room: throneRoom, roomName: 'throne', expectedVerb: 'use', expectedSubject: 'royal_banner', expectSuccess: true, category: 'nlp' },

    // ── Edge cases ──
    { input: '', room: forestClearing, roomName: 'forest', expectSuccess: false, category: 'edge' },
    { input: 'asdfghjkl', room: forestClearing, roomName: 'forest', expectSuccess: false, category: 'edge' },
    { input: 'look at the', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectSuccess: true, category: 'edge' },
    { input: 'take', room: forestClearing, roomName: 'forest', expectedVerb: 'take', expectSuccess: true, category: 'edge' },
    { input: 'n', room: villageSquare, roomName: 'village', expectedVerb: 'go', expectSuccess: true, category: 'edge' },
    { input: 'e', room: villageSquare, roomName: 'village', expectedVerb: 'go', expectSuccess: true, category: 'edge' },
    { input: 'LOOK AT STUMP', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'old_tree_stump', expectSuccess: true, category: 'edge' },
    { input: '  look   at   stump  ', room: forestClearing, roomName: 'forest', expectedVerb: 'look', expectedSubject: 'old_tree_stump', expectSuccess: true, category: 'edge' },
];

// ============================================================
// Run tests
// ============================================================

let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const t of tests) {
    const result = parser.parse(t.input, t.room.hotspots, t.room.exits, t.room.items);

    let ok = true;
    const issues: string[] = [];

    // Check success
    if (result.success !== t.expectSuccess) {
        ok = false;
        issues.push(`success: got ${result.success}, want ${t.expectSuccess}`);
    }

    // Check verb
    if (t.expectedVerb && result.action?.verb !== t.expectedVerb) {
        ok = false;
        issues.push(`verb: got "${result.action?.verb}", want "${t.expectedVerb}"`);
    }

    // Check subject
    if (t.expectedSubject && result.action?.subject !== t.expectedSubject) {
        ok = false;
        issues.push(`subject: got "${result.action?.subject}", want "${t.expectedSubject}"`);
    }

    if (ok) {
        pass++;
    } else {
        fail++;
        const verb = result.action?.verb ?? 'none';
        const subj = result.action?.subject ?? 'null';
        failures.push(`  FAIL [${t.category}] "${t.input}" in ${t.roomName}: ${issues.join(', ')}  (got verb="${verb}" subj="${subj}")`);
    }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`PARSER STRESS TEST RESULTS`);
console.log(`${'='.repeat(60)}`);
console.log(`Total: ${tests.length} | Pass: ${pass} | Fail: ${fail}`);
console.log(`Pass rate: ${((pass / tests.length) * 100).toFixed(1)}%`);

if (failures.length > 0) {
    console.log(`\nFailures:`);
    for (const f of failures) {
        console.log(f);
    }
}

// Category breakdown
const categories = new Map<string, { pass: number; fail: number }>();
for (const t of tests) {
    if (!categories.has(t.category)) categories.set(t.category, { pass: 0, fail: 0 });
    const result = parser.parse(t.input, t.room.hotspots, t.room.exits, t.room.items);
    let ok = true;
    if (result.success !== t.expectSuccess) ok = false;
    if (t.expectedVerb && result.action?.verb !== t.expectedVerb) ok = false;
    if (t.expectedSubject && result.action?.subject !== t.expectedSubject) ok = false;
    if (ok) categories.get(t.category)!.pass++; else categories.get(t.category)!.fail++;
}

console.log(`\nBy category:`);
for (const [cat, stats] of categories) {
    const total = stats.pass + stats.fail;
    const pct = ((stats.pass / total) * 100).toFixed(0);
    const status = stats.fail === 0 ? '✓' : '✗';
    console.log(`  ${status} ${cat}: ${stats.pass}/${total} (${pct}%)`);
}
