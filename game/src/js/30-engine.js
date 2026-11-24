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
  // r = { s: times seen, r: times right, w: times wrong, ok: right days since the last miss,
  //       od: last of those right days, ld: last day seen, miss: in Missed Patients,
  //       h: times right only with the 50/50 (seen, but not proof you know it) }
  rec(qid) { return WR.state.items[qid]; },
  isSolid(r) { return !!r && r.ok >= CONFIG.mastery.solidDays; },
  touchDay() {
    const d = WR.state.days, t = todayStr();
    if (d.today !== t) {
      d.streak = d.last === yesterdayStr() ? d.streak + 1 : 1;
      d.last = t; d.today = t; d.answered = 0;
      d.active = (d.active || []).concat(t).slice(-CONFIG.history.activeDays);
      const keep = dayNum(t) - CONFIG.history.histDays;
      d.hist = d.hist || {};
      for (const k of Object.keys(d.hist)) if (dayNum(k) < keep) delete d.hist[k];
    }
  },
  // the day streak as it stands today: it is broken once a whole day goes by with no answers
  dayStreak() {
    const d = WR.state.days;
    return d.last === todayStr() || d.last === yesterdayStr() ? d.streak || 0 : 0;
  },
  // opts.assisted: answered after "Ask a colleague". A right answer then counts as seen only (no mastery day,
  // no discharge, not in accuracy); a wrong one still counts as wrong.
  record(q, res, opts = {}) {
    this.touchDay();
    const s = WR.state, t = todayStr();
    const r = s.items[q.id] || (s.items[q.id] = { s: 0, r: 0, w: 0, ok: 0, od: '', ld: '', miss: false });
    const before = this.statusOf(r);
    const first = r.s === 0;
    const helped = !!opts.assisted && res.correct;
    r.s++; r.ld = t;
    let discharged = false;
    if (helped) {
      r.h = (r.h || 0) + 1;
    } else if (res.correct) {
      r.r++;
      if (r.od !== t) { r.ok++; r.od = t; }
      if (r.miss && this.isSolid(r)) { r.miss = false; s.discharged++; discharged = true; }
    } else {
      // a miss restarts the count of right days (so a right answer later today counts again)
      r.w++; r.ok = 0; r.od = ''; r.miss = true;
    }
    const bump = (o, k) => { const x = o[k] || (o[k] = { n: 0, r: 0 }); x.n++; if (res.correct) x.r++; };
    if (!helped) {
      bump(s.typeStats, q.type);
      bump(s.originStats, q.origin);
      if (first) {
        const f = s.firstStats;
        if (!f.since) f.since = t;
        bump(f.type, q.type);
        bump(f.origin, q.origin);
      }
    }
    s.days.answered++;
    const h = s.days.hist[t] || (s.days.hist[t] = { n: 0, r: 0, h: 0, m: 0 });
    h.n++;
    if (helped) h.h++; else if (res.correct) h.r++;
    h.m = this.solidCount();
    const e = { d: dayNum(t), u: q.unit, st: before, c: res.correct ? 1 : 0, t: q.type, o: q.origin === 'new' ? 1 : 0, f: first ? 1 : 0 };
    if (helped) e.h = 1;
    s.log.push(e);
    if (s.log.length > CONFIG.history.log) s.log.splice(0, s.log.length - CONFIG.history.log);
    s.recent = [q.id].concat(s.recent.filter((x) => x !== q.id)).slice(0, CONFIG.history.recentQuestions);
    return { first, discharged, helped };
  },

  // ----- what you know about each question, right now
  //   new       never answered right on your own (usually: never seen)
  //   missed    in Missed Patients: answered wrong, not yet right on solidDays different days since
  //   learning  answered right, not yet on solidDays different days
  //   mastered  right on solidDays different days, and not due for review yet
  //   due       mastered, but it's time to see it again (CONFIG.mastery.reviewAfterDays / examWeekRefresh)
  STATUSES: ['mastered', 'learning', 'due', 'missed', 'new'],
  // today's date and the exam-week cut-off, worked out once when classifying many questions
  statusCtx() {
    const today = dayNum(), M = CONFIG.mastery, left = this.daysToExam();
    const finalWeek = M.examWeekRefresh > 0 && left != null && left >= 0 && left < M.examWeekRefresh;
    // in the exam's final week: due if not seen since that week began
    return { today, refreshBefore: finalWeek ? today + left - M.examWeekRefresh + 1 : null };
  },
  statusOf(r, ctx = this.statusCtx()) {
    if (!r || !r.s) return 'new';
    if (r.miss) return 'missed';
    if (!this.isSolid(r)) return r.r ? 'learning' : 'new';
    const M = CONFIG.mastery, gaps = M.reviewAfterDays;
    const gap = gaps[Math.min(r.ok - M.solidDays, gaps.length - 1)];
    if (r.od && ctx.today - dayNum(r.od) >= gap) return 'due';
    if (ctx.refreshBefore != null && (!r.ld || dayNum(r.ld) < ctx.refreshBefore)) return 'due';
    return 'mastered';
  },
  status(qid, ctx) { return this.statusOf(WR.state.items[qid], ctx); },
  // how many questions are in each state
  breakdown(qs = Content.all(), ctx = this.statusCtx()) {
    const out = { total: qs.length, mastered: 0, learning: 0, due: 0, missed: 0, new: 0 };
    for (const q of qs) out[this.statusOf(WR.state.items[q.id], ctx)]++;
    return out;
  },
  solidCount() {
    let n = 0;
    for (const q of Content.all()) if (this.isSolid(WR.state.items[q.id])) n++;
    return n;
  },

  // ----- mastery
  // known now = learning + mastered + due (right on your own, not in Missed Patients): a miss takes a question
  // out until it is fixed. solid = mastered + due: time alone never takes a star away.
  mastery(uid, ctx) {
    const qs = Content.byUnit[uid] || [];
    const b = this.breakdown(qs, ctx);
    let seen = 0;
    for (const q of qs) { const r = WR.state.items[q.id]; if (r && r.s) seen++; }
    const known = b.learning + b.mastered + b.due, solid = b.mastered + b.due;
    const total = qs.length || 1;
    const M = CONFIG.mastery;
    const stars = solid / total >= M.threeStars ? 3 : known / total >= M.twoStars ? 2 : known / total >= M.oneStar ? 1 : 0;
    return {
      total: qs.length, ever: known, solid, missed: b.missed, due: b.due, learning: b.learning, unseen: b.new, seen,
      stars, everFrac: known / total, solidFrac: solid / total, b,
    };
  },
  missed(uid) {
    return Content.all().filter((q) => (!uid || q.unit === uid) && WR.state.items[q.id] && WR.state.items[q.id].miss);
  },
  due(uid) {
    const ctx = this.statusCtx();
    return Content.all().filter((q) => (!uid || q.unit === uid) && this.status(q.id, ctx) === 'due');
  },
  shiftsDone() { return Object.values(WR.state.units).reduce((a, u) => a + (u.shifts || 0), 0); },
  // once open, the OR stays open (stars can drop after a miss)
  bossUnlocked() {
    const u = WR.state.unlocks;
    if (u.boss) return true;
    const ctx = this.statusCtx();
    const rooms = Content.units.filter((x) => this.mastery(x.id, ctx).stars >= 1).length;
    const open = rooms >= CONFIG.boss.unlockRooms || this.shiftsDone() >= CONFIG.boss.unlockShifts;
    if (open) u.boss = true;
    return open;
  },

  // ----- picking patients
  // A question's chance of being picked is proportional to its weight (CONFIG.picking).
  // opts.weakBias favours rooms you have answered least; opts.everFrac(uid) supplies each
  // room's "answered right once" share (pass a memo when weighing many questions at once).
  // opts.ctx: a statusCtx() to reuse when weighing many questions
  weight(q, opts = {}) {
    const P = CONFIG.picking;
    const r = WR.state.items[q.id], t = todayStr();
    let w;
    if (!r || !r.s) w = q.origin === 'new' ? P.unseenNew : P.unseen;
    else if (r.miss) w = r.ld === t ? P.missedToday : P.missed;
    else if (!this.isSolid(r)) w = r.od === t ? P.learningRightToday : P.learning;
    else w = this.statusOf(r, opts.ctx || this.statusCtx()) === 'due' ? P.due : P.mastered;
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
    const ctx = this.statusCtx();
    return weightedSample(Content.byUnit[uid] || [], (q) => this.weight(q, { ctx }), n).map((q) => q.id);
  },
  // mastered questions that are due for review, most overdue first
  pickDue(n = MODES.review.n, uid = null) {
    const ctx = this.statusCtx(), items = WR.state.items;
    const age = (q) => ctx.today - dayNum(items[q.id].od || items[q.id].ld);
    return shuffle(this.due(uid)).sort((a, b) => age(b) - age(a)).slice(0, n).map((q) => q.id);
  },
  // questions for some focus points: missed first, then due, learning, never answered; mastered last
  pickFocus(points, n = MODES.review.n) {
    const rank = { missed: 0, due: 1, learning: 2, new: 3, mastered: 4 };
    const ctx = this.statusCtx();
    const ids = shuffle([...new Set(points.flatMap((a) => a.qids))]);
    return ids.sort((a, b) => rank[this.status(a, ctx)] - rank[this.status(b, ctx)]).slice(0, n);
  },
  pickReview(uid, n = MODES.review.n) {
    const P = CONFIG.picking;
    const pool = this.missed(uid);
    const w = (q) => (WR.state.items[q.id].ld === todayStr() ? P.reviewToday : P.reviewOtherDay);
    return weightedSample(pool, w, n).map((q) => q.id);
  },
  pickOne(filter, exclude = [], weakBias = true) {
    const pool = Content.all().filter((q) => filter(q) && exclude.indexOf(q.id) === -1);
    const everFrac = this.everFracMemo(), ctx = this.statusCtx();
    const from = pool.length ? pool : Content.all().filter(filter);
    const got = weightedSample(from, (q) => this.weight(q, { weakBias, everFrac, ctx }), 1);
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
    const ctx = this.statusCtx();
    const due = others.filter((q) => {
      const r = s.items[q.id];
      if (!r || !r.s) return false;
      if (r.miss) return age(r) >= 1;
      return this.isSolid(r) ? this.statusOf(r, ctx) === 'due' : age(r) >= CONFIG.picking.rapidDueAfterDays;
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
  // today's daily challenge: a few missed or due-for-review items + the rest from the whole bank, fixed for the day
  pickDaily() {
    const d = WR.state.daily, t = todayStr();
    if (d.date === t && d.qids && d.qids.length && d.qids.every((id) => Content.byId[id])) return d.qids.slice();
    const r = rng('daily:' + t);
    const byId = (a, b) => (a.id < b.id ? -1 : 1);
    const weak = Engine.missed().concat(Engine.due()).sort(byId);
    const out = shuffle(weak, r).slice(0, CONFIG.daily.fromMissed).map((q) => q.id);
    const rest = Content.all().filter((q) => out.indexOf(q.id) === -1).sort(byId);
    out.push(...shuffle(rest, r).slice(0, MODES.daily.n - out.length).map((q) => q.id));
    d.date = t; d.qids = out.slice();
    return out;
  },
  pickExam(n = MODES.exam.n) {
    const E = CONFIG.exam;
    const out = [];
    const ctx = this.statusCtx();
    for (const u of Content.units) {
      out.push(...weightedSample(Content.byUnit[u.id], (q) => this.weight(q, { ctx }), E.perRoom).map((q) => q.id));
    }
    const rest = Content.all().filter((q) => out.indexOf(q.id) === -1);
    const everFrac = this.everFracMemo();
    const w = (q) => this.weight(q, { weakBias: true, everFrac, ctx }) * (q.origin === 'new' ? E.newQuestionBoost : 1);
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
    return clamp(Math.ceil(this.workLeft() / left), D.min, D.max);
  },
  // right days still needed to master every question in the bank, plus one per review that is due
  workLeft() {
    const M = CONFIG.mastery, ctx = this.statusCtx();
    let n = 0;
    for (const q of Content.all()) {
      const r = WR.state.items[q.id], st = this.statusOf(r, ctx);
      if (st === 'due') n++;
      else if (st !== 'mastered') n += M.solidDays - Math.min(r ? r.ok : 0, M.solidDays - 1);
    }
    return n;
  },

  // ----- where you stand (report card)
  // Estimated exam score: your accuracy on questions answered in each state, pulled toward CONFIG.readiness.prior
  // while there are few answers, averaged over the whole bank by how many questions are in each state now.
  readiness() {
    const R = CONFIG.readiness, b = this.breakdown();
    const obs = {};
    for (const k of this.STATUSES) obs[k] = { n: 0, r: 0 };
    let n = 0;
    for (const e of WR.state.log) {
      if (e.h || !obs[e.st]) continue;
      obs[e.st].n++; obs[e.st].r += e.c; n++;
    }
    const parts = {};
    let est = 0;
    for (const k of this.STATUSES) {
      const acc = (obs[k].r + R.prior[k] * R.priorWeight) / (obs[k].n + R.priorWeight);
      parts[k] = { share: b[k] / (b.total || 1), acc, n: obs[k].n };
      est += parts[k].share * acc;
    }
    const conf = n >= R.confidence.fair ? 'fair' : n >= R.confidence.medium ? 'medium' : 'low';
    return { pct: n >= R.minAnswers ? Math.round(est * 100) : null, conf, n, need: Math.max(0, R.minAnswers - n), parts, b };
  },
  // questions mastered per day lately, and when the whole bank would be mastered at that rate
  pace() {
    const hist = WR.state.days.hist || {}, today = dayNum(), W = CONFIG.history.paceDays;
    const now = this.solidCount(), total = Content.all().length;
    // mastered count at the end of the last active day before the window (or the earliest day on record)
    let base = null, baseDay = null;
    const days = Object.keys(hist).sort();
    for (const k of days) { const dn = dayNum(k); if (dn <= today - W) { base = hist[k].m; baseDay = dn; } }
    if (base == null && days.length && dayNum(days[0]) < today) { base = hist[days[0]].m; baseDay = dayNum(days[0]); }
    const span = baseDay == null ? 0 : today - baseDay;
    const rate = span > 0 ? (now - base) / span : null;
    const left = total - now, examIn = this.daysToExam();
    const finishIn = rate > 0 ? Math.ceil(left / rate) : left === 0 ? 0 : null;
    return { now, total, left, rate, span, finishIn, examIn, onTrack: examIn != null && finishIn != null && finishIn <= examIn };
  },
  // accuracy on your last answers (not counting ones helped by the 50/50), and the day-by-day totals
  recent(days = 14) {
    const today = dayNum(), hist = WR.state.days.hist || {};
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const k = dayStr(today - i), h = hist[k] || { n: 0, r: 0, h: 0 };
      series.push({ day: k, n: h.n, r: h.r, graded: h.n - (h.h || 0) });
    }
    const sum = (arr) => arr.reduce((a, x) => ({ n: a.n + x.graded, r: a.r + x.r, all: a.all + x.n }), { n: 0, r: 0, all: 0 });
    const thisWeek = sum(series.slice(-7)), lastWeek = sum(series.slice(-14, -7));
    return { series, thisWeek, lastWeek };
  },
  // every instructor focus point, with how many of its (new) questions are in each state
  focusReport() {
    const ctx = this.statusCtx(), map = {};
    for (const sid of Object.keys(Content.sections)) {
      (Content.sections[sid].focus || []).forEach((_, i) => {
        map[sid + '#' + i] = { sec: sid, i, qids: [], b: { mastered: 0, learning: 0, due: 0, missed: 0, new: 0 } };
      });
    }
    for (const q of Content.all()) {
      for (const [sec, i] of q.focus || []) {
        const a = map[sec + '#' + i];
        if (!a) continue;
        a.qids.push(q.id);
        a.b[this.status(q.id, ctx)]++;
      }
    }
    const list = Object.values(map);
    for (const a of list) {
      const n = a.qids.length, seen = n - a.b.new;
      a.state = !n || a.b.new === n ? 'new' : a.b.mastered + a.b.due === n ? 'mastered' : 'progress';
      // share of the answered questions you don't know now (a due one counts half), smoothed by one
      // pretend right answer so 1 miss out of 1 doesn't outrank 3 out of 4
      a.weak = (a.b.missed + 0.5 * a.b.due) / (seen + 1);
    }
    return list;
  },
  weakFocus(n = 5) {
    return this.focusReport().filter((a) => a.b.missed + a.b.due > 0)
      .sort((x, y) => y.weak - x.weak || y.b.missed - x.b.missed).slice(0, n);
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
