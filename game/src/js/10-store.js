// ---------- saved progress ----------
// Saved in this browser right away, and to the artifact's private per-viewer store
// (claude.ai) when the page runs there, so progress survives Safari clearing site data.
const SAVE_KEY = 'ward-rounds-save-v1';
const SAVE_VERSION = 1;

function defaultState() {
  return {
    v: SAVE_VERSION,
    updatedAt: 0,
    profile: {
      name: '',
      onboarded: false,
      avatar: { skin: 2, hair: 0, hairColor: 1, eyes: 0, scrubs: 0, pattern: 0, acc: ['stethoscope'], shoes: 0 },
    },
    xp: 0,
    points: 0,
    bestStreak: 0,
    badges: {},
    items: {},          // qid -> { s: seen, r: right, w: wrong, ok: right-days streak, od: last right day, ld: last day seen, miss: bool }
    units: {},          // uid -> { shifts, perfect, best }
    typeStats: {},      // type -> { n, r }
    originStats: {},    // new|guide -> { n, r }
    discharged: 0,
    codeBlueBest: 0,
    boss: { wins: 0, best: 0, noLifelineWin: false },
    exams: [],
    days: { last: '', streak: 0, today: '', answered: 0, active: [] },
    recent: [],
    unlocks: {},
    settings: { sound: true, motion: 'auto', whimsy: 'full', text: 1, examDate: '', dailyGoal: 0 },
    daily: { date: '', qids: [], last: '', streak: 0, best: 0 },
    rapid: { n: 0, r: 0 },   // Rapid Response (cross-room recall) answers
    cards: {},          // qid -> { d: day earned }  thank-you cards from discharged patients
    openRun: null,      // autosaved round in progress: { at, run }
    tips: {},           // one-time hints already dismissed, e.g. { iosSave: true }
  };
}

function mergeDefaults(base, saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
  for (const k of Object.keys(saved)) {
    const b = base[k], s = saved[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && s && typeof s === 'object' && !Array.isArray(s)) base[k] = mergeDefaults(b, s);
    else base[k] = s;
  }
  return base;
}

const Store = {
  state: null,
  cloud: { status: 'local', ref: null, writing: false, pending: false, lastWritten: 0 },
  listeners: [],

  init() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { saved = null; }
    this.state = mergeDefaults(defaultState(), saved);
    WR.state = this.state;
    this.connectCloud();
  },

  onChange(fn) { this.listeners.push(fn); },

  // opts.now: write straight away (end of a round, restore, reset) instead of after a short wait
  save(opts = {}) {
    this.state.updatedAt = Date.now();
    if (opts.now) { this._local.flush(); this._cloud.flush(); } else { this._local(); this._cloud(); }
  },

  // autosave the round in progress (or clear it once the round is over / left)
  holdRun: false,       // a saved round is waiting on Resume / Discard: don't clear it yet
  saveRun() {
    const run = App.run;
    if (this.holdRun) { if (!run) return; this.holdRun = false; } // starting a new round replaces it
    const next = run && !run.over && run.cur ? { at: Date.now(), run: run.serialize() } : null;
    if (!next && !this.state.openRun) return;
    this.state.openRun = next;
    this.save();
  },

  // Writing the whole save is the slowest thing a tap can trigger, so it waits until taps stop
  // and the browser is idle (never in the middle of an animation). Leaving or hiding the page
  // always writes straight away (90-boot.js), so nothing is lost.
  _local: debounce(function () {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(Store.state)); } catch (e) { /* storage blocked: cloud save still runs */ }
  }, CONFIG.timing.saveLocalMs, { idle: true }),

  _cloud: debounce(function () { Store._cloudWrite(); }, CONFIG.timing.saveCloudMs, { idle: true }),

  async _cloudWrite() {
    const c = this.cloud;
    if (!c.ref) return;
    if (c.writing) { c.pending = true; return; }
    if (this.state.updatedAt <= c.lastWritten) return;
    c.writing = true;
    const snapshot = JSON.parse(JSON.stringify(this.state));
    try {
      await c.ref.set(snapshot);
      c.lastWritten = snapshot.updatedAt;
      c.status = 'cloud';
    } catch (e) {
      if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) { c.ref = null; c.status = 'local'; }
      else c.status = 'offline';
    } finally {
      c.writing = false;
      if (c.pending) { c.pending = false; this._cloudWrite(); }
    }
  },

  async connectCloud() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      const ref = db.doc('data/users/' + uid + '/save');
      const snap = await Promise.race([ref.get(), sleep(CONFIG.timing.cloudLoadTimeoutMs).then(() => null)]);
      this.cloud.ref = ref;
      this.cloud.status = 'cloud';
      if (snap && snap.exists) {
        const remote = snap.data();
        if (remote && (remote.updatedAt || 0) > (this.state.updatedAt || 0)) {
          this.state = mergeDefaults(defaultState(), JSON.parse(JSON.stringify(remote)));
          WR.state = this.state;
          this.cloud.lastWritten = remote.updatedAt;
          this._local.flush();
          this.listeners.forEach((fn) => fn('remote'));
          return;
        }
        this.cloud.lastWritten = remote ? remote.updatedAt || 0 : 0;
      }
      if (this.state.updatedAt > this.cloud.lastWritten) this._cloudWrite();
    } catch (e) {
      this.cloud.status = 'local';
    }
  },

  exportText() {
    return JSON.stringify({ app: 'ward-rounds', exported: new Date().toISOString(), save: this.state }, null, 1);
  },

  importText(text) {
    const obj = JSON.parse(text);
    const save = obj && obj.app === 'ward-rounds' ? obj.save : obj;
    if (!save || typeof save !== 'object' || !save.profile || !save.items) throw new Error('That file is not a Ward Rounds backup.');
    this.state = mergeDefaults(defaultState(), save);
    WR.state = this.state;
    this.save({ now: true });
  },

  reset() {
    const keepSettings = this.state.settings;
    this.state = defaultState();
    this.state.settings = keepSettings;
    WR.state = this.state;
    this.save({ now: true });
  },
};
