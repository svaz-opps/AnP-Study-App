// ---------- ranks, mastery, review scheduling, scoring, badges ----------
// Every threshold used here is in 01-config.js.

// Badges. `id` is the key in saved progress, so it never changes (even when the number in
// it no longer matches the threshold). Descriptions are built from CONFIG.badges.
const BADGE_AT = CONFIG.badges;
const EXAM_PASS_PCT = Math.round(CONFIG.exam.passFraction * 100);
const NIGHT_TIME = BADGE_AT.nightHour > 12 ? `${BADGE_AT.nightHour - 12} PM` : `${BADGE_AT.nightHour} AM`;
const BADGES = [
  { id: 'first_shift', n: 'First Shift', d: 'Finish your first shift.', ico: 'clipboard' },
  { id: 'shift3', n: 'Regular', d: `Finish ${BADGE_AT.shift3} shifts.`, ico: 'calendar' },
  { id: 'shift_perfect', n: 'Perfect Shift', d: `Finish a ${BADGE_AT.shiftPerfectMin}-patient shift with no misses.`, ico: 'sparkle' },
  { id: 'streak10', n: 'On Fire', d: `Get ${BADGE_AT.streak10} right in a row.`, ico: 'flame' },
  { id: 'streak25', n: 'Unstoppable', d: `Get ${BADGE_AT.streak25} right in a row.`, ico: 'flame' },
  { id: 'comeback', n: 'Comeback Kid', d: 'Finish a shift on your last life.', ico: 'heart' },
  { id: 'codeblue', n: 'Code Blue Survivor', d: 'Finish a Code Blue round.', ico: 'alarm' },
  { id: 'codeblue12', n: 'Rapid Response', d: `Get ${BADGE_AT.codeblue12} right in one Code Blue round.`, ico: 'alarm' },
  { id: 'boss', n: 'Superbug Slayer', d: 'Defeat the Superbug.', ico: 'bug' },
  { id: 'boss_clean', n: 'No Help Needed', d: 'Defeat the Superbug without lifelines.', ico: 'trophy' },
  { id: 'sata', n: 'SATA Specialist', d: `Get ${BADGE_AT.sata} select-all questions fully right.`, ico: 'check' },
  { id: 'priority', n: 'Priority Pro', d: `Get ${BADGE_AT.priority} "see first" questions right.`, ico: 'target' },
  { id: 'teaching', n: 'Teaching Star', d: `Get ${BADGE_AT.teaching} "needs teaching" questions right.`, ico: 'book' },
  { id: 'math', n: 'Math Whiz', d: `Get ${BADGE_AT.math} med-math questions right.`, ico: 'pill' },
  { id: 'order', n: 'Step by Step', d: `Get ${BADGE_AT.order} ordering questions fully right.`, ico: 'clipboard' },
  { id: 'discharge25', n: 'Discharge Planner', d: `Discharge ${BADGE_AT.discharge25} missed patients.`, ico: 'bed' },
  { id: 'daystreak3', n: 'Three-Day Streak', d: `Study ${BADGE_AT.daystreak3} days in a row.`, ico: 'calendar' },
  { id: 'daystreak7', n: 'Week Warrior', d: `Study ${BADGE_AT.daystreak7} days in a row.`, ico: 'calendar' },
  { id: 'allrooms1', n: 'Floor Coverage', d: 'Earn a star in every room.', ico: 'star' },
  { id: 'allrooms3', n: 'Unit Expert', d: 'Earn 3 stars in every room.', ico: 'star' },
  { id: 'exam', n: 'Mock Exam', d: 'Finish an exam simulation.', ico: 'clipboard' },
  { id: 'exam80', n: 'Exam Ready', d: `Score ${EXAM_PASS_PCT}% or more on an exam simulation.`, ico: 'trophy' },
  { id: 'night', n: 'Night Shift', d: `Study after ${NIGHT_TIME}.`, ico: 'sparkle' },
  { id: 'chief', n: 'Chief Nurse', d: 'Reach the top rank.', ico: 'trophy' },
  { id: 'daily1', n: 'Daily Dose', d: 'Finish a daily challenge.', ico: 'calendar' },
  { id: 'daily3', n: 'Habit Forming', d: `Finish the daily challenge ${BADGE_AT.daily3} days in a row.`, ico: 'calendar' },
  { id: 'daily7', n: 'Daily Devotion', d: `Finish the daily challenge ${BADGE_AT.daily7} days in a row.`, ico: 'trophy' },
  { id: 'cards10', n: 'Fan Mail', d: `Collect ${BADGE_AT.cards10} thank-you cards.`, ico: 'card' },
  { id: 'cards25', n: 'Beloved', d: `Collect ${BADGE_AT.cards25} thank-you cards.`, ico: 'card' },
  { id: 'cards50', n: 'Patient Favorite', d: `Collect ${BADGE_AT.cards50} thank-you cards.`, ico: 'card' },
  { id: 'rapid', n: 'Cross-Trained', d: 'Get every Rapid Response question right in one shift.', ico: 'alarm' },
];

