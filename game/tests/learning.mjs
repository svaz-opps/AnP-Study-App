// Learning engine: what the game decides you know. Mastery, stars, missed/discharge, spaced review,
// the 50/50 lifeline, daily target, weak focus points, readiness/pace, and the report card that shows them.
// Dates are pinned with page.clock (Chicago time, so the daylight-saving check is real).
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const file = 'file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist/ward-rounds.html');
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, timezoneId: 'America/Chicago' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// noon in Chicago on the given day (UTC-6 in winter)
const setDay = (d) => page.clock.setFixedTime(new Date(d + 'T18:00:00Z'));
const T = '2026-11-24';
await setDay(T);
await page.goto(file);
await page.waitForFunction(() => window.WR && WR.Engine && WR.Content && WR.Content.data);

// run a function in the page; errors come back as { err } so one broken check doesn't stop the rest
const run = (fn, arg) => page.evaluate(`(() => { try { return (${fn})(${JSON.stringify(arg)}); } catch (e) { return { err: String(e && e.message || e) }; } })()`);
const fresh = () => run(() => { WR.Store.reset(); WR.state.settings.examDate = ''; WR.state.profile.onboarded = true; return true; });
// helpers available inside the page
await page.evaluate(() => {
  window.T_ = {
    q(filter = () => true) { return WR.Content.all().find((q) => q.origin === 'new' && q.type === 'mcq' && filter(q)); },
    right(q) { return WR.Engine.record(q, { correct: true, frac: 1 }); },
    wrong(q) { return WR.Engine.record(q, { correct: false, frac: 0 }); },
    // answer through a real shift round, optionally after "Ask a colleague"
    viaRun(q, { help = false, correct = true } = {}) {
      const r = new WR.Run('shift', { unit: q.unit, queue: [q.id], event: 'none' });
      r.next();
      if (help) r.useColleague();
      const i = q.opts.findIndex((o) => (correct ? o.c : !o.c) && r.cur.gone.indexOf(q.opts.indexOf(o)) === -1);
      r.toggle(i);
      r.submit();
      return r.cur;
    },
  };
});

// ---------- B3: right, wrong, right on one day still counts that day
await fresh();
let res = await run(() => {
  const q = T_.q(); T_.right(q); T_.wrong(q); T_.right(q);
  return { id: q.id, ok: WR.state.items[q.id].ok };
});
check(res.ok === 1, `right → wrong → right on one day counts as a right day (ok=${res.ok})`);
await setDay('2026-11-25');
res = await run((id) => { const q = WR.Content.byId[id]; const r = T_.right(q); return { solid: WR.Engine.isSolid(WR.state.items[id]), discharged: r.discharged }; }, res.id);
check(res.solid && res.discharged, 'next day right: mastered and discharged from Missed Patients');
await setDay(T);

// ---------- B4: a right answer after the 50/50 is seen, not proof
await fresh();
res = await run(() => {
  const q = T_.q((x) => x.opts.length >= 3);
  const c = T_.viaRun(q, { help: true });
  const r = WR.state.items[q.id];
  return { id: q.id, s: r.s, r: r.r, ok: r.ok, helped: !!c.helped, acc: WR.state.originStats.new };
});
check(res.s === 1 && res.r === 0 && res.ok === 0, `assisted right: seen, not right, no mastery day (s=${res.s} r=${res.r} ok=${res.ok})`);
check(res.helped, 'assisted right answer is flagged for the feedback note');
check(!res.acc || !res.acc.n, 'assisted right is left out of accuracy stats');
res = await run(() => {
  const q = T_.q((x) => x.opts.length >= 3 && !WR.state.items[x.id]);
  T_.wrong(q);
  T_.viaRun(q, { help: true });
  return { miss: WR.state.items[q.id].miss, discharged: WR.state.discharged };
});
await setDay('2026-11-25');
res = await run(() => {
  const q = WR.Content.all().find((x) => WR.state.items[x.id] && WR.state.items[x.id].miss);
  T_.viaRun(q, { help: true });
  return { miss: WR.state.items[q.id].miss, discharged: WR.state.discharged };
});
check(res.miss && res.discharged === 0, 'assisted rights on two days do not discharge a missed patient');
res = await run(() => {
  const q = T_.q((x) => x.opts.length >= 3 && !WR.state.items[x.id]);
  T_.viaRun(q, { help: true, correct: false });
  const r = WR.state.items[q.id];
  return { w: r.w, miss: r.miss };
});
check(res.w === 1 && res.miss, 'a wrong answer with help still counts as wrong');
await setDay(T);

