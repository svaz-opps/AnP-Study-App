// ---------- small helpers ----------
const WR = (window.WR = { state: null });
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LETTERS = 'ABCDEF';

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) { // mulberry32
  let a = typeof seed === 'number' ? seed : hashStr(String(seed));
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = (arr, rand = Math.random) => arr[Math.floor(rand() * arr.length)];

function weightedSample(items, weightFn, n, rand = Math.random) {
  const pool = items.map((it) => ({ it, w: Math.max(0, weightFn(it)) })).filter((x) => x.w > 0);
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = rand() * total, i = 0;
    for (; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) break; }
    out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0].it);
  }
  return out;
}

// local calendar day as YYYY-MM-DD and a day number for spacing
function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const yesterdayStr = () => todayStr(new Date(Date.now() - 86400000));
function dayNum(s = todayStr()) {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// Run fn when the browser has nothing else to do (so it never lands mid-animation).
// Safari has no requestIdleCallback; there it simply runs on the next turn.
function whenIdle(fn, timeout = 2000) {
  if (window.requestIdleCallback) requestIdleCallback(() => fn(), { timeout });
  else setTimeout(fn, 0);
}

// Wait until calls stop for `ms`, then run once. opts.idle: run in idle time.
// flush() runs right now (used when the page is being hidden or closed).
function debounce(fn, ms, opts = {}) {
  let t;
  const d = (...a) => {
    clearTimeout(t);
    t = setTimeout(() => (opts.idle ? whenIdle(() => fn(...a)) : fn(...a)), ms);
  };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

// Restart a CSS animation class without the old `void el.offsetWidth` trick, which
// forces the browser to lay out the whole page in the middle of a tap. The class comes
// off now and goes back on two frames later, once the browser has seen it removed.
function replayClass(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add(cls)));
}

// Run fn right after the browser paints the next frame. Splitting a big update this way lets
// the first part show a frame sooner instead of everything waiting for one long frame.
function afterNextPaint(fn) {
  requestAnimationFrame(() => setTimeout(fn, 0));
}

// asked every animation frame, so the media query is created once
const reducedMotionQuery = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const reducedMotion = () => {
  const s = window.WR && WR.state && WR.state.settings.motion;
  if (s === 'reduced') return true;
  if (s === 'full') return false;
  return !!(reducedMotionQuery && reducedMotionQuery.matches);
};

// ---------- icons (inline SVG, stroke-based) ----------
const ICON_PATHS = {
  heart: '<path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 ' +
    '5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z" fill="currentColor" stroke="none"/>',
  star: '<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" ' +
    'fill="currentColor" stroke="none"/>',
  flame: '<path d="M12 22c4.4 0 7-2.9 7-6.7 0-3.5-2.4-5.6-3.6-8.6-.3 2-1.3 3.2-2.4 3.7.3-3.3-1.2-6.4-4-8.4.2 ' +
    '3.6-1.6 5.6-3.2 7.6C4.6 11.3 5 12.8 5 15.3 5 19.1 7.6 22 12 22z" fill="currentColor" stroke="none"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/>' +
    '<circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.4c2.6.2 4.6 2 5.1 4.8"/>',
  coffee: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/>' +
    '<path d="M8 3.5c-.8 1 .8 1.8 0 3M12 3.5c-.8 1 .8 1.8 0 3"/>',
  bulb: '<path d="M9 18h6M10 21h4"/>' +
    '<path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>' +
    '<circle cx="12" cy="12" r="1" fill="currentColor"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/>' +
    '<path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="17" rx="2.5"/><path d="M9 4.5h6v3H9z"/>' +
    '<path d="M8.5 12h7M8.5 16h5"/>',
  shirt: '<path d="M8 3l-5 3 2 5 3-1.5V21h8V9.5l3 1.5 2-5-5-3c-.5 1.6-2 2.6-4 2.6S8.5 4.6 8 3z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/>' +
    '<path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.8"/>',
  alarm: '<path d="M6 17V11a6 6 0 0 1 12 0v6"/><path d="M4 17h16v3H4zM12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/>' +
    '<path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M10 14v3h4v-3M8 21h8v-3H8z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  download: '<path d="M12 3.5v12M7 11l5 5 5-5M4.5 20.5h15"/>',
  upload: '<path d="M12 16V4M7 8.5l5-5 5 5M4.5 20.5h15"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  pill: '<rect x="2.8" y="8.5" width="18.4" height="7" rx="3.5" transform="rotate(-35 12 12)"/>' +
    '<path d="M9.3 8.2l5.4 7.6"/>',
  stethoscope: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/>' +
    '<circle cx="20" cy="11" r="2"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 ' +
    '5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/>',
  card: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/>' +
    '<path d="M12 15.6s-3.6-2.2-3.6-4.5c0-1.3 1-2.1 2-2.1.7 0 1.3.4 1.6.9.3-.5.9-.9 1.6-.9 1 0 2 .8 2 2.1 0 2.3-3.6 4.5-3.6 4.5z" ' +
    'fill="currentColor" stroke="none"/>',
  bug: '<rect x="7" y="7" width="10" height="13" rx="5"/>' +
    '<path d="M9 7a3 3 0 0 1 6 0M3 12h4M17 12h4M4 7l3 2M20 7l-3 2M4 18l3-2M20 18l-3-2M12 11v9"/>',
};
function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}
