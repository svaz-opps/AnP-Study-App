// "Ask a colleague": a true 50/50 on single-answer questions, half the wrong options on SATA, first step on ordering.
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const file = 'file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist/ward-rounds.html');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(file);
await page.waitForSelector('.onboard');
for (const t of ['1', '2', '3', '4', '5']) await page.click(`[data-to="${t}"]`);
await page.waitForSelector('.chart .opt');
const out = await page.evaluate(() => {
  const { App, Content } = window.WR; const Run = App.run.constructor; const bad = []; const n = {};
  for (const q of Content.all()) {
    const run = new Run('shift', { unit: q.unit, queue: [q.id] }); run.next();
    const ok = run.useColleague(); const c = run.cur;
    n[q.type] = (n[q.type] || 0) + 1;
    if (q.type !== 'order' && q.opts.length - q.opts.filter((o) => o.c).length <= 1 && q.type !== 'sata') { if (ok) bad.push(q.id + ' spent on a 2-option question'); n.twoOption = (n.twoOption || 0) + 1; continue; }
    if (!ok) { bad.push(q.id + ' lifeline did nothing'); continue; }
    if (q.type === 'order') { if (c.sel.length !== 1 || c.sel[0] !== 0) bad.push(q.id + ' first step not placed'); continue; }
    const left = c.order.filter((i) => c.gone.indexOf(i) === -1);
    const right = left.filter((i) => q.opts[i].c).length, wrong = left.length - right;
    const allRight = q.opts.filter((o) => o.c).length, allWrong = q.opts.length - allRight;
    if (right !== allRight) bad.push(q.id + ' removed a correct option');
    if (q.type === 'sata') { if (wrong !== allWrong - Math.ceil(allWrong / 2)) bad.push(q.id + ` SATA left ${wrong} wrong`); }
    else if (left.length !== 2 || wrong !== 1) bad.push(q.id + ` left ${left.length} options`);
    if (run.lifelines.colleague !== 0) bad.push(q.id + ' lifeline not spent');
  }
  return { bad, n };
});
// it also works through the UI: tap the lifeline on the current question
await page.evaluate(() => { const r = window.WR.App.run; r.lifelines.colleague = 1; });
await page.click('[data-action="colleague"]');
const ui = await page.evaluate(() => ({ gone: document.querySelectorAll('.opt.gone').length, hint: !!document.querySelector('.paper-hint'), order: window.WR.App.run.q.type === 'order', placed: document.querySelectorAll('.opt.placed').length }));
console.log('  checked', JSON.stringify(out.n));
out.bad.slice(0, 10).forEach((m) => console.log('  FAIL ' + m));
// ordering questions place the first step instead of crossing options out
if (!(ui.hint && (ui.order ? ui.placed === 1 : ui.gone))) console.log('  FAIL lifeline tap did not update the chart', JSON.stringify(ui));
if (errors.length) console.log('  FAIL page errors: ' + errors.join(' | '));
const uiOk = ui.hint && (ui.order ? ui.placed === 1 : ui.gone);
const ok = !out.bad.length && uiOk && !errors.length;
console.log(ok ? 'LIFELINE PASSED' : 'LIFELINE FAILED');
await browser.close();
process.exit(ok ? 0 : 1);
