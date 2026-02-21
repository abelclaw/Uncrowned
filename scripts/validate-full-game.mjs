import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Load all rooms
const roomDir = 'public/assets/data/rooms';
const roomFiles = readdirSync(roomDir).filter(f => f.endsWith('.json'));
const rooms = {};
for (const f of roomFiles) {
    const data = JSON.parse(readFileSync(join(roomDir, f), 'utf-8'));
    rooms[data.id] = data;
}
const roomIds = new Set(Object.keys(rooms));

// Load items
const items = JSON.parse(readFileSync('public/assets/data/items.json', 'utf-8')).items;
const itemIds = new Set(items.map(i => i.id));

// Load NPCs
const npcs = JSON.parse(readFileSync('public/assets/data/npcs/npcs.json', 'utf-8')).npcs;
const npcIds = new Set(npcs.map(n => n.id));

// Count stats
let totalDeaths = 0;
let totalPuzzles = 0;
let totalDeathTriggers = 0;

for (const room of Object.values(rooms)) {
    totalDeaths += Object.keys(room.deaths || {}).length;
    totalPuzzles += (room.puzzles || []).length;
    totalDeathTriggers += (room.deathTriggers || []).length;
}

// NPC coverage
const roomNpcs = new Set();
for (const room of Object.values(rooms)) {
    for (const npc of (room.npcs || [])) roomNpcs.add(npc.id);
}
const unusedNpcs = npcs.filter(n => !roomNpcs.has(n.id));

// Reachability (BFS from forest_clearing)
const visited = new Set();
const queue = ['forest_clearing'];
while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const room = rooms[current];
    if (!room) continue;
    for (const exit of (room.exits || [])) {
        if (!visited.has(exit.targetRoom)) queue.push(exit.targetRoom);
    }
}
const unreachable = [...roomIds].filter(id => !visited.has(id));

// Preloader coverage
const preloaderContent = readFileSync('src/game/scenes/Preloader.ts', 'utf-8');
const preloaderRooms = [];
const preloaderDialogues = [];
const roomRegex = /load\.json\('room-([^']+)'/g;
const dialogueRegex = /load\.json\('dialogue-([^']+)'/g;
let match;
while ((match = roomRegex.exec(preloaderContent)) !== null) preloaderRooms.push(match[1]);
while ((match = dialogueRegex.exec(preloaderContent)) !== null) preloaderDialogues.push(match[1]);
const missingFromPreloader = [...roomIds].filter(id => !preloaderRooms.includes(id));
const dialogueFiles = readdirSync('public/assets/data/dialogue').filter(f => f.endsWith('.ink.json'));
const dialogueKeys = dialogueFiles.map(f => f.replace('.ink.json', ''));
const missingDialogueInPreloader = dialogueKeys.filter(k => !preloaderDialogues.includes(k));

console.log('=== FULL GAME VALIDATION ===');
console.log('');
console.log('COUNTS:');
console.log('  Rooms: ' + roomIds.size + ' (target: 30-40)');
console.log('  Items: ' + itemIds.size + ' (target: 25-35)');
console.log('  NPCs:  ' + npcIds.size + ' (target: 10-15)');
console.log('  Deaths: ' + totalDeaths + ' (target: 40-60)');
console.log('  Puzzles: ' + totalPuzzles);
console.log('  Death triggers: ' + totalDeathTriggers);
console.log('');
console.log('REACHABILITY (from forest_clearing):');
console.log('  Reachable: ' + visited.size + '/' + roomIds.size);
if (unreachable.length > 0) console.log('  UNREACHABLE: ' + unreachable.join(', '));
else console.log('  All rooms reachable!');
console.log('');
console.log('NPC COVERAGE:');
console.log('  NPCs in rooms: ' + roomNpcs.size + '/' + npcIds.size);
if (unusedNpcs.length > 0) console.log('  Unused NPCs: ' + unusedNpcs.map(n => n.id).join(', '));
else console.log('  All NPCs used in rooms!');
console.log('');
console.log('PRELOADER COVERAGE:');
console.log('  Room JSONs in Preloader: ' + preloaderRooms.length + '/' + roomIds.size);
if (missingFromPreloader.length > 0) console.log('  Missing rooms: ' + missingFromPreloader.join(', '));
else console.log('  All rooms loaded!');
console.log('  Dialogue files in Preloader: ' + preloaderDialogues.length + '/' + dialogueKeys.length);
if (missingDialogueInPreloader.length > 0) console.log('  Missing dialogues: ' + missingDialogueInPreloader.join(', '));
else console.log('  All dialogues loaded!');
