import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const batch = JSON.parse(readFileSync('scripts/room-data/remaining_rooms.json', 'utf8'));
for (const entry of batch) {
    const filePath = join('scripts/room-data', entry.roomId + '.json');
    let existing = null;
    if (existsSync(filePath)) {
        existing = JSON.parse(readFileSync(filePath, 'utf8'));
    }
    if (existing) {
        if (!existing.overrides) existing.overrides = {};
        for (const [entity, verbs] of Object.entries(entry.overrides || {})) {
            if (!existing.overrides[entity]) existing.overrides[entity] = {};
            Object.assign(existing.overrides[entity], verbs);
        }
        writeFileSync(filePath, JSON.stringify(existing, null, 4));
    } else {
        writeFileSync(filePath, JSON.stringify(entry, null, 4));
    }
    console.log('Wrote: ' + filePath);
}
