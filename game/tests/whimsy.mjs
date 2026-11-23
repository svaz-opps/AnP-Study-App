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

// ----- shift events
console.log('== shift events');
const evRun = (type) => page.evaluate((type) => {
  const { App, Run, Engine } = WR;
  App.run = new Run('shift', { unit: 'ch7', queue: Engine.pickShift('ch7', 10), event: type });
  App.run.next(); App.show('chart');
  const e = App.run.event;
  return e && { type: e.type, qids: e.qids, units: e.qids.map((id) => WR.Content.byId[id].unit), n: App.run.queue.length };
}, type);
// play up to the event's questions, answering right; then answer the event ones as asked
async function playEvent(plan) {
  const got = [];
  for (let guard = 0; guard < 20; guard++) {
    const inEv = await page.evaluate(() => !!WR.App.run.evNow());
    if (inEv) {
      const want = plan[got.length];
      const before = await page.evaluate(() => ({ lives: WR.App.run.lives, rapid: { ...WR.state.rapid } }));
      const r = await answer(want);
      const c = await page.evaluate(() => ({ bonus: WR.App.run.cur.pts.bonus, ev: WR.App.run.cur.ev, banner: true }));
      got.push({ ...r, ...c, livesBefore: before.lives, rapidBefore: before.rapid });
      if (got.length === plan.length) return got;
    } else {
      await page.evaluate(() => { WR.App.run.lives = 3; });
      await answer(true);
    }
    await next();
  }
  return got;
}
let e = await evRun('rapid');
if (!e || e.qids.length !== 2) fail('rapid: no event ' + JSON.stringify(e));
else {
  if (e.units.includes('ch7') || e.units[0] === e.units[1]) fail('rapid: picks must come from 2 different OTHER rooms: ' + e.units); else ok(`rapid: picks from ${e.units.join(' + ')}, not ch7`);
  if (e.n !== 12) fail('rapid: queue should grow to 12, got ' + e.n); else ok('rapid: shift grows to 12');
  const saved = await page.evaluate(() => JSON.stringify(WR.Run.restore(WR.App.run.serialize()).event) === JSON.stringify(WR.App.run.event));
  if (!saved) fail('rapid: event lost in serialize/restore'); else ok('rapid: event survives autosave');
  const res = await playEvent([false, true]);
  if (res.length !== 2) fail('rapid: never reached the event questions');
  else {
    if (res[0].lives !== res[0].livesBefore) fail('rapid: a miss cost a life'); else ok('rapid: a miss costs no life');
    if (res[1].bonus !== 2) fail('rapid: right answer bonus should be 2, got ' + res[1].bonus); else ok('rapid: ×2 points');
    const ra = await page.evaluate(() => WR.state.rapid);
    if (ra.n !== res[0].rapidBefore.n + 2 || ra.r !== res[0].rapidBefore.r + 1) fail('rapid: state.rapid not updated ' + JSON.stringify(ra)); else ok('rapid: cross-room recall stat updated');
  }
}
e = await evRun('outage');
if (!e || e.qids.length !== 3) fail('outage: no event');
else {
  const res = await playEvent([true]);
  if (!res.length || res[0].bonus !== 1.5) fail('outage: bonus should be 1.5'); else ok('outage: ×1.5 points');
  const dark = await page.evaluate(() => !!document.querySelector('.outage-dark'));
  if (!dark) fail('outage: no dark overlay'); else ok('outage: bedside goes dark');
}
e = await evRun('visitor');
if (!e || e.qids.length !== 1) fail('visitor: no event');
else {
  const res = await playEvent([false]);
  if (!res.length || res[0].lives !== res[0].livesBefore) fail('visitor: a miss cost a life'); else ok('visitor: a miss costs no life');
}
const none = await page.evaluate(() => { const r = new WR.Run('shift', { unit: 'ch1', queue: WR.Engine.pickShift('ch1', 10), event: 'none' }); return r.event; });
if (none) fail('event "none" still rolled an event'); else ok('no event when told none');

// ----- daily challenge
console.log('== daily challenge');
const d1 = await page.evaluate(() => { const q = WR.Engine.pickDaily(); WR.Store.save({ now: true }); WR.Store._local.flush(); return q; });
await page.reload();
await page.waitForSelector('.floorplan, .onboard');
const d2 = await page.evaluate(() => WR.Engine.pickDaily());
if (d1.length !== 5 || JSON.stringify(d1) !== JSON.stringify(d2)) fail(`daily set changed on reload: ${d1} vs ${d2}`); else ok('daily: same 5 patients after reload');
if (await page.$('[data-m="drop"]')) await page.click('[data-m="drop"]'); // the autosaved shift from above
await page.evaluate(() => { WR.state.settings.sound = false; WR.state.daily.last = ''; WR.state.daily.streak = 0; });
await page.click('.chip.daily');
await page.click('[data-m="go"]');
await page.waitForSelector('.mode-daily .opt');
for (let k = 0; k < 5; k++) { await answer(true); await next(); }
await page.waitForSelector('.report-wrap');
const dd = await page.evaluate(() => ({ d: WR.state.daily, badge: !!WR.state.badges.daily1, title: document.querySelector('.report-wrap h1').textContent }));
if (dd.d.streak !== 1 || dd.d.last !== dd.d.date || !dd.badge) fail('daily: streak/badge not recorded ' + JSON.stringify(dd)); else ok(`daily: done, streak 1, badge earned ("${dd.title}")`);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 1) fail('horizontal overflow ' + overflow);

if (errors.length) fail('page errors: ' + errors.join(' | '));
await browser.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall whimsy checks passed');
process.exit(failures ? 1 : 0);
