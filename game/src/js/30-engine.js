// ---------- ranks, mastery, review scheduling, scoring, badges ----------
const RANKS = [
  { n: 'Orientee', xp: 0 },
  { n: 'Graduate Nurse', xp: 400 },
  { n: 'Staff Nurse', xp: 1500 },
  { n: 'Charge Nurse', xp: 4000 },
  { n: 'Nurse Educator', xp: 7500 },
  { n: 'Nurse Manager', xp: 12000 },
  { n: 'Chief Nurse', xp: 18000 },
];

const BADGES = [
  { id: 'first_shift', n: 'First Shift', d: 'Finish your first shift.', ico: 'clipboard' },
  { id: 'shift3', n: 'Regular', d: 'Finish 3 shifts.', ico: 'calendar' },
  { id: 'shift_perfect', n: 'Perfect Shift', d: 'Finish a 10-patient shift with no misses.', ico: 'sparkle' },
  { id: 'streak10', n: 'On Fire', d: 'Get 10 right in a row.', ico: 'flame' },
  { id: 'streak25', n: 'Unstoppable', d: 'Get 25 right in a row.', ico: 'flame' },
  { id: 'comeback', n: 'Comeback Kid', d: 'Finish a shift on your last life.', ico: 'heart' },
  { id: 'codeblue', n: 'Code Blue Survivor', d: 'Finish a Code Blue round.', ico: 'alarm' },
  { id: 'codeblue12', n: 'Rapid Response', d: 'Get 12 right in one Code Blue round.', ico: 'alarm' },
  { id: 'boss', n: 'Superbug Slayer', d: 'Defeat the Superbug.', ico: 'bug' },
  { id: 'boss_clean', n: 'No Help Needed', d: 'Defeat the Superbug without lifelines.', ico: 'trophy' },
  { id: 'sata', n: 'SATA Specialist', d: 'Get 10 select-all questions fully right.', ico: 'check' },
  { id: 'priority', n: 'Priority Pro', d: 'Get 10 "see first" questions right.', ico: 'target' },
  { id: 'teaching', n: 'Teaching Star', d: 'Get 10 "needs teaching" questions right.', ico: 'book' },
  { id: 'math', n: 'Math Whiz', d: 'Get 5 med-math questions right.', ico: 'pill' },
  { id: 'order', n: 'Step by Step', d: 'Get 5 ordering questions fully right.', ico: 'clipboard' },
  { id: 'discharge25', n: 'Discharge Planner', d: 'Discharge 25 missed patients.', ico: 'bed' },
  { id: 'daystreak3', n: 'Three-Day Streak', d: 'Study 3 days in a row.', ico: 'calendar' },
  { id: 'daystreak7', n: 'Week Warrior', d: 'Study 7 days in a row.', ico: 'calendar' },
  { id: 'allrooms1', n: 'Floor Coverage', d: 'Earn a star in every room.', ico: 'star' },
  { id: 'allrooms3', n: 'Unit Expert', d: 'Earn 3 stars in every room.', ico: 'star' },
  { id: 'exam', n: 'Mock Exam', d: 'Finish an exam simulation.', ico: 'clipboard' },
  { id: 'exam80', n: 'Exam Ready', d: 'Score 80% or more on an exam simulation.', ico: 'trophy' },
  { id: 'night', n: 'Night Shift', d: 'Study after 10 PM.', ico: 'sparkle' },
  { id: 'chief', n: 'Chief Nurse', d: 'Reach the top rank.', ico: 'trophy' },
];

