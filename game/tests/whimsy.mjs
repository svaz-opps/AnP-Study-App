// Silly patient reactions, shift events, daily challenge, thank-you cards. Run: node game/tests/whimsy.mjs
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = 'file://' + path.resolve(here, '../dist/ward-rounds.html');

let failures = 0;
const fail = (msg) => { failures++; console.log('  FAIL ' + msg); };
const ok = (msg) => console.log('  ok   ' + msg);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(file);
await page.waitForSelector('.onboard');
await page.evaluate(() => { WR.state.profile.onboarded = true; WR.state.settings.motion = 'full'; WR.state.settings.sound = false; });

const startShift = (unit = 'ch7') => page.evaluate((unit) => {
  const { App, Run, Engine } = WR;
  App.run = new Run('shift', { unit, queue: Engine.pickShift(unit, 10) });
  App.run.next(); App.show('chart');
}, unit);

// answer the current question right or wrong (fully wrong, so it counts as a miss)
const answer = (wantRight) => page.evaluate((wantRight) => {
  const run = WR.App.run, q = run.q;
  let ans;
  if (q.type === 'order') ans = wantRight ? [...q.steps.keys()] : [...q.steps.keys()].reverse();
  else if (q.type === 'sata') ans = q.opts.map((o, i) => i).filter((i) => (wantRight ? q.opts[i].c : !q.opts[i].c));
  else ans = q.opts.findIndex((o) => (wantRight ? o.c : !o.c));
  run.cur.sel = Array.isArray(ans) ? ans : [ans];
  const res = run.submit();
  WR.Screens.chart.afterSubmit(res);
  const bed = document.getElementById('bed');
  return { correct: res.correct, frac: res.frac, cls: bed ? bed.className : '', wh: run.cur.wh || null, lives: run.lives };
}, wantRight);
const next = () => page.evaluate(() => WR.Screens.chart.advance());
const tierOf = (id) => page.evaluate((id) => (window.WHIMSY_LIST.find((w) => w.id === id) || {}).tier, id);

// ----- streak tiers
console.log('== whimsy tiers');
await startShift();
for (const [streakBefore, want] of [[2, 1], [5, 2], [9, 3], [14, 4], [0, 0]]) {
  await page.evaluate((s) => { WR.App.run.streak = s; WR.App.run.lives = 3; }, streakBefore);
  const r = await answer(true);
  const t = r.wh ? await tierOf(r.wh) : 0;
  if (t !== want) fail(`streak ${streakBefore + 1}: wanted tier ${want}, got ${r.wh} (tier ${t})`); else ok(`streak ${streakBefore + 1} -> tier ${want}${r.wh ? ' (' + r.wh + ')' : ''}`);
  if (want && !/\bwh\b/.test(r.cls)) fail(`streak ${streakBefore + 1}: #bed has no wh class (${r.cls})`);
  if (!(await page.evaluate(() => WR.App.run.over))) await next();
  if (await page.evaluate(() => WR.App.name !== 'chart')) await startShift();
}
// classes clear on their own
await page.evaluate(() => { WR.App.run.streak = 9; WR.App.run.lives = 3; });
await answer(true);
await page.waitForTimeout(1700);
const left = await page.evaluate(() => document.getElementById('bed').className);
if (/\bwh/.test(left)) fail('reaction classes still on #bed after 1.7 s: ' + left); else ok('reaction clears itself');
await next();

// ----- chaos levels
console.log('== chaos levels');
await startShift();
for (const want of [1, 2, 3]) {
  await page.evaluate(() => { WR.App.run.lives = 3; });
  const r = await answer(false);
  const t = r.wh ? await tierOf(r.wh) : 0;
  if (t !== want) fail(`miss ${want} in a row: wanted chaos ${want}, got ${r.wh} (${t})`); else ok(`miss ${want} in a row -> chaos ${want} (${r.wh})`);
  await page.evaluate(() => { WR.App.run.lives = 3; });
  await next();
}

// ----- settings: mild caps, off disables
console.log('== settings');
await page.evaluate(() => { WR.state.settings.whimsy = 'mild'; });
await startShift();
await page.evaluate(() => { WR.App.run.streak = 14; });
let r = await answer(true);
if ((await tierOf(r.wh)) !== 2) fail('mild should cap a 15 streak at tier 2, got ' + r.wh); else ok('mild caps at tier 2');
await next();
await page.evaluate(() => { WR.state.settings.whimsy = 'off'; WR.App.run.streak = 9; });
r = await answer(true);
if (r.wh || /\bwh\b/.test(r.cls)) fail('whimsy off still reacted: ' + r.wh); else ok('off: no reaction');
await next();
await page.evaluate(() => { WR.state.settings.whimsy = 'full'; WR.state.settings.motion = 'reduced'; WR.App.run.streak = 9; WR.App.run.lives = 3; });
r = await answer(true);
const anims = await page.evaluate(() => document.getElementById('bed').getAnimations({ subtree: true }).length);
if (!r.wh) fail('reduced motion should still show a pose');
else if (anims) fail(`reduced motion: ${anims} animations running on #bed`); else ok('reduced motion: pose only, no animation');
await page.evaluate(() => { WR.state.settings.motion = 'full'; });
await next();

// exam mode: never
await page.evaluate(() => { const { App, Run, Engine } = WR; App.run = new Run('exam', { queue: Engine.pickExam(50) }); App.run.next(); App.show('chart'); App.run.streak = 9; });
r = await answer(true);
if (r.wh) fail('exam mode reacted'); else ok('exam mode: no reaction');

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 1) fail('horizontal overflow ' + overflow);

if (errors.length) fail('page errors: ' + errors.join(' | '));
await browser.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall whimsy checks passed');
process.exit(failures ? 1 : 0);
