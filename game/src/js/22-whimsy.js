// ---------- whimsy: silly patient reactions ----------
// A right answer streak makes the patient sillier (tiers 1-4, the same steps as the score
// multiplier, plus CONFIG.whimsy.legendaryStreak). A run of misses makes the bedside more chaotic (levels 1-3).
// Everything plays inside the patient card only, lasts under 1.5 s, and never delays the
// explanation. Moves live in 35-whimsy.css; this file picks a reaction and stages it.

// props are SVG drawn in the bed's viewBox (0 0 160 110); the head sits at (40, 34)
const WH_PROPS = {
  hearts: () => [[34, 14, 0], [48, 10, 0.18], [26, 8, 0.34]].map(([x, y, d]) =>
    `<path class="wh-float" style="animation-delay:${d}s" ` +
    `d="M${x} ${y} q-4 -4 0 -7 q2 -1 3 1 q1 -2 3 -1 q4 3 0 7 l-3 3z" fill="#ff6b8a"/>`).join(''),
  pew: () => '<g class="wh-pop">' +
    '<path d="M64 16 l6 -3 M66 22 l7 0 M64 28 l6 3" stroke="#ffd36b" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M78 18 l6 -3 M80 24 l7 0 M78 30 l6 3" stroke="#ffd36b" stroke-width="2" stroke-linecap="round"/></g>',
  notes: () => [[60, 12, 0], [76, 6, 0.2], [92, 14, 0.4]].map(([x, y, d]) =>
    `<g class="wh-float" style="animation-delay:${d}s">` +
    `<circle cx="${x}" cy="${y + 6}" r="2.6" fill="#8fa8ff"/>` +
    `<path d="M${x + 2.4} ${y + 6} v-9 l5 2" stroke="#8fa8ff" stroke-width="1.6" fill="none"/></g>`).join(''),
  sparkles: () => [[118, 4], [146, 18], [104, 26]].map(([x, y], i) =>
    `<path class="wh-twinkle" style="animation-delay:${i * 0.15}s" ` +
    `d="M${x} ${y - 5} l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4z" fill="#ffd36b"/>`).join(''),
  party: () => '<g class="wh-pop">' +
    '<path d="M30 20 L41 -4 L51 20 z" fill="#f6bd52" stroke="#c98a1a" stroke-width="1"/>' +
    '<path d="M34 13 l12 -2 M37 6 l7 -1" stroke="#ff6b8a" stroke-width="2.2"/>' +
    '<circle cx="41" cy="-4" r="3.2" fill="#ff6b8a"/></g> ' +
    '<g class="wh-blower"><path d="M48 49 h14" stroke="#5cd6c0" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M62 49 q8 0 8 -6 q0 -4 -4 -4" stroke="#5cd6c0" stroke-width="3" fill="none" stroke-linecap="round"/></g>',
  waves: () => '<g class="wh-waves">' +
    '<path d="M-20 100 q10 -8 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 v12 h-180z" fill="#5fb4ff" opacity=".85"/>' +
    '<path d="M-20 104 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" ' +
    'stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/>' +
    '</g>',
  confetti: () => {
    const cols = ['#5cd6c0', '#f6bd52', '#ff6b7a', '#8fa8ff', '#52f0a4', '#ffffff'];
    let s = '';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const dx = Math.round(Math.cos(a) * (36 + (i % 3) * 12)), dy = Math.round(Math.sin(a) * (26 + (i % 2) * 10) - 10);
      s += `<rect class="wh-confetti" x="127" y="17" width="4" height="2.6" fill="${cols[i % cols.length]}" ` +
        `style="--dx:${dx}px;--dy:${dy}px;--rot:${(i * 67) % 360}deg"/>`;
    }
    return s;
  },
  rocket: () => '<g class="wh-flames">' +
    '<path d="M20 101 q6 14 12 0 M60 101 q6 16 12 0 M100 101 q6 14 12 0" fill="#ff9f43" stroke="#ff6b3d" stroke-width="1.5"/>' +
    '</g>',
  puffs: () => [[22, 14], [40, 8], [58, 14], [30, 4], [50, 3]].map(([x, y], i) =>
    `<circle class="wh-puff" style="animation-delay:${i * 0.06}s" cx="${x}" cy="${y}" r="5" fill="#dfe6ef" opacity=".9"/>`).join(''),
  pill: () => '<g class="wh-pill"><rect x="-6" y="-3" width="12" height="6" rx="3" fill="#ff6b7a"/>' +
    '<rect x="0" y="-3" width="6" height="6" rx="0" fill="#fff"/><rect x="0" y="-3" width="6" height="6" rx="3" fill="#fff"/></g> ' +
    '<text class="wh-pop wh-word" x="62" y="12" font-size="11">BONK!</text>',
  achoo: () => '<text class="wh-pop wh-word" x="58" y="20" font-size="12">ACHOO!</text>' +
    [[58, 40], [66, 46], [62, 32], [72, 38]].map(([x, y], i) =>
      `<circle class="wh-spray" style="animation-delay:${i * 0.04}s" cx="${x}" cy="${y}" r="1.8" fill="#8fd3ff"/>`).join(''),
  speed: () => '<g class="wh-speed">' +
    '<path d="M140 40 h18 M136 52 h24 M142 64 h16" stroke="#cfd8e3" stroke-width="2.2" stroke-linecap="round"/></g>',
  // three stars circling the head
  stars: () => {
    const star = (deg) => {
      const a = (deg * Math.PI) / 180, x = 40 + Math.cos(a) * 20, y = 14 + Math.sin(a) * 6;
      return `<path d="M${x} ${y - 4} l1.2 2.8 2.8 .4 -2.1 2 .6 2.9 -2.5 -1.4 -2.5 1.4 .6 -2.9 -2.1 -2 2.8 -.4z" fill="#ffd36b"/>`;
    };
    return `<g class="wh-orbit">${[0, 120, 240].map(star).join('')}</g>`;
  },
  clang: () => '<text class="wh-pop wh-word" x="74" y="16" font-size="12">CLANG!</text>',
  swirl: () => '<text class="wh-pop wh-word" x="58" y="14" font-size="11">WHEEE!</text>',
};

