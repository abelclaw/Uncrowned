import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = join(import.meta.dirname, '..', 'public', 'assets', 'data', 'rooms');
const files = readdirSync(dir).filter(f => f.endsWith('.json'));
const verbs = ['look', 'take', 'use', 'talk', 'open', 'push', 'pull'];
let errors = 0;
let totalHotspots = 0;

for (const f of files) {
    try {
        const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
        const entities = [...(data.hotspots || []), ...(data.items || [])];
        for (const h of entities) {
            totalHotspots++;
            if (!h.responses) {
                console.log(f + ': ' + h.id + ' has NO responses object');
                errors++;
                continue;
            }
            const missing = verbs.filter(v => !h.responses[v]);
            if (missing.length > 0) {
                console.log(f + ': ' + h.id + ' missing: ' + missing.join(', '));
                errors++;
            }
        }
    } catch (e) {
        console.error(f + ': INVALID JSON - ' + e.message);
        errors++;
    }
}

console.log('\nValidated ' + files.length + ' files with ' + totalHotspots + ' hotspots/items.');
console.log('Issues found: ' + errors);