const Engine = {
  // ----- ranks + xp
  rankIndex(xp = WR.state.xp) {
    let i = 0;
    RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; });
    return i;
  },
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
  // r = { s: times seen, r: times right, w: times wrong, ok: right-day streak,
  //       od: last day answered right, ld: last day seen, miss: in Missed Patients }
  rec(qid) { return WR.state.items[qid]; },
  isSolid(r) { return !!r && r.ok >= CONFIG.mastery.solidDays; },
  touchDay() {
    const d = WR.state.days, t = todayStr();
    if (d.today !== t) {
      d.streak = d.last === yesterdayStr() ? d.streak + 1 : 1;
      d.last = t; d.today = t; d.answered = 0;
      d.active = (d.active || []).concat(t).slice(-CONFIG.history.activeDays);
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
      if (r.miss && this.isSolid(r)) { r.miss = false; s.discharged++; discharged = true; }
    } else {
      r.w++; r.ok = 0; r.miss = true;
    }
    const ts = s.typeStats[q.type] || (s.typeStats[q.type] = { n: 0, r: 0 });
    ts.n++; if (res.correct) ts.r++;
    const os = s.originStats[q.origin] || (s.originStats[q.origin] = { n: 0, r: 0 });
    os.n++; if (res.correct) os.r++;
    s.days.answered++;
    s.recent = [q.id].concat(s.recent.filter((x) => x !== q.id)).slice(0, CONFIG.history.recentQuestions);
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
      if (this.isSolid(r)) solid++;
      if (r.miss) missed++;
    }
    const total = qs.length || 1;
    const M = CONFIG.mastery;
    const stars = solid / total >= M.threeStars ? 3 : ever / total >= M.twoStars ? 2 : ever / total >= M.oneStar ? 1 : 0;
    return { total: qs.length, ever, solid, missed, seen, stars, everFrac: ever / total, solidFrac: solid / total };
  },
  missed(uid) {
    return Content.all().filter((q) => (!uid || q.unit === uid) && WR.state.items[q.id] && WR.state.items[q.id].miss);
  },
  shiftsDone() { return Object.values(WR.state.units).reduce((a, u) => a + (u.shifts || 0), 0); },
  bossUnlocked() {
    const rooms = Content.units.filter((u) => this.mastery(u.id).stars >= 1).length;
    return rooms >= CONFIG.boss.unlockRooms || this.shiftsDone() >= CONFIG.boss.unlockShifts;
  },

  // ----- picking patients
  // A question's chance of being picked is proportional to its weight (CONFIG.picking).
  // opts.weakBias favours rooms you have answered least; opts.everFrac(uid) supplies each
  // room's "answered right once" share (pass a memo when weighing many questions at once).
  weight(q, opts = {}) {
    const P = CONFIG.picking;
    const r = WR.state.items[q.id], t = todayStr();
    let w;
    if (!r || !r.s) w = q.origin === 'new' ? P.unseenNew : P.unseen;
    else if (r.miss) w = r.ld === t ? P.missedToday : P.missed;
    else if (!this.isSolid(r)) w = r.od === t ? P.learningRightToday : P.learning;
    else w = P.mastered;
    if (WR.state.recent.indexOf(q.id) !== -1) w *= P.recentFactor;
    if (opts.weakBias) {
      const everFrac = opts.everFrac ? opts.everFrac(q.unit) : this.mastery(q.unit).everFrac;
      w *= 1 + P.weakRoomBias * (1 - everFrac);
    }
    return w;
  },
  // each room's mastery, worked out once per pick instead of once per question
  everFracMemo() {
    const memo = {};
    return (uid) => (uid in memo ? memo[uid] : (memo[uid] = this.mastery(uid).everFrac));
  },
  pickShift(uid, n = MODES.shift.n) {
    return weightedSample(Content.byUnit[uid] || [], (q) => this.weight(q), n).map((q) => q.id);
  },
  pickReview(uid, n = MODES.review.n) {
    const P = CONFIG.picking;
    const pool = this.missed(uid);
    const w = (q) => (WR.state.items[q.id].ld === todayStr() ? P.reviewToday : P.reviewOtherDay);
    return weightedSample(pool, w, n).map((q) => q.id);
  },
  pickOne(filter, exclude = [], weakBias = true) {
    const pool = Content.all().filter((q) => filter(q) && exclude.indexOf(q.id) === -1);
    const everFrac = this.everFracMemo();
    const from = pool.length ? pool : Content.all().filter(filter);
    const got = weightedSample(from, (q) => this.weight(q, { weakBias, everFrac }), 1);
    return got.length ? got[0].id : null;
  },
  // Rapid Response: questions from OTHER rooms, so the shift suddenly demands recall of
  // older material (interleaving + spaced retrieval). Best first: items that are due or
  // fading, then rooms already played but not seen today, then easier items anywhere else.
  // Never two from the same room.
  rapidPicks(unit, n = CONFIG.events.rapid.questions, exclude = []) {
    const s = WR.state, t = todayStr(), today = dayNum(t);
    const others = Content.all().filter((q) => q.unit !== unit && exclude.indexOf(q.id) === -1);
    const age = (r) => (r && r.ld ? today - dayNum(r.ld) : 0);
    const played = (u) => (s.units[u] && s.units[u].shifts) || (Content.byUnit[u] || []).some((q) => s.items[q.id] && s.items[q.id].s);
    const due = others.filter((q) => {
      const r = s.items[q.id];
      if (!r || !r.s) return false;
      return r.miss ? age(r) >= 1 : !this.isSolid(r) && age(r) >= CONFIG.picking.rapidDueAfterDays;
    });
    const stale = others.filter((q) => { const r = s.items[q.id]; return played(q.unit) && (!r || r.ld !== t); });
    const easy = others.filter((q) => (q.diff || 1) <= 1);
    const out = [], used = new Set();
    for (const tier of [due, stale, easy, others]) {
      for (const q of shuffle(tier)) {
        if (out.length >= n) break;
        if (used.has(q.unit) || out.indexOf(q.id) !== -1) continue;
        out.push(q.id); used.add(q.unit);
      }
    }
    return out;
  },
  // today's daily challenge: a few weak or missed items + the rest from the whole bank, fixed for the day
  pickDaily() {
    const d = WR.state.daily, t = todayStr();
    if (d.date === t && d.qids && d.qids.length && d.qids.every((id) => Content.byId[id])) return d.qids.slice();
    const r = rng('daily:' + t);
    const byId = (a, b) => (a.id < b.id ? -1 : 1);
    const weak = Engine.missed().sort(byId);
    const out = shuffle(weak, r).slice(0, CONFIG.daily.fromMissed).map((q) => q.id);
    const rest = Content.all().filter((q) => out.indexOf(q.id) === -1).sort(byId);
    out.push(...shuffle(rest, r).slice(0, MODES.daily.n - out.length).map((q) => q.id));
    d.date = t; d.qids = out.slice();
    return out;
  },
  pickExam(n = MODES.exam.n) {
    const E = CONFIG.exam;
    const out = [];
    for (const u of Content.units) {
      out.push(...weightedSample(Content.byUnit[u.id], (q) => this.weight(q), E.perRoom).map((q) => q.id));
    }
    const rest = Content.all().filter((q) => out.indexOf(q.id) === -1);
    const everFrac = this.everFracMemo();
    const w = (q) => this.weight(q, { weakBias: true, everFrac }) * (q.origin === 'new' ? E.newQuestionBoost : 1);
    out.push(...weightedSample(rest, w, n - out.length).map((q) => q.id));
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
  multiplier(streak) {
    const step = CONFIG.scoring.streakMultipliers.find((m) => streak >= m.streak);
    return step ? step.mult : 1;
  },
  points(q, frac, streak, bonus = 1) {
    const base = CONFIG.scoring.basePoints[q.type];
    const mult = frac === 1 ? this.multiplier(streak) : 1;
    return { base, mult, bonus, pts: Math.round(base * frac * mult * bonus) };
  },

  // ----- exam countdown + daily target
  daysToExam() {
    const d = WR.state.settings.examDate;
    if (!d) return null;
    return dayNum(d) - dayNum(todayStr());
  },
  dailyTarget() {
    const D = CONFIG.dailyTarget;
    if (WR.state.settings.dailyGoal) return WR.state.settings.dailyGoal;
    const left = this.daysToExam();
    if (left == null || left <= 0) return D.noExamDate;
    const solid = Object.values(WR.state.items).filter((r) => this.isSolid(r)).length;
    const todo = Content.all().length - solid;
    return clamp(Math.ceil(todo / left), D.min, D.max);
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
    const shifts = this.shiftsDone();
    give('first_shift', shifts >= 1);
    give('shift3', shifts >= BADGE_AT.shift3);
    give('streak10', s.bestStreak >= BADGE_AT.streak10);
    give('streak25', s.bestStreak >= BADGE_AT.streak25);
    const rightOfType = (t) => (s.typeStats[t] ? s.typeStats[t].r : 0);
    for (const t of ['sata', 'priority', 'teaching', 'math', 'order']) give(t, rightOfType(t) >= BADGE_AT[t]);
    give('discharge25', s.discharged >= BADGE_AT.discharge25);
    const nCards = Object.keys(s.cards || {}).length;
    give('cards10', nCards >= BADGE_AT.cards10);
    give('cards25', nCards >= BADGE_AT.cards25);
    give('cards50', nCards >= BADGE_AT.cards50);
    give('daystreak3', s.days.streak >= BADGE_AT.daystreak3);
    give('daystreak7', s.days.streak >= BADGE_AT.daystreak7);
    give('night', new Date().getHours() >= BADGE_AT.nightHour);
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