const WHIMSY = [
  // ----- right answers, by streak tier
  { id: 'thumbs', kind: 'good', tier: 1, mood: 'happy', sound: 'boing', ms: 1100 },
  { id: 'wiggle', kind: 'good', tier: 1, mood: 'silly', sound: 'boing', ms: 1000 },
  { id: 'hearts', kind: 'good', tier: 1, mood: 'cheer', sound: 'pop', props: 'hearts', ms: 1300 },
  { id: 'dance', kind: 'good', tier: 2, mood: 'cheer', sound: 'kazoo', props: 'notes', ms: 1400 },
  { id: 'fingerguns', kind: 'good', tier: 2, mood: 'cool', sound: 'slide', props: 'pew', ms: 1200 },
  { id: 'ivtwirl', kind: 'good', tier: 2, mood: 'starry', sound: 'slide', props: 'sparkles', ms: 1200 },
  { id: 'backflip', kind: 'good', tier: 3, mood: 'cheer', sound: 'slide', props: 'swirl', ms: 1300 },
  { id: 'surf', kind: 'good', tier: 3, mood: 'cool', sound: 'kazoo', props: 'waves', ms: 1400 },
  { id: 'party', kind: 'good', tier: 3, mood: 'starry', sound: 'honk', props: 'party', ms: 1400 },
  { id: 'wheelie', kind: 'good', tier: 4, mood: 'starry', sound: 'tada', props: 'confetti', banner: 'LEGENDARY!', ms: 1500 },
  { id: 'rocket', kind: 'good', tier: 4, mood: 'cool', sound: 'slide', props: 'rocket', banner: 'UNSTOPPABLE!', ms: 1500 },
  // ----- misses, by how many in a row
  { id: 'poof', kind: 'chaos', tier: 1, mood: 'shock', sound: 'boing', props: 'puffs', ms: 1000 },
  { id: 'bonk', kind: 'chaos', tier: 1, mood: 'shock', sound: 'honk', props: 'pill', ms: 1000 },
  { id: 'sneeze', kind: 'chaos', tier: 1, mood: 'shock', sound: 'sneeze', props: 'achoo', sneeze: true, ms: 1000 },
  { id: 'blanket', kind: 'chaos', tier: 2, mood: 'shock', sound: 'slidedown', ms: 1200 },
  { id: 'roll', kind: 'chaos', tier: 2, mood: 'worried', sound: 'slide', props: 'speed', ms: 1200 },
  { id: 'dizzy', kind: 'chaos', tier: 2, mood: 'dizzy', sound: 'boing', props: 'stars', ms: 1200 },
  { id: 'topple', kind: 'chaos', tier: 3, mood: 'shock', sound: 'slidedown', props: 'clang', ms: 1200 },
  { id: 'spin', kind: 'chaos', tier: 3, mood: 'dizzy', sound: 'slide', ms: 1200 },
  { id: 'upside', kind: 'chaos', tier: 3, mood: 'dizzy', sound: 'boing', ms: 1200 },
];

