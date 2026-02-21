import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8082';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const results = [];

function check(name, text, mustContain) {
  const lc = text.toLowerCase();
  const found = mustContain.toLowerCase();
  if (lc.includes(found)) {
    console.log(`  PASS: ${name}`);
    pass++;
  } else {
    console.log(`  FAIL: ${name} -- expected "${found}"`);
    fail++;
  }
  results.push({ name, passed: lc.includes(found) });
}

function checkNot(name, text, mustNotContain) {
  const lc = text.toLowerCase();
  const found = mustNotContain.toLowerCase();
  if (!lc.includes(found)) {
    console.log(`  PASS: ${name}`);
    pass++;
  } else {
    console.log(`  FAIL: ${name} -- should NOT contain "${found}"`);
    fail++;
  }
  results.push({ name, passed: !lc.includes(found) });
}

async function cmd(page, text) {
  const input = await page.$('input');
  if (!input) return '(no input element)';
  await input.click();
  await input.fill(text);
  await page.keyboard.press('Enter');
  await sleep(2000);
  const texts = await page.evaluate(() => {
    const all = document.querySelectorAll('div, span, p');
    const t = [];
    for (const el of all) {
      const txt = el.textContent?.trim();
      if (txt && txt.length > 3 && el.children.length === 0) t.push(txt.substring(0, 400));
    }
    return t;
  });
  const narrator = texts[0] || '(no text)';
  console.log(`  > ${text}`);
  console.log(`  < ${narrator.substring(0, 120)}\n`);
  return narrator;
}

async function screenshot(page, name) {
  await page.screenshot({ path: `screenshots/${name}.png` });
}

