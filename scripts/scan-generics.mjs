import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'public/assets/data/rooms';
const patterns = [
  /not entirely sure how to use/i,
  /fiddle with .+ for a moment/i,
  /search .+ for a way to open/i,
  /It has no hinges, no latch/i,
  /not a great conversationalist/i,
  /maintains its silence/i,
  /with all your might\. All your might/i,
  /too heavy, too large, or too attached/i,
  /in a calm, measured tone/i,
  /doesn't open/i,
  /isn't something you can open/i,
  /not something you can push/i,
  /not something you can pull/i,
  /brace yourself and push/i,
  /brace yourself and pull/i,
  /grip .+ and pull/i,
  /you push .+ with determination/i,
  /lean against .+ and push/i,
  /grab .+ and pull/i,
  /wrap your fingers around/i,
  /whatever its purpose, you haven't figured it out/i
];

let total = 0;
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
for (const file of files) {
  const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const entities = [...(data.hotspots || []), ...(data.items || []), ...(data.npcs || [])];
  for (const ent of entities) {
    if (!ent.responses) continue;
    for (const [verb, text] of Object.entries(ent.responses)) {
      for (const pat of patterns) {
        if (pat.test(text)) {
          total++;
          console.log(`${file} | ${ent.id}.${verb} -> ${pat.source.substring(0, 40)}`);
          break;
        }
      }
    }
  }
}
console.log(`\nTotal remaining: ${total}`);