window.WHIMSY_LIST = WHIMSY;
const Whimsy = {
  timer: null,

  setting() { return (WR.state.settings && WR.state.settings.whimsy) || 'full'; },

  // streak tier: 0 with no multiplier, then one tier per multiplier step, then the legendary streak
  tier(streak) {
    if (streak >= CONFIG.whimsy.legendaryStreak) return 4;
    const m = Engine.multiplier(streak);
    return m >= 3 ? 3 : m >= 2 ? 2 : m > 1 ? 1 : 0;
  },
  chaos(wrongRun) { return Math.min(3, wrongRun); },

  // which reaction (or null) this answer earns
  choose(run, res) {
    const mode = this.setting();
    if (mode === 'off' || run.mode === 'exam' || run.mode === 'boss') return null;
    let kind, level;
    if (res.correct) { kind = 'good'; level = this.tier(run.streak); }
    else if (res.frac > 0) return null; // partly right: stay calm, read the why
    else { kind = 'chaos'; level = this.chaos(run.wrongRun); }
    const W = CONFIG.whimsy;
    const cap = run.mode === 'codeblue' ? W.codeBlueMaxTier : mode === 'mild' ? W.mildMaxTier[kind] : 4;
    level = Math.min(level, cap);
    if (!level) return null;
    let pool = WHIMSY.filter((w) => w.kind === kind && w.tier === level);
    if (pool.length > 1) pool = pool.filter((w) => w.id !== run.lastWh);
    return pick(pool);
  },

  clear(bed) {
    clearTimeout(this.timer);
    const el = bed || document.getElementById('bed');
    if (!el) return;
    el.className = el.className.split(/\s+/).filter((c) => c && c !== 'wh' && c !== 'wh-still' && !c.startsWith('wh-')).join(' ');
    const props = el.querySelector('.pt-props'); if (props) props.innerHTML = '';
    const card = el.closest('.patient-card'); if (card) card.querySelectorAll('.wh-banner').forEach((b) => b.remove());
    const mon = document.getElementById('monitor'); if (mon) mon.classList.remove('wh-sneeze');
  },

  // stage a reaction on the bedside patient; returns the reaction (or null)
  react(run, res) {
    const bed = document.getElementById('bed');
    if (!bed || !run.cur) return null;
    const w = this.choose(run, res);
    if (!w) return null;
    this.clear(bed);
    run.lastWh = w.id;
    run.cur.wh = w.id;
    bed.innerHTML = patientInBed(run.cur.patient, w.mood);
    const props = bed.querySelector('.pt-props');
    if (w.props && props) props.innerHTML = WH_PROPS[w.props](run.cur.patient);
    const still = reducedMotion();
    bed.classList.add('wh', 'wh-' + w.id);
    if (still) bed.classList.add('wh-still');
    if (w.kind === 'good' && w.tier >= 2) bed.classList.add('wh-hi'); // room-theme gags join in
    const card = bed.closest('.patient-card');
    if (w.banner && card) {
      const b = document.createElement('div');
      b.className = 'wh-banner';
      b.textContent = w.banner;
      b.setAttribute('aria-hidden', 'true');
      card.appendChild(b);
    }
    if (w.sneeze && !still) replayClass(document.getElementById('monitor'), 'wh-sneeze');
    if (w.sound) Sound.play(w.sound, CONFIG.whimsy.soundDelayMs); // after the right/wrong chime
    this.timer = setTimeout(() => this.clear(bed), w.ms);
    return w;
  },
};
