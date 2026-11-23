// Phone/iPad-viewport playthrough of the standalone build. Run: node game/tests/smoke.mjs
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = 'file://' + path.resolve(here, '../dist/ward-rounds.html');
const out = process.env.SHOTS || path.resolve(here, '../dist/shots');
fs.mkdirSync(out, { recursive: true });

const views = [
  { name: 'ipad-landscape', width: 1180, height: 820 },
  { name: 'ipad-portrait', width: 820, height: 1180 },
  { name: 'ipad-mini-landscape', width: 1133, height: 744 },
  { name: 'split-compact', width: 375, height: 760 },
];
const only = process.argv[2];
let failures = 0;
const fail = (v, msg) => { failures++; console.log(`  FAIL [${v}] ${msg}`); };

async function overflow(page, v, where) {
  const o = await page.evaluate(() => {
    const sc = document.querySelector('.screen:not(.leaving)');
    return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, scr: sc ? sc.scrollWidth - sc.clientWidth : 0 };
  });
  if (o.doc > 1 || o.scr > 1) fail(v, `horizontal overflow on ${where}: ${JSON.stringify(o)}`);
}

async function answerCurrent(page, wantRight) {
  return page.evaluate((wantRight) => {
    const { App } = window.WR; const run = App.run; const q = run.q; const c = run.cur;
    const click = (i) => document.querySelector(`.opt[data-i="${i}"]`).click();
    if (q.type === 'order') {
      const seq = wantRight ? [...q.steps.keys()] : [...q.steps.keys()].reverse();
      seq.forEach(click);
      document.querySelector('[data-action="submit"]').click();
    } else if (q.type === 'sata') {
      q.opts.forEach((o, i) => { if (wantRight ? o.c : !o.c) click(i); });
      document.querySelector('[data-action="submit"]').click();
    } else {
      const i = q.opts.findIndex((o) => (wantRight ? o.c : !o.c));
      click(i);
    }
    return { type: q.type, revealed: run.cur.revealed, lives: run.lives };
  }, wantRight);
}

for (const v of views) {
  if (only && v.name !== only) continue;
  console.log(`== ${v.name}`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, hasTouch: true, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_/.test(m.text())) errors.push(m.text()); });
  await page.goto(file);
  await page.waitForSelector('.onboard', { timeout: 8000 });
  await page.screenshot({ path: `${out}/${v.name}-01-welcome.png` });
  await overflow(page, v.name, 'welcome');
  await page.fill('#nurse-name', 'Sam');
  await page.click('[data-to="1"]');
  await page.click('.swatch[data-key="hair"][data-val="1"]');
  await page.screenshot({ path: `${out}/${v.name}-02-avatar.png` });
  await page.click('[data-to="2"]'); await page.click('[data-to="3"]'); await page.click('[data-to="4"]'); await page.click('[data-to="5"]');
  await page.waitForSelector('.chart .opt');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${v.name}-03-chart.png` });
  await overflow(page, v.name, 'chart');
  // play a full shift: alternate right/wrong but never lose all lives
  let i = 0, guard = 0;
  while (guard++ < 30) {
    const st = await page.evaluate(() => ({ screen: window.WR.App.name }));
    if (st.screen !== 'chart') break;
    const r = await answerCurrent(page, i % 4 !== 1);
    if (!r.revealed) fail(v.name, `question type ${r.type} did not reveal`);
    if (i === 1) { await page.waitForTimeout(450); await page.screenshot({ path: `${out}/${v.name}-04-feedback-wrong.png` }); await overflow(page, v.name, 'feedback'); }
    if (i === 0) { await page.waitForTimeout(450); await page.screenshot({ path: `${out}/${v.name}-04-feedback-right.png` }); }
    await page.click('[data-action="next"]');
    await page.waitForTimeout(120);
    i++;
  }
  await page.waitForSelector('.report-wrap');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${v.name}-05-report.png` });
  await overflow(page, v.name, 'report');
  const saved = await page.evaluate(() => ({ items: Object.keys(window.WR.state.items).length, xp: window.WR.state.xp, missed: window.WR.Engine.missed().length }));
  if (saved.items < 10 || !saved.xp || !saved.missed) fail(v.name, 'progress not recorded ' + JSON.stringify(saved));
  await page.click('.report-actions [data-action="home"]');
  await page.waitForSelector('.floorplan');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${v.name}-06-floor.png`, fullPage: false });
  await overflow(page, v.name, 'floor');
  // reload: progress persists
  await page.reload();
  await page.waitForSelector('.floorplan');
  const after = await page.evaluate(() => window.WR.state.xp);
  if (after !== saved.xp) fail(v.name, `xp not persisted: ${after} vs ${saved.xp}`);
  for (const [act, sel, shot] of [['missed', '.missed-rooms, .empty', '07-missed'], ['locker', '.locker', '08-locker'], ['stats', '.unit-bars', '09-stats'], ['settings', '.set-row', '10-settings']]) {
    await page.click(`.dock [data-action="${act}"]`);
    await page.waitForSelector(sel);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${v.name}-${shot}.png` });
    await overflow(page, v.name, act);
    await page.click('.topbar [data-action="home"]');
    await page.waitForSelector('.floorplan');
  }
  // code blue: answer a few then let the clock run out
  await page.click('.alarm');
  await page.waitForSelector('.mode-codeblue .opt');
  for (let k = 0; k < 3; k++) { await answerCurrent(page, k !== 1); await page.waitForTimeout(1000); }
  await page.screenshot({ path: `${out}/${v.name}-11-codeblue.png` });
  await page.evaluate(() => { window.WR.App.run.timeLeft = 0.05; });
  await page.waitForSelector('.report-wrap', { timeout: 5000 });
  await page.click('.report-actions [data-action="home"]');
  // boss (debug unlock), win it
  await page.evaluate(() => { window.WR.debug = true; });
  await page.click('.elevator');
  await page.waitForSelector('.arena');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${v.name}-12-boss.png` });
  await overflow(page, v.name, 'boss');
  guard = 0;
  while (guard++ < 40) {
    if ((await page.evaluate(() => window.WR.App.name)) !== 'chart') break;
    await answerCurrent(page, true);
    await page.waitForTimeout(80);
    await page.click('[data-action="next"]');
  }
  const bossWon = await page.evaluate(() => window.WR.state.boss.wins);
  if (!bossWon) fail(v.name, 'boss not defeated after 40 right answers');
  await page.waitForSelector('.report-wrap');
  await page.screenshot({ path: `${out}/${v.name}-13-boss-report.png` });
  // rotation mid-question keeps state
  await page.click('.report-actions [data-action="home"]');
  await page.click('.room[data-unit="ch9"]');
  await page.waitForSelector('.chart .opt');
  const before = await page.evaluate(() => { const r = window.WR.App.run; return r.cur.qid; });
  await page.setViewportSize({ width: v.height, height: v.width });
  await page.waitForTimeout(400);
  const rot = await page.evaluate(() => window.WR.App.run.cur.qid);
  if (rot !== before) fail(v.name, 'question changed on rotation');
  await overflow(page, v.name, 'rotated chart');
  await page.screenshot({ path: `${out}/${v.name}-14-rotated.png` });
  if (errors.length) fail(v.name, 'console errors: ' + errors.slice(0, 5).join(' | '));
  await browser.close();
}
console.log(failures ? `${failures} failure(s)` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
