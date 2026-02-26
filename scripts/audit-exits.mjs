import fs from 'fs';
import path from 'path';

const dir = 'public/assets/data/rooms';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const graph = {};

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const id = data.id;
  graph[id] = (data.exits || []).map(e => ({
    exitId: e.id,
    dir: e.direction || 'NON-DIR',
    target: e.targetRoom,
    cond: e.conditions ? e.conditions.map(c => c.type + ':' + (c.flag || c.item || '')).join('+') : '',
    label: e.label || ''
  }));
}

// Print all rooms and their exits
for (const [room, exits] of Object.entries(graph).sort()) {
  console.log(room + ':');
  if (exits.length === 0) { console.log('  (no exits)'); continue; }
  for (const e of exits) {
    const condStr = e.cond ? ' [' + e.cond + ']' : '';
    console.log('  ' + e.dir.padEnd(8) + ' -> ' + e.target + ' (' + e.label + ')' + condStr);
  }
  // Check for duplicate directions
  const dirs = exits.filter(e => e.dir !== 'NON-DIR').map(e => e.dir);
  const seen = new Set();
  const dupes = [];
  for (const d of dirs) {
    if (seen.has(d)) dupes.push(d);
    seen.add(d);
  }
  if (dupes.length > 0) console.log('  ** DUPLICATE DIRECTIONS: ' + dupes.join(', '));
}

console.log('\n--- ONE-WAY CHECK ---');
for (const [room, exits] of Object.entries(graph)) {
  for (const e of exits) {
    const targetExits = graph[e.target];
    if (!targetExits) { console.log('MISSING ROOM: ' + e.target + ' (from ' + room + ')'); continue; }
    const hasReturn = targetExits.some(te => te.target === room);
    if (!hasReturn) console.log('ONE-WAY: ' + room + ' -> ' + e.target + ' (no return to ' + room + ')');
  }
}

console.log('\n--- DEAD ENDS (1 exit) ---');
for (const [room, exits] of Object.entries(graph).sort()) {
  if (exits.length === 1) console.log(room + ' (1 exit: ' + exits[0].dir + ' -> ' + exits[0].target + ')');
}
