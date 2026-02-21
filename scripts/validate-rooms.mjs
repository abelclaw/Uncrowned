import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const items = JSON.parse(readFileSync('public/assets/data/items.json', 'utf-8')).items;
const itemIds = new Set(items.map(i => i.id));

const roomDir = 'public/assets/data/rooms';
const roomFiles = readdirSync(roomDir).filter(f => f.endsWith('.json'));
const rooms = {};
for (const f of roomFiles) {
  const data = JSON.parse(readFileSync(join(roomDir, f), 'utf-8'));
  rooms[data.id] = data;
}
const roomIds = new Set(Object.keys(rooms));

let errors = [];

// Check 1: Every item in room items[] exists in items.json
for (const [rid, room] of Object.entries(rooms)) {
  if (room.items) {
    for (const item of room.items) {
      if (!itemIds.has(item.id)) {
        errors.push(`Room ${rid} references item ${item.id} not in items.json`);
      }
    }
  }
}

// Check 2: Every exit targetRoom references a valid room
for (const [rid, room] of Object.entries(rooms)) {
  for (const exit of room.exits) {
    if (!roomIds.has(exit.targetRoom)) {
      errors.push(`Room ${rid} exit ${exit.id} targets non-existent room ${exit.targetRoom}`);
    }
  }
}

// Check 3: Every deathTrigger references a deathId in deaths
for (const [rid, room] of Object.entries(rooms)) {
  if (room.deathTriggers) {
    for (const dt of room.deathTriggers) {
      for (const action of dt.actions) {
        if (action.type === 'trigger-death') {
          if (!room.deaths || !room.deaths[action.deathId]) {
            errors.push(`Room ${rid} death trigger ${dt.id} references non-existent death ${action.deathId}`);
          }
        }
      }
    }
  }
}

// Check 4: Count puzzles, deaths, items
let puzzleCount = 0;
let deathCount = 0;
let deathTriggerCount = 0;
for (const room of Object.values(rooms)) {
  puzzleCount += (room.puzzles || []).length;
  deathTriggerCount += (room.deathTriggers || []).length;
  deathCount += Object.keys(room.deaths || {}).length;
}

if (errors.length === 0) {
  console.log('ALL CROSS-REFERENCE CHECKS PASSED');
} else {
  console.log('ERRORS FOUND:');
  errors.forEach(e => console.log(`  ${e}`));
}

console.log(`Rooms: ${roomIds.size} (${[...roomIds].join(', ')})`);
console.log(`Items in registry: ${itemIds.size}`);
console.log(`Total puzzles: ${puzzleCount}`);
console.log(`Total death triggers: ${deathTriggerCount}`);
console.log(`Total death definitions: ${deathCount}`);

if (errors.length > 0) process.exit(1);
