// Autosave: a round in progress survives closing/reloading the page and can be resumed or discarded.
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const file = 'file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist/ward-rounds.html');
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// answer the current question right (select + Submit), optionally go to the next patient.
// Any selection already on the question (e.g. one restored by resume) is taken back first: on an ordering
// question, tapping a placed step removes it, which would leave the answer short and Submit disabled.
const answer = () => page.evaluate(() => {
  const run = window.WR.App.run, q = run.q;
  const click = (i) => document.querySelector(`.opt[data-i="${i}"]`).click();
  if (q.type === 'order' || q.type === 'sata') run.cur.sel.slice().reverse().forEach(click);
  if (q.type === 'order') q.steps.forEach((_, i) => click(i));
  else if (q.type === 'sata') q.opts.forEach((o, i) => o.c && click(i));
  else click(q.opts.findIndex((o) => o.c));
  document.querySelector('[data-action="submit"]').click();
});
const state = () => page.evaluate(() => { const r = window.WR.App.run; return r ? { screen: window.WR.App.name, mode: r.mode, idx: r.idx, qid: r.cur.qid, score: r.score, lives: r.lives, sel: r.cur.sel.slice(), revealed: r.cur.revealed, time: r.timeLeft, n: r.results.length } : { screen: window.WR.App.name }; });
// Random shift events (Rapid Response, visitor) make a shift 11 or 12 patients long; switch them off so every
// run plays the same 10-patient shift. Re-applied after each load because a reload brings back the original.
const noEvents = () => page.evaluate(() => { const roll = WR.Run.prototype.rollEvent; WR.Run.prototype.rollEvent = function () { return roll.call(this, 'none'); }; });
const reload = async () => { await page.waitForTimeout(400); await page.reload(); await page.waitForSelector('.floorplan, .chart, .onboard'); await noEvents(); await page.waitForTimeout(300); };
const modal = () => page.evaluate(() => !!document.querySelector('#modal-root .modal'));

await page.goto(file);
await page.waitForSelector('.onboard');
await noEvents();
for (const t of ['1', '2', '3', '4', '5']) await page.click(`[data-to="${t}"]`);
await page.waitForSelector('.chart .opt');

// 1. two answers, then a selection that is not submitted
for (let k = 0; k < 2; k++) { await answer(); await page.click('[data-action="next"]'); await page.waitForTimeout(100); }
await page.evaluate(() => { const r = window.WR.App.run; const i = r.cur.order[0]; document.querySelector(`.opt[data-i="${i}"]`).click(); });
const before = await state();
await reload();
check(await modal(), 'reload mid-shift offers to resume');
check(/Patient 3 of 10/.test(await page.textContent('#modal-root')), 'resume prompt names the patient');

// 2. dismissing the prompt keeps the save for next time
await page.keyboard.press('Escape');
await reload();
check(await modal(), 'still offered after dismissing the prompt and reloading');

// 3. resume restores everything, including the unsubmitted selection
await page.click('[data-m="go"]');
await page.waitForSelector('.chart .opt');
const after = await state();
check(after.qid === before.qid && after.idx === before.idx && after.score === before.score && after.lives === before.lives, 'same patient, score and lives');
check(JSON.stringify(after.sel) === JSON.stringify(before.sel) && !after.revealed, 'unsubmitted selection kept, not graded');

// 4. an answered question (feedback open) also survives
await answer();
const answered = await state();
await reload();
await page.click('[data-m="go"]');
await page.waitForSelector('.chart [data-action="next"]');
const a2 = await state();
check(a2.revealed && a2.n === answered.n && a2.score === answered.score, 'answered question reopens with its feedback, not double-counted');

// 5. finishing the round clears the autosave
for (let g = 0; g < 20 && (await state()).screen === 'chart'; g++) {
  if (!(await state()).revealed) await answer();
  await page.click('[data-action="next"]'); await page.waitForTimeout(100);
}
await page.waitForSelector('.report-wrap');
check(await page.evaluate(() => window.WR.state.openRun === null), 'finished shift clears the autosave');
await page.click('.report-actions [data-action="home"]');
await reload();
check(!(await modal()), 'no resume prompt after a finished shift');

// 6. discard
await page.click('.room[data-unit="ch9"]');
await page.waitForSelector('.chart .opt');
await answer();
await reload();
await page.click('[data-m="drop"]');
await page.waitForTimeout(200);
check(await page.evaluate(() => window.WR.state.openRun === null && window.WR.App.name === 'floor'), 'discard clears the round');
await reload();
check(!(await modal()), 'no prompt after discarding');

// 7. Code Blue: clock is kept; an answered question moves straight on
await page.click('.alarm');
await page.waitForSelector('.mode-codeblue .opt');
await answer();
await page.waitForTimeout(100);
const cb = await state();
await page.evaluate(() => { window.WR.Store.saveRun(); });
await reload();
await page.click('[data-m="go"]');
await page.waitForSelector('.mode-codeblue .opt');
const cb2 = await state();
check(cb2.mode === 'codeblue' && !cb2.revealed && cb2.n === cb.n && Math.abs(cb2.time - cb.time) < 3, `code blue resumes on a fresh patient with its clock (${cb.time.toFixed(1)}s → ${cb2.time.toFixed(1)}s)`);

check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(failures ? `AUTOSAVE: ${failures} FAILED` : 'AUTOSAVE PASSED');
process.exit(failures ? 1 : 0);
