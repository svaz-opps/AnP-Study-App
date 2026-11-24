// Smooth play: the things that used to cause stutters stay fixed. Run: node game/tests/smooth.mjs
//  - the heart monitor carries on from patient to patient (no new canvas, no extra animation loops)
//  - the monitor pauses while a dialog is open (it used to be re-blurred under the dialog every frame)
//  - tapping an option or Submit never forces a synchronous layout in the middle of the tap
//  - the Code Blue timer bar moves with transform (no layout every frame)
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
await page.goto(file);
await page.waitForSelector('.onboard');
for (const t of ['1', '2', '3', '4', '5']) await page.click(`[data-to="${t}"]`);
await page.waitForSelector('.chart .opt');
await page.waitForTimeout(300);

// Count layout reads that force a synchronous layout: a read only costs a layout when the page
// was changed earlier in the same handler, so DOM writes mark it "dirty" and reads count only then.
await page.evaluate(() => {
  window.__forced = 0; window.__dirty = false;
  const dirty = () => { window.__dirty = true; };
  const onRead = (proto, prop) => {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(proto, prop, { configurable: true, get() { if (window.__dirty) window.__forced++; return d.get.call(this); }, set: d.set });
  };
  const onWrite = (proto, prop) => {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(proto, prop, { configurable: true, get: d.get, set(v) { dirty(); d.set.call(this, v); } });
  };
  const wrapFn = (proto, name, read) => {
    const f = proto[name];
    proto[name] = function (...a) { if (read) { if (window.__dirty) window.__forced++; } else dirty(); return f.apply(this, a); };
  };
  ['offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft'].forEach((p) => onRead(HTMLElement.prototype, p));
  ['scrollTop', 'clientWidth', 'clientHeight'].forEach((p) => onRead(Element.prototype, p));
  wrapFn(Element.prototype, 'getBoundingClientRect', true);
  ['innerHTML', 'outerHTML'].forEach((p) => onWrite(Element.prototype, p));
  onWrite(Node.prototype, 'textContent');
  ['appendChild', 'insertBefore', 'removeChild'].forEach((n) => wrapFn(Node.prototype, n));
  ['replaceWith', 'remove'].forEach((n) => wrapFn(Element.prototype, n));
  ['add', 'remove', 'toggle'].forEach((n) => wrapFn(DOMTokenList.prototype, n));
});
const nextFrame = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
const answer = async (right) => {
  const onPick = await page.evaluate((right) => {
    const run = window.WR.App.run, q = run.q;
    window.__forced = 0;
    const click = (i) => { window.__dirty = false; document.querySelector(`.opt[data-i="${i}"]`).click(); };
    if (q.type === 'order') q.steps.forEach((_, i) => click(right ? i : q.steps.length - 1 - i));
    else if (q.type === 'sata') q.opts.forEach((o, i) => { if (right ? o.c : !o.c) click(i); });
    else click(q.opts.findIndex((o) => (right ? o.c : !o.c)));
    return window.__forced;
  }, right);
  await nextFrame(); // a frame always passes between two taps
  const onSubmit = await page.evaluate(() => {
    window.__forced = 0; window.__dirty = false;
    document.querySelector('[data-action="submit"]').click();
    return window.__forced;
  });
  return { onPick, onSubmit };
};

const first = await page.evaluate(() => ({ canvas: document.querySelector('#ecg'), loops: window.WR.Loop.fns.size }));
let forcedPick = 0, forcedSubmit = 0;
for (let k = 0; k < 4; k++) {
  const f = await answer(k !== 1);
  forcedPick += f.onPick; forcedSubmit += f.onSubmit;
  await page.waitForSelector('[data-action="next"]');
  await page.click('[data-action="next"]');
  await page.waitForTimeout(150);
}
check(forcedPick === 0, `tapping options forces no layout (${forcedPick} reads)`);
check(forcedSubmit === 0, `Submit forces no layout (${forcedSubmit} reads)`);
const later = await page.evaluate(() => {
  const { Screens, Loop } = window.WR;
  return { same: Screens.chart.ecg && Screens.chart.ecg.c === document.querySelector('#ecg'), loops: Loop.fns.size, sized: Screens.chart.ecg.w > 0 };
});
check(later.same && later.sized, 'the same monitor canvas carries on to the next patient');
check(later.loops === first.loops && later.loops === 1, `no extra animation loops pile up (${first.loops} → ${later.loops})`);

// a dialog pauses the monitor
await page.click('[data-action="quit"]');
await page.waitForSelector('.modal');
const paused = await page.evaluate(() => new Promise((res) => {
  const ecg = window.WR.Screens.chart.ecg, x0 = ecg.x;
  setTimeout(() => res(ecg.x === x0), 400);
}));
check(paused, 'monitor pauses under a dialog');
await page.click('[data-m="no"]');
const resumed = await page.evaluate(() => new Promise((res) => {
  const ecg = window.WR.Screens.chart.ecg, x0 = ecg.x;
  setTimeout(() => res(ecg.x !== x0), 400);
}));
check(resumed, 'monitor runs again once the dialog closes');

// Code Blue: timer bar slides with transform; the monitor is replaced cleanly when leaving
await page.evaluate(() => { window.WR.App.run = null; window.WR.App.show('floor'); });
await page.waitForSelector('.alarm');
await page.click('.alarm');
await page.waitForSelector('.mode-codeblue #timer-bar');
await page.waitForTimeout(400);
const timer = await page.evaluate(() => { const b = document.querySelector('#timer-bar'); return { tf: b.style.transform, w: b.style.width, loops: window.WR.Loop.fns.size }; });
check(/translateX/.test(timer.tf) && !timer.w, 'Code Blue timer bar moves with transform, not width');
check(timer.loops === 2, `Code Blue runs exactly the monitor + the clock (${timer.loops} loops)`);
const iconSize = await page.evaluate(() => document.querySelector('.timer > svg').getBoundingClientRect().width);
check(iconSize <= 40, `Code Blue timer icon stays icon-sized (${Math.round(iconSize)}px)`);

check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(failures ? `SMOOTH: ${failures} FAILED` : 'SMOOTH PASSED');
process.exit(failures ? 1 : 0);