// ---------- B5 + B9: a miss can take a star away; the OR stays open once opened
await fresh();
res = await run(() => {
  const E = WR.Engine, M = WR.CONFIG.mastery;
  // put four rooms right at the one-star line (answered right once, yesterday)
  const rooms = WR.Content.units.slice(0, 4).map((u) => u.id);
  for (const uid of rooms) {
    const qs = WR.Content.byUnit[uid], need = Math.ceil(qs.length * M.oneStar);
    qs.slice(0, need).forEach((q) => { WR.state.items[q.id] = { s: 1, r: 1, w: 0, ok: 1, od: '2026-11-23', ld: '2026-11-23', miss: false }; });
  }
  const before = E.mastery(rooms[0]).stars, open = E.bossUnlocked();
  const q = WR.Content.byUnit[rooms[0]][0];
  T_.wrong(q);
  return { before, after: E.mastery(rooms[0]).stars, open, still: E.bossUnlocked() };
});
check(res.before === 1 && res.after === 0, `a miss drops a room below its star until fixed (${res.before}★ → ${res.after}★)`);
check(res.open && res.still, 'the Operating Room stays open after stars drop');

// ---------- B2: "yesterday" across the spring-forward night
res = await run(() => 1);
await page.clock.setFixedTime(new Date('2026-03-09T05:30:00Z')); // 00:30 CDT, the night after clocks moved forward
res = await run(() => (WR.util ? { t: WR.util.todayStr(), y: WR.util.yesterdayStr() } : { err: 'WR.util not exported' }));
check(res.t === '2026-03-09' && res.y === '2026-03-08', `yesterday after spring-forward is the previous date (${res.y || res.err})`);
await setDay(T);

// ---------- B1: the floor's day-streak chip shows 0 after days away
await fresh();
res = await run(() => {
  Object.assign(WR.state.days, { last: '2026-11-20', today: '2026-11-20', streak: 5 });
  WR.App.show('floor');
  return true;
});
await page.waitForSelector('.chip.streak');
const streakTxt = await page.textContent('.chip.streak .num');
check(streakTxt.trim() === '0', `day streak after 4 days away shows 0 (shows ${streakTxt.trim()})`);

// ---------- B6: daily target counts the right-days still needed
await fresh();
res = await run(() => {
  WR.state.settings.examDate = '2026-12-04'; // 10 days
  const D = WR.CONFIG.dailyTarget, n = WR.Content.all().length, days = WR.CONFIG.mastery.solidDays;
  const want = Math.min(D.max, Math.max(D.min, Math.ceil((n * days) / 10)));
  return { got: WR.Engine.dailyTarget(), want };
});
check(res.got === res.want, `daily target = right-days left ÷ days to exam (${res.got} vs ${res.want})`);

// ---------- B8: first-try accuracy is kept apart from repeats
await fresh();
await setDay('2026-11-20');
res = await run(() => { const q = T_.q(); T_.wrong(q); T_.right(q); T_.right(q); return q.id; });
res = await run(() => ({ first: WR.state.firstStats && WR.state.firstStats.origin && WR.state.firstStats.origin.new, all: WR.state.originStats.new }));
check(res.first && res.first.n === 1 && res.first.r === 0 && res.all.n === 3, `first-try accuracy counts only the first answer (${JSON.stringify(res.first)})`);
await setDay(T);

// ---------- B7: weak focus points reflect what you know now
await fresh();
await setDay('2026-11-20');
const fq = await run(() => {
  const q = T_.q((x) => x.focus && x.focus.length);
  T_.wrong(q);
  return { id: q.id, key: q.focus[0].join('#') };
});
const weakNow = () => run(() => {
  const list = WR.Engine.weakFocus ? WR.Engine.weakFocus() : [];
  return list.map((a) => a.sec + '#' + a.i);
});
check((await weakNow()).includes(fq.key), 'a missed question puts its focus point on the weak list');
for (const d of ['2026-11-21', '2026-11-22']) { await setDay(d); await run((id) => T_.right(WR.Content.byId[id]), fq.id); }
check(!(await weakNow()).includes(fq.key), 'once fixed (mastered), the focus point leaves the weak list');
res = await run(() => {
  const rep = WR.Engine.focusReport();
  const n = { mastered: 0, progress: 0, new: 0 };
  rep.forEach((a) => { n[a.state] = (n[a.state] || 0) + 1; });
  return { total: rep.length, n };
});
check(res.total === 239 && res.n.new >= 237, `all 239 focus points are reported, unseen ones included (${JSON.stringify(res.n)})`);
await setDay(T);

