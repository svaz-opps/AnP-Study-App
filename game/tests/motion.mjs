// Motion levels: full / soft / calm (see ANIMATION_NOTES.md). Run: node game/tests/motion.mjs
//  - "Auto" follows the device: Reduce Motion off -> full, on -> soft (screens crossfade, the nurse still walks)
//  - "Full" stays full even with the device's Reduce Motion on
//  - "Calm" holds things still (the nurse doesn't walk)
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const file = 'file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist/ward-rounds.html');
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg); };

const browser = await chromium.launch();
async function open(reducedMotion, motion) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, reducedMotion });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(file);
  await page.waitForSelector('.onboard');
  for (const t of ['1', '2', '3', '4', '5']) await page.click(`[data-to="${t}"]`);
  await page.waitForSelector('.chart .opt');
  await page.evaluate((m) => { window.WR.state.settings.motion = m; window.WR.applySettings(); }, motion);
  await page.evaluate(() => window.WR.App.show('floor'));
  await page.waitForSelector('#walker');
  await page.waitForTimeout(500);
  return { page, errors };
}
const level = (page) => page.evaluate(() => document.documentElement.dataset.motion);
const screenAnim = (page) => page.evaluate(() => getComputedStyle(document.querySelector('.screen')).animationName);
// tap the far room and see whether the nurse has moved a while later
async function walks(page) {
  const x0 = await page.evaluate(() => document.getElementById('walker').getBoundingClientRect().left);
  await page.evaluate(() => document.querySelectorAll('.rooms-top .room')[5].click());
  await page.waitForTimeout(600);
  const x1 = await page.evaluate(() => document.getElementById('walker')?.getBoundingClientRect().left ?? null);
  return x1 !== null && Math.abs(x1 - x0) > 40;
}

for (const [rm, motion, want, wantAnim, wantWalk] of [
  ['no-preference', 'auto', 'full', 'screen-in', true],
  ['reduce', 'auto', 'soft', 'fade-in', true],
  ['reduce', 'full', 'full', 'screen-in', true],
  ['no-preference', 'reduced', 'calm', 'none', false],
]) {
  console.log(`device reduce=${rm}, setting=${motion}`);
  const { page, errors } = await open(rm, motion);
  check(await level(page) === want, `level is ${want} (got ${await level(page)})`);
  check(await screenAnim(page) === wantAnim, `screen animation is ${wantAnim} (got ${await screenAnim(page)})`);
  check(await walks(page) === wantWalk, wantWalk ? 'the nurse walks to the room' : 'the nurse does not walk');
  check(!errors.length, 'no page errors ' + errors.join('; '));
  await page.close();
}
await browser.close();
console.log(failures ? `${failures} failure(s)` : 'all motion checks passed');
process.exit(failures ? 1 : 0);