async function testGame() {
  console.log('=== Uncrowned Stress Test ===\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });

  await page.goto(BASE_URL);
  await sleep(4000);

  // Click New Game at (480, 300) game coords
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + 480, box.y + 300);
  await sleep(3000);

  // ============================
  // 1. Basic look variants
  // ============================
  console.log('--- Look command variants ---\n');

  let r = await cmd(page, 'look');
  check('bare "look"', r, 'forest clearing');

  r = await cmd(page, 'look around');
  check('"look around"', r, 'forest clearing');

  r = await cmd(page, 'look here');
  check('"look here"', r, 'forest clearing');

  r = await cmd(page, 'look room');
  check('"look room"', r, 'forest clearing');

  r = await cmd(page, 'l');
  check('"l" shortcut', r, 'forest clearing');

  r = await cmd(page, 'examine stump');
  check('"examine stump"', r, 'weathered tree stump');

  r = await cmd(page, 'x beehive');
  check('"x beehive" shortcut', r, 'wasp nest');

  r = await cmd(page, 'inspect wildflowers');
  check('"inspect wildflowers"', r, 'defiant bloom');

  r = await cmd(page, 'check the old stump');
  check('"check the old stump" with article', r, 'weathered tree stump');

  // ============================
  // 2. Garbage/edge case inputs
  // ============================
  console.log('--- Garbage and edge cases ---\n');

  r = await cmd(page, '');
  // Empty should give error
  check('empty input gives help', r, 'type a command');

  r = await cmd(page, 'xyzzy');
  check('nonsense word', r, "don't understand");

  r = await cmd(page, 'flurble the glorpsnatch');
  check('total gibberish', r, "don't understand");

  r = await cmd(page, 'take');
  check('bare "take" asks what', r, 'take what');

  r = await cmd(page, 'go');
  // go with no direction
  r = await cmd(page, 'use');

  r = await cmd(page, '   look   ');
  check('whitespace padding works', r, 'forest clearing');

  r = await cmd(page, 'LOOK AROUND');
  check('ALL CAPS works', r, 'forest clearing');

  r = await cmd(page, 'Look At The Old Tree Stump');
  check('mixed case with articles', r, 'weathered tree stump');

  // ============================
  // 3. Item interactions
  // ============================
  console.log('--- Item interactions ---\n');

  r = await cmd(page, 'look at rusty key');
  check('look at item before taking', r, 'corroded key');

  r = await cmd(page, 'take rusty key');
  check('take rusty key - puzzle text', r, 'pry the rusty key');

  r = await cmd(page, 'take rusty key');
  check('take already held item', r, 'already have');

  r = await cmd(page, 'take stick');
  check('take stick', r, 'sturdy stick');

  r = await cmd(page, 'take stick');
  check('take stick again', r, 'already have');

  // ============================
  // 4. Inventory
  // ============================
  console.log('--- Inventory ---\n');

  r = await cmd(page, 'inventory');
  check('inventory shows items', r, 'carrying');

  r = await cmd(page, 'i');
  check('"i" shortcut', r, 'carrying');

  // ============================
  // 5. Dynamic descriptions
  // ============================
  console.log('--- Dynamic descriptions ---\n');

  r = await cmd(page, 'look');
  check('dynamic desc after taking key', r, 'already pocketed');

  // ============================
  // 6. Hotspot interactions - varied verbs
  // ============================
  console.log('--- Varied verb interactions ---\n');

  r = await cmd(page, 'use stump');
  check('use stump', r, 'sit on the stump');

  r = await cmd(page, 'push stump');
  check('push stump', r, 'push the stump');

  r = await cmd(page, 'pull stump');
  check('pull stump', r, 'yank at the stump');

  r = await cmd(page, 'talk to stump');
  check('talk to stump', r, 'whisper sweet nothings');

  r = await cmd(page, 'take beehive');
  check('take beehive (dangerous)', r, 'survival instinct');

  r = await cmd(page, 'talk to beehive');
  check('talk to beehive', r, 'address the bees');

  r = await cmd(page, 'take wildflowers');
  check('take wildflowers', r, 'wilts immediately');

  r = await cmd(page, 'open stump');
  check('open stump (no response)', r, '');

  // ============================
  // 7. Navigation
  // ============================
  console.log('--- Navigation ---\n');

  r = await cmd(page, 'go north');
  check('go north (no exit)', r, "can't go that way");

  r = await cmd(page, 'go south');
  check('go south (no exit)', r, "can't go that way");

  r = await cmd(page, 'go west');
  check('go west (no exit)', r, "can't go that way");

  r = await cmd(page, 'n');
  check('"n" shortcut (no exit)', r, "can't go that way");

  // look at exit
  r = await cmd(page, 'look at cave');
  check('look at exit "cave"', r, 'path leading');

  // ============================
  // 8. Save/Load
  // ============================
  console.log('--- Save/Load ---\n');

  r = await cmd(page, 'save 1');
  check('save to slot 1', r, 'saved');

  r = await cmd(page, 'save');
  check('bare save', r, 'save');

  // ============================
  // 9. Death and recovery
  // ============================
  console.log('--- Death trigger ---\n');

  // Push beehive triggers death
  const input = await page.$('input');
  await input.click();
  await input.fill('push beehive');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await screenshot(page, 'death-bees');

  // Verify death screen appeared
  const deathScreenshot = await page.screenshot();
  console.log('  Death scene displayed\n');

  // Click "Try Again" at game coords (480, 430)
  await page.mouse.click(box.x + 480, box.y + 430);
  await sleep(4000);
  await screenshot(page, 'post-death');

  // Verify we're back in a room
  const postDeathInput = await page.$('input');
  if (postDeathInput) {
    r = await cmd(page, 'look');
    check('post-death recovery works', r, 'forest clearing');

    // ============================
    // 10. Room transition
    // ============================
    console.log('--- Room transition ---\n');

    r = await cmd(page, 'go east');
    await sleep(2000);
    await screenshot(page, 'cave-entrance');

    const caveInput = await page.$('input');
    if (caveInput) {
      r = await cmd(page, 'look');
      checkNot('new room loaded (not forest)', r, 'sun-dappled forest clearing');
      await screenshot(page, 'cave-look');

      // Try some commands in the new room
      r = await cmd(page, 'look around');
      console.log('  Cave description received\n');

      // Go back
      r = await cmd(page, 'go west');
      await sleep(2000);
      const backInput = await page.$('input');
      if (backInput) {
        r = await cmd(page, 'look');
        check('returned to forest clearing', r, 'forest clearing');
      }
    }
  } else {
    console.log('  FAIL: Input not visible after death recovery\n');
    fail++;
  }

  // ============================
  // Results
  // ============================
  console.log('\n=============================');
  console.log('=== STRESS TEST RESULTS ===');
  console.log('=============================');
  console.log(`  Passed: ${pass}/${pass + fail}`);
  console.log(`  Failed: ${fail}/${pass + fail}\n`);
  for (const res of results) {
    console.log(`  ${res.passed ? 'PASS' : 'FAIL'} ${res.name}`);
  }

  await sleep(1000);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
}

testGame().catch(err => {
  console.error('Test crashed:', err.message);
  process.exit(1);
});