const Engine = {
  // ----- ranks + xp
  rankIndex(xp = WR.state.xp) { let i = 0; RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; }); return i; },
  rank(xp) { return RANKS[this.rankIndex(xp)]; },
  rankProgress(xp = WR.state.xp) {
    const i = this.rankIndex(xp), cur = RANKS[i], nxt = RANKS[i + 1];
    if (!nxt) return { i, cur, nxt: null, frac: 1, toGo: 0 };
    return { i, cur, nxt, frac: (xp - cur.xp) / (nxt.xp - cur.xp), toGo: nxt.xp - xp };
  },
  addXP(n) {
    const before = this.rankIndex();
    WR.state.xp += Math.max(0, Math.round(n));
    const after = this.rankIndex();
    return after > before ? after : null;
  },

  // ----- per-question review records
  rec(qid) { return WR.state.items[qid]; },
  touchDay() {
    const d = WR.state.days, t = todayStr();
    if (d.today !== t) {
      const yesterday = todayStr(new Date(Date.now() - 86400000));
      d.streak = d.last === yesterday ? d.streak + 1 : 1;
      d.last = t; d.today = t; d.answered = 0;
      d.active = (d.active || []).concat(t).slice(-90);
    }
  },
  record(q, res) {
    this.touchDay();
    const s = WR.state, t = todayStr();
    const r = s.items[q.id] || (s.items[q.id] = { s: 0, r: 0, w: 0, ok: 0, od: '', ld: '', miss: false });
    const first = r.s === 0;
    r.s++; r.ld = t;
    let discharged = false;
    if (res.correct) {
      r.r++;
      if (r.od !== t) { r.ok++; r.od = t; }
      if (r.miss && r.ok >= 2) { r.miss = false; s.discharged++; discharged = true; }
    } else {
      r.w++; r.ok = 0; r.miss = true;
    }
    const ts = s.typeStats[q.type] || (s.typeStats[q.type] = { n: 0, r: 0 });
    ts.n++; if (res.correct) ts.r++;
    const os = s.originStats[q.origin] || (s.originStats[q.origin] = { n: 0, r: 0 });
    os.n++; if (res.correct) os.r++;
    s.days.answered++;
    s.recent = [q.id].concat(s.recent.filter((x) => x !== q.id)).slice(0, 40);
    return { first, discharged };
  },

  // ----- mastery
  mastery(uid) {
    const qs = Content.byUnit[uid] || [];
    let ever = 0, solid = 0, missed = 0, seen = 0;
    for (const q of qs) {
      const r = WR.state.items[q.id];
      if (!r) continue;
      if (r.s) seen++;
      if (r.r) ever++;
      if (r.ok >= 2) solid++;
      if (r.miss) missed++;
    }
    const total = qs.length || 1;
    const stars = solid / total >= 0.9 ? 3 : ever / total >= 0.8 ? 2 : ever / total >= 0.6 ? 1 : 0;
    return { total: qs.length, ever, solid, missed, seen, stars, everFrac: ever / total, solidFrac: solid / total };
  },
  missed(uid) {
    return Content.all().filter((q) => (!uid || q.unit === uid) && WR.state.items[q.id] && WR.state.items[q.id].miss);
  },
  // The OR opens after a star in 4 rooms, or after 12 finished shifts, whichever comes first.
  BOSS_ROOMS: 4,
  BOSS_SHIFTS: 12,
  shiftsDone() { return Object.values(WR.state.units).reduce((a, u) => a + (u.shifts || 0), 0); },
  bossUnlocked() {
    const rooms = Content.units.filter((u) => this.mastery(u.id).stars >= 1).length;
    return rooms >= this.BOSS_ROOMS || this.shiftsDone() >= this.BOSS_SHIFTS;
  },

  // ----- picking patients
  weight(q, opts = {}) {
    const r = WR.state.items[q.id], t = todayStr();
    let w;
    if (!r || !r.s) w = q.origin === 'new' ? 3.6 : 3;
    else if (r.miss) w = r.ld === t ? 1.4 : 4.5;
    else if (r.ok < 2) w = r.od === t ? 0.6 : 1.8;
    else w = 0.35;
    if (WR.state.recent.indexOf(q.id) !== -1) w *= 0.12;
    if (opts.weakBias) w *= 1 + 1.2 * (1 - this.mastery(q.unit).everFrac);
    return w;
  },
  pickShift(uid, n = 10) {
    return weightedSample(Content.byUnit[uid] || [], (q) => this.weight(q), n).map((q) => q.id);
  },
  pickReview(uid, n = 10) {
    const pool = this.missed(uid);
    return weightedSample(pool, (q) => (WR.state.items[q.id].ld === todayStr() ? 1 : 3), n).map((q) => q.id);
  },
  pickOne(filter, exclude = [], weakBias = true) {
    const pool = Content.all().filter((q) => filter(q) && exclude.indexOf(q.id) === -1);
    const got = weightedSample(pool.length ? pool : Content.all().filter(filter), (q) => this.weight(q, { weakBias }), 1);
    return got.length ? got[0].id : null;
  },
  pickExam(n = 50) {
    const out = [];
    for (const u of Content.units) out.push(...weightedSample(Content.byUnit[u.id], (q) => this.weight(q), 2).map((q) => q.id));
    const rest = Content.all().filter((q) => out.indexOf(q.id) === -1);
    out.push(...weightedSample(rest, (q) => this.weight(q, { weakBias: true }) * (q.origin === 'new' ? 1.3 : 1), n - out.length).map((q) => q.id));
    return shuffle(out);
  },

  // ----- grading + points
  grade(q, ans) {
    if (q.type === 'sata') {
      const sel = ans || [];
      const nOk = q.opts.filter((o) => o.c).length;
      const good = sel.filter((i) => q.opts[i].c).length, bad = sel.length - good;
      const frac = Math.max(0, good - bad) / nOk;
      return { correct: good === nOk && bad === 0, frac };
    }
    if (q.type === 'order') {
      const seq = ans || [];
      const right = seq.filter((v, i) => v === i).length;
      return { correct: right === q.steps.length && seq.length === q.steps.length, frac: right / q.steps.length };
    }
    const ok = ans != null && q.opts[ans] && !!q.opts[ans].c;
    return { correct: ok, frac: ok ? 1 : 0 };
  },
  multiplier(streak) { return streak >= 10 ? 3 : streak >= 6 ? 2 : streak >= 3 ? 1.5 : 1; },
  points(q, frac, streak) {
    const base = TYPE_INFO[q.type].base;
    const mult = frac === 1 ? this.multiplier(streak) : 1;
    return { base, mult, pts: Math.round(base * frac * mult) };
  },

  // ----- exam countdown + daily target
  daysToExam() {
    const d = WR.state.settings.examDate;
    if (!d) return null;
    return dayNum(d) - dayNum(todayStr());
  },
  dailyTarget() {
    if (WR.state.settings.dailyGoal) return WR.state.settings.dailyGoal;
    const left = this.daysToExam();
    if (left == null || left <= 0) return 20;
    const solid = Object.values(WR.state.items).filter((r) => r.ok >= 2).length;
    const todo = Content.all().length - solid;
    return clamp(Math.ceil(todo / left), 10, 150);
  },

  // ----- badges
  award(id) {
    if (WR.state.badges[id]) return false;
    WR.state.badges[id] = Date.now();
    return true;
  },
  checkBadges(ctx = {}) {
    const s = WR.state, got = [];
    const give = (id, cond) => { if (cond && this.award(id)) got.push(id); };
    const shifts = Object.values(s.units).reduce((a, u) => a + (u.shifts || 0), 0);
    give('first_shift', shifts >= 1);
    give('shift3', shifts >= 3);
    give('streak10', s.bestStreak >= 10);
    give('streak25', s.bestStreak >= 25);
    const ts = (t) => (s.typeStats[t] ? s.typeStats[t].r : 0);
    give('sata', ts('sata') >= 10);
    give('priority', ts('priority') >= 10);
    give('teaching', ts('teaching') >= 10);
    give('math', ts('math') >= 5);
    give('order', ts('order') >= 5);
    give('discharge25', s.discharged >= 25);
    give('daystreak3', s.days.streak >= 3);
    give('daystreak7', s.days.streak >= 7);
    give('night', new Date().getHours() >= 22);
    give('chief', this.rankIndex() >= RANKS.length - 1);
    if (ctx.endOfRun) {
      const ms = Content.units.map((u) => this.mastery(u.id).stars);
      give('allrooms1', ms.every((x) => x >= 1));
      give('allrooms3', ms.every((x) => x >= 3));
    }
    (ctx.extra || []).forEach((id) => give(id, true));
    return got;
  },
};
