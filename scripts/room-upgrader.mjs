/**
 * Generic room upgrade applicator
 * Usage: node scripts/room-upgrader.mjs scripts/room-data/room1.json [room2.json ...]
 * Or:    node scripts/room-upgrader.mjs scripts/room-data/*.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const roomsDir = join(import.meta.dirname, '..', 'public', 'assets', 'data', 'rooms');

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
    /It is what it is/i, /You, on the other hand, are debatable/i,
    /not designed to move/i, /nothing happens when you/i
];

function isGeneric(text) { return GENERIC.some(p => p.test(text)); }

function findEntity(data, entityId) {
    for (const arr of [data.hotspots, data.items, data.npcs]) {
        if (!arr) continue;
        const e = arr.find(x => x.id === entityId);
        if (e) return e;
    }
    return null;
}

let totalOverrides = 0;
let totalHotspots = 0;

for (const file of process.argv.slice(2)) {
    const { roomId, overrides, newHotspots } = JSON.parse(readFileSync(file, 'utf8'));
    const roomPath = join(roomsDir, roomId + '.json');
    const data = JSON.parse(readFileSync(roomPath, 'utf8'));

    let overrideCount = 0;
    if (overrides) {
        for (const [id, responses] of Object.entries(overrides)) {
            const e = findEntity(data, id);
            if (!e) { console.log(`  WARN: ${id} not found in ${roomId}`); continue; }
            if (!e.responses) e.responses = {};
            for (const [verb, text] of Object.entries(responses)) {
                if (!e.responses[verb] || isGeneric(e.responses[verb])) {
                    e.responses[verb] = text;
                    overrideCount++;
                }
            }
        }
    }

    let hotspotCount = 0;
    if (newHotspots) {
        if (!data.hotspots) data.hotspots = [];
        for (const hs of newHotspots) {
            if (data.hotspots.some(h => h.id === hs.id)) {
                console.log(`  SKIP existing hotspot: ${hs.id} in ${roomId}`);
                continue;
            }
            data.hotspots.push(hs);
            hotspotCount++;
        }
    }

    writeFileSync(roomPath, JSON.stringify(data, null, 4) + '\n');
    console.log(`${roomId}: ${overrideCount} responses upgraded, ${hotspotCount} hotspots added`);
    totalOverrides += overrideCount;
    totalHotspots += hotspotCount;
}

console.log(`\nTotal: ${totalOverrides} responses upgraded, ${totalHotspots} hotspots added`);
