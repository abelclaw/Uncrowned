import { Compiler } from 'inkjs/compiler/Compiler';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const sourceDir = 'public/assets/data/ink-source';
const outDir = 'public/assets/data/dialogue';

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const inkFiles = readdirSync(sourceDir).filter(f => f.endsWith('.ink'));
let hasErrors = false;

for (const file of inkFiles) {
  console.log(`Compiling ${file}...`);
  const source = readFileSync(join(sourceDir, file), 'utf-8');
  const errors = [];
  const compiler = new Compiler(source, {
    errorHandler: (message, type) => {
      const label = type === 2 ? 'ERROR' : type === 1 ? 'WARNING' : 'INFO';
      console.error(`  [${label}] ${message}`);
      if (type === 2) errors.push(message);
    }
  });
  try {
    const story = compiler.Compile();
    if (!story || errors.length > 0) {
      console.error(`Failed to compile ${file} (${errors.length} errors)`);
      hasErrors = true;
      continue;
    }
    const json = story.ToJson();
    const outName = basename(file, '.ink') + '.ink.json';
    writeFileSync(join(outDir, outName), json);
    console.log(`Compiled ${file} -> ${outName}`);
  } catch (e) {
    console.error(`Failed to compile ${file}: ${e.message}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}