// ---------- B10: mastered questions come due on a growing schedule
await fresh();
res = await run(() => {
  const E = WR.Engine, P = WR.CONFIG.picking, q = T_.q();
  WR.state.items[q.id] = { s: 2, r: 2, w: 0, ok: 2, od: '2026-11-17', ld: '2026-11-17', miss: false }; // 7 days ago
  const st = E.status(q.id), w = E.weight(q);
  T_.right(q);
  return { id: q.id, st, wDue: w === P.due, after: E.status(q.id), ok: WR.state.items[q.id].ok };
});
check(res.st === 'due' && res.wDue, `mastered 7 days ago → due for review, picked eagerly (${res.st})`);
check(res.after === 'mastered' && res.ok === 3, 'reviewed → mastered again with a longer gap');
await setDay('2026-12-07');
check((await run((id) => WR.Engine.status(id), res.id)) === 'mastered', '13 days later: still mastered');
await setDay('2026-12-08');
check((await run((id) => WR.Engine.status(id), res.id)) === 'due', '14 days later: due again');
await setDay(T);
res = await run(() => {
  const q = T_.q((x) => !WR.state.items[x.id]);
  WR.state.items[q.id] = { s: 2, r: 2, w: 0, ok: 2, od: '2026-11-20', ld: '2026-11-20', miss: false }; // the day before the final week (Nov 21–27)
  const a = WR.Engine.status(q.id);
  WR.state.settings.examDate = '2026-11-27';
  const b = WR.Engine.status(q.id);
  WR.state.settings.examDate = '';
  return { a, b };
});
check(res.a === 'mastered' && res.b === 'due', `final week before the exam: mastered questions come back once (${res.a} → ${res.b})`);

// ---------- readiness + pace
await fresh();
res = await run(() => WR.Engine.readiness());
check(res && res.pct == null && res.conf === 'low', 'readiness: no estimate before enough answers');
res = await run(() => {
  const qs = WR.Content.all().filter((q) => q.origin === 'new').slice(0, 40);
  qs.forEach((q, i) => (i % 4 ? T_.right(q) : T_.wrong(q)));
  return WR.Engine.readiness();
});
check(res && res.pct > 0 && res.pct < 100 && res.conf === 'low', `readiness after 40 answers: ${res && res.pct}% (${res && res.conf} confidence)`);
res = await run(() => {
  const s = WR.state, all = WR.Content.all();
  all.slice(0, 24).forEach((q) => { s.items[q.id] = { s: 2, r: 2, w: 0, ok: 2, od: '2026-11-23', ld: '2026-11-23', miss: false }; });
  s.days.hist = { '2026-11-17': { n: 10, r: 8, m: 10 }, '2026-11-20': { n: 10, r: 8, m: 16 } };
  WR.state.settings.examDate = '2026-12-24';
  return WR.Engine.pace();
});
check(res && Math.abs(res.rate - 2) < 0.01 && res.now === 24, `pace: mastered per day over the last week (${res && res.rate})`);

// ---------- report card renders: busy save, empty save, old save without the new fields
await run(() => { WR.App.show('stats'); return true; });
await page.waitForSelector('.unit-bars');
res = await page.evaluate(() => ({
  stand: !!document.querySelector('.stand'), focus: !!document.querySelector('.focus-cov'),
  trend: !!document.querySelector('.trend'), types: !!document.querySelector('.type-grid'),
  text: document.querySelector('.stand') ? document.querySelector('.stand').textContent : '',
}));
check(res.stand && res.focus && res.trend && res.types, 'report card shows where you stand, focus coverage, trend and question types');
check(/24/.test(res.text) && /mastered/i.test(res.text), 'report card headline counts mastered questions');
await fresh();
await run(() => { WR.App.show('stats'); return true; });
await page.waitForSelector('.unit-bars');
check(await page.evaluate(() => /answer/i.test(document.querySelector('.stand').textContent)), 'empty save: report card explains what to do');
await page.evaluate(() => {
  const s = JSON.parse(JSON.stringify(WR.state));
  delete s.firstStats; delete s.log; delete s.days.hist; delete s.unlocks;
  s.items = { [WR.Content.all()[0].id]: { s: 3, r: 1, w: 2, ok: 0, od: '', ld: '2026-11-01', miss: true } };
  localStorage.setItem('ward-rounds-save-v1', JSON.stringify(s));
});
await page.reload();
await page.waitForFunction(() => window.WR && WR.Content && WR.Content.data);
await run(() => { WR.App.show('stats'); return true; });
await page.waitForSelector('.unit-bars');
check(await page.evaluate(() => !!document.querySelector('.stand')), 'an old save without the new fields loads and renders the report card');

check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall learning checks passed');
process.exit(failures ? 1 : 0);
