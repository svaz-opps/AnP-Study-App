// ---------- a play session: shift, review, code blue, boss, exam ----------
// Modes (CONFIG.modes) and random shift events (CONFIG.events) are set in 01-config.js.
// Each event touches only the questions listed in event.qids:
//  rapid:   questions from OTHER rooms dropped into the shift; extra points, no life lost
//  visitor: a family member's extra quick question; bonus XP, no life lost
//  outage:  a few questions by flashlight (the bedside goes dark, the chart stays readable); extra points
const EVENT_TYPES = ['rapid', 'visitor', 'outage'];
const EVENTS = CONFIG.events;

class Run {
  constructor(mode, opts = {}) {
    const m = MODES[mode];
    this.mode = mode;
    this.cfg = m;
    this.unit = opts.unit || null;
    this.seed = Math.floor(Math.random() * 1e9);
    this.queue = opts.queue || [];
    this.idx = -1;
    this.maxLives = m.lives;
    this.lives = m.lives;
    this.score = 0;
    this.streak = 0;
    this.wrongRun = 0;
    this.best = 0;
    this.results = [];
    const L = CONFIG.lifelines;
    this.lifelines = m.lifelines ? { colleague: L.colleague, coffee: L.coffee } : { colleague: 0, coffee: 0 };
    this.usedLifeline = false;
    this.timeLeft = m.time || 0;
    this.hp = m.hp || 0;
    this.maxHp = m.hp || 0;
    this.phase = 0;
    this.over = false;
    this.won = false;
    this.cur = null;
    this.xpStart = WR.state.xp;
    this.rankUp = null;
    this.newBadges = [];
    this.event = null;
    if (mode === 'shift' && !opts.restoring) this.rollEvent(opts.event);
  }

  // maybe add a random event to this shift (force one with type, or 'none' for no event)
  rollEvent(force) {
    if (force === 'none') return;
    const r = rng(this.seed + ':event');
    const roll = r();
    const type = force || (roll < EVENTS.chance ? EVENT_TYPES[Math.floor(r() * EVENT_TYPES.length)] : null);
    if (!type || EVENT_TYPES.indexOf(type) === -1) return;
    const ev = EVENTS[type];
    const q = this.queue;
    let at, qids;
    if (type === 'rapid') {
      at = Math.min(q.length, ev.startFrom + Math.floor(r() * ev.startSpread));
      qids = Engine.rapidPicks(this.unit, ev.questions, q);
      if (qids.length < ev.questions) return;
      q.splice(at, 0, ...qids);
    } else if (type === 'visitor') {
      at = Math.min(q.length, ev.at);
      const id = Engine.pickOne((x) => x.unit === this.unit && Content.isQuick(x), q) || Engine.pickOne((x) => Content.isQuick(x), q);
      if (!id || q.indexOf(id) !== -1) return;
      qids = [id];
      q.splice(at, 0, id);
    } else {
      at = Math.min(Math.max(0, q.length - ev.questions), ev.startFrom + Math.floor(r() * ev.startSpread));
      qids = q.slice(at, at + ev.questions);
    }
    this.event = { type, at, qids, results: [] };
  }
  // the event the current question belongs to (or null)
  evNow() {
    const e = this.event;
    return e && this.cur && e.qids.indexOf(this.cur.qid) !== -1 ? e : null;
  }
  evFirst() { const e = this.evNow(); return !!(e && e.qids[0] === this.cur.qid); }

  get q() { return this.cur ? Content.byId[this.cur.qid] : null; }
  get total() { return this.cfg.n === Infinity ? null : this.queue.length; }

  next() {
    if (this.over) return false;
    this.idx++;
    let qid;
    if (this.mode === 'codeblue') {
      const seen = this.results.map((r) => r.qid).concat(WR.state.recent.slice(0, CONFIG.codeBlue.skipRecent));
      qid = Engine.pickOne((q) => Content.isQuick(q), seen);
    } else if (this.mode === 'boss') {
      const hard = this.phase >= 1;
      qid = Engine.pickOne((q) => (hard ? q.diff >= 2 || q.type !== 'mcq' : true), this.results.map((r) => r.qid));
    } else {
      if (this.idx >= this.queue.length) { this.finish(); return false; }
      qid = this.queue[this.idx];
    }
    if (!qid) { this.finish(); return false; }
    const q = Content.byId[qid];
    const r = rng(this.seed + ':' + qid);
    const n = q.type === 'order' ? q.steps.length : q.opts.length;
    this.cur = {
      qid,
      order: shuffle([...Array(n).keys()], r),
      sel: [],
      gone: [],
      revealed: false,
      res: null,
      pts: null,
      patient: patientFor(q, String(this.seed)),
    };
    return true;
  }

  toggle(i) {
    const c = this.cur, q = this.q;
    if (!c || c.revealed || c.gone.indexOf(i) !== -1) return;
    if (q.type === 'sata') {
      const k = c.sel.indexOf(i);
      if (k === -1) c.sel.push(i); else c.sel.splice(k, 1);
    } else if (q.type === 'order') {
      const k = c.sel.indexOf(i);
      if (k === -1) c.sel.push(i); else c.sel.splice(k);
    } else {
      c.sel = [i];
    }
  }

  ready() {
    const c = this.cur, q = this.q;
    if (!c || c.revealed) return false;
    if (q.type === 'sata') return c.sel.length > 0;
    if (q.type === 'order') return c.sel.length === q.steps.length;
    return c.sel.length === 1;
  }

  submit() {
    const c = this.cur, q = this.q;
    const ans = q.type === 'sata' || q.type === 'order' ? c.sel.slice() : c.sel[0];
    const res = Engine.grade(q, ans);
    c.res = res; c.revealed = true;
    if (res.correct) { this.streak++; this.wrongRun = 0; } else { this.streak = 0; this.wrongRun++; }
    this.best = Math.max(this.best, this.streak);
    WR.state.bestStreak = Math.max(WR.state.bestStreak, this.streak);
    const ev = this.evNow();
    const evInfo = ev ? EVENTS[ev.type] : null;
    const pts = Engine.points(q, res.frac, this.streak, evInfo ? evInfo.bonus : 1);
    c.pts = pts;
    this.score += pts.pts;
    WR.state.points += pts.pts;
    if (ev) {
      c.ev = ev.type;
      ev.results.push({ qid: q.id, correct: res.correct });
      if (ev.type === 'rapid') { const ra = WR.state.rapid; ra.n++; if (res.correct) ra.r++; }
    }
    const lostLife = !res.correct && res.frac < CONFIG.lifeLostBelow && !(evInfo && evInfo.safe);
    c.evSafe = !res.correct && !!(evInfo && evInfo.safe);
    c.lostLife = false;
    if (this.maxLives && lostLife) { this.lives--; c.lostLife = true; }
    if (this.mode === 'codeblue') {
      const CB = CONFIG.codeBlue;
      this.timeLeft = Math.max(0, this.timeLeft + (res.correct ? CB.secondsPerRight : -CB.secondsPerWrong));
    }
    if (this.mode === 'boss') this.hitBoss(c, res);
    const every = CONFIG.lifelines.bonusCoffeeEvery;
    if (this.streak > 0 && this.streak % every === 0 && this.cfg.lifelines) { this.lifelines.coffee++; c.bonusCoffee = true; }
    const rec = Engine.record(q, res, { assisted: !!c.assisted });
    c.discharged = rec.discharged;
    c.helped = rec.helped;
    c.card = rec.discharged && Cards.give(q) ? q.id : null;
    this.results.push({ qid: q.id, correct: res.correct, frac: res.frac, pts: pts.pts, ans });
    const xp = pts.pts / CONFIG.scoring.pointsPerXP + (evInfo && evInfo.xp && res.correct ? evInfo.xp : 0);
    const up = Engine.addXP(xp);
    if (up != null) this.rankUp = up;
    const badges = Engine.checkBadges();
    this.newBadges.push(...badges);
    c.badges = badges;
    Store.save();
    if (this.mode === 'boss' && this.hp <= 0) { this.won = true; }
    return res;
  }

  // a right answer damages the Superbug, a wrong one heals it; it changes phase as its HP falls
  hitBoss(c, res) {
    const BOSS = CONFIG.boss;
    if (res.correct) {
      c.dmg = Math.round(BOSS.damagePerRight * Engine.multiplier(this.streak));
      this.hp = Math.max(0, this.hp - c.dmg);
    } else {
      c.heal = BOSS.healPerWrong;
      this.hp = Math.min(this.maxHp, this.hp + BOSS.healPerWrong);
    }
    const newPhase = BOSS.phaseAt.filter((f) => this.hp <= this.maxHp * f).length;
    c.phaseUp = newPhase > this.phase;
    this.phase = Math.max(this.phase, newPhase);
  }

  isEnd() {
    if (this.mode === 'boss' && (this.hp <= 0 || this.lives <= 0)) return true;
    if (this.maxLives && this.lives <= 0) return true;
    if (this.mode === 'codeblue') return this.timeLeft <= 0;
    if (this.cfg.n !== Infinity) return this.idx >= this.queue.length - 1;
    return false;
  }

  // wrong options the colleague would cross out (none for ordering, or when only 2 options are left)
  colleagueCuts() {
    const c = this.cur, q = this.q;
    if (!c || q.type === 'order') return [];
    const wrong = c.order.filter((i) => !q.opts[i].c && c.gone.indexOf(i) === -1);
    const n = q.type === 'sata' ? Math.ceil(wrong.length / 2) : wrong.length - 1;
    return shuffle(wrong).slice(0, Math.max(0, n));
  }
  canColleague() {
    const c = this.cur;
    if (!this.lifelines.colleague || !c || c.revealed) return false;
    // ordering: useful unless the first step is already the only one placed; otherwise: something to cross out
    return this.q.type === 'order' ? c.sel[0] !== 0 || c.sel.length !== 1 : this.colleagueCuts().length > 0;
  }

  useColleague() {
    const c = this.cur, q = this.q;
    if (!this.canColleague()) return false;
    if (q.type === 'order') {
      this.lifelines.colleague--; this.usedLifeline = true; c.assisted = true;
      c.sel = [0];
      c.gone = [];
      c.hint = 'Your colleague placed the first step for you.';
    } else {
      // single answer: a true 50/50 (the right answer + one wrong one stay)
      // select all that apply: half the wrong options go, rounded up
      const remove = this.colleagueCuts();
      this.lifelines.colleague--; this.usedLifeline = true; c.assisted = true;
      c.gone.push(...remove);
      c.sel = c.sel.filter((i) => remove.indexOf(i) === -1);
      c.hint = q.type === 'sata'
        ? `Your colleague crossed out ${remove.length} wrong option${remove.length > 1 ? 's' : ''}.`
        : "Your colleague narrowed it down to two. It's one of these.";
    }
    return true;
  }

  useCoffee() {
    if (!this.lifelines.coffee || this.lives >= this.maxLives) return false;
    this.lifelines.coffee--; this.usedLifeline = true;
    this.lives++;
    return true;
  }

  // 0..1: drives the heart monitor's rate and colour (CONFIG.monitor.stress)
  stress() {
    const S = CONFIG.monitor.stress, lost = this.maxLives - this.lives;
    let s;
    if (this.mode === 'codeblue') s = S.codeBlueStart + S.codeBlueRise * (1 - this.timeLeft / this.cfg.time);
    else if (this.mode === 'boss') s = S.boss + this.phase * S.bossPerPhase + lost * S.bossPerLifeLost;
    else if (this.mode === 'exam') s = S.exam;
    else s = S.shift + (this.maxLives ? lost * S.perLifeLost : 0);
    s += Math.min(S.wrongCap, this.wrongRun * S.perWrongInARow) - Math.min(S.rightCap, this.streak * S.perRightInARow);
    return clamp(s, 0.05, 1);
  }

  finish() {
    if (this.over) return;
    this.over = true;
    const s = WR.state;
    const right = this.results.filter((r) => r.correct).length;
    const extra = [];
    const XP = CONFIG.bonusXP;
    let bonus = 0;
    if (this.mode === 'shift') {
      const u = s.units[this.unit] || (s.units[this.unit] = { shifts: 0, perfect: 0, best: 0 });
      u.shifts++;
      u.best = Math.max(u.best, this.score);
      bonus += XP.shift;
      const full = this.results.length >= this.queue.length;
      if (full && right === this.results.length && this.results.length >= CONFIG.badges.shiftPerfectMin) {
        u.perfect++; extra.push('shift_perfect'); bonus += XP.perfectShift;
      }
      if (this.lives === 1 && full) extra.push('comeback');
      const ev = this.event;
      if (ev && ev.type === 'rapid' && ev.results.length === ev.qids.length && ev.results.every((x) => x.correct)) extra.push('rapid');
    }
    if (this.mode === 'daily') {
      const d = s.daily, t = todayStr();
      this.dailyFirst = d.last !== t && this.results.length >= this.queue.length;
      if (this.dailyFirst) {
        d.streak = d.last === yesterdayStr() ? d.streak + 1 : 1;
        d.last = t;
        d.best = Math.max(d.best, right);
        bonus += XP.daily;
        extra.push('daily1');
        if (d.streak >= CONFIG.badges.daily3) extra.push('daily3');
        if (d.streak >= CONFIG.badges.daily7) extra.push('daily7');
      }
    }
    if (this.mode === 'codeblue') {
      extra.push('codeblue');
      if (right >= CONFIG.badges.codeblue12) extra.push('codeblue12');
      s.codeBlueBest = Math.max(s.codeBlueBest, this.score);
      bonus += right * XP.codeBluePerRight;
    }
    if (this.mode === 'boss') {
      s.boss.best = Math.max(s.boss.best, this.score);
      if (this.won) {
        s.boss.wins++; extra.push('boss'); bonus += XP.bossWin;
        if (!this.usedLifeline) { extra.push('boss_clean'); s.boss.noLifelineWin = true; }
      }
    }
    if (this.mode === 'exam') {
      const pct = this.results.length ? right / this.results.length : 0;
      const byUnit = {};
      this.results.forEach((r) => {
        const u = Content.byId[r.qid].unit;
        byUnit[u] = byUnit[u] || [0, 0];
        byUnit[u][1]++;
        if (r.correct) byUnit[u][0]++;
      });
      s.exams = s.exams.concat({ date: todayStr(), n: this.results.length, right, byUnit }).slice(-CONFIG.history.exams);
      extra.push('exam');
      if (pct >= CONFIG.exam.passFraction && this.results.length >= CONFIG.exam.passMinQuestions) extra.push('exam80');
      bonus += XP.exam;
    }
    const up = Engine.addXP(bonus);
    if (up != null) this.rankUp = up;
    this.bonusXP = bonus;
    this.endBadges = Engine.checkBadges({ endOfRun: true, extra });
    this.newBadges.push(...this.endBadges);
    s.openRun = null;
    Store.save({ now: true });
  }

  // state that survives a page update while a round is open
  serialize() {
    const o = Object.assign({}, this);
    return JSON.parse(JSON.stringify(o));
  }
  static restore(o) {
    const r = new Run(o.mode, { unit: o.unit, queue: o.queue, restoring: true });
    Object.assign(r, o);
    r.cfg = MODES[o.mode];
    return r;
  }

  // a round brought back from the autosave; null if it can't continue (e.g. the question bank changed)
  static resume(o) {
    if (!o || !MODES[o.mode] || o.over || !o.cur) return null;
    const r = Run.restore(o);
    if (!r.q || r.results.some((x) => !Content.byId[x.qid])) return null;
    // timed / no-feedback modes move on by themselves after an answer; do that now
    if (r.cur.revealed && !r.cfg.feedback) {
      if (r.isEnd() || !r.next()) { if (!r.over) r.finish(); return null; }
    }
    return r;
  }
}

// ---------- what the nurse says ----------
const Talk = {
  name() { return WR.state.profile.name || 'friend'; },
  line(kind, ctx = {}) {
    const n = this.name();
    const hour = new Date().getHours();
    const days = CONFIG.mastery.solidDays, shift = MODES.shift;
    // what the nurse can say, by situation (one is picked at random)
    const P = {
      floor: [
        `Ready for rounds, ${n}? Tap a room to start a shift.`,
        `Missed patients come back until you get them right on ${days} different days.`,
        'Rooms 107 to 109 have the most instructor focus points.',
        hour < 12 ? `Good morning, ${n}! Coffee first, then rounds.`
          : hour >= 21 ? `Night shift, ${n}? Short shifts beat cramming.`
            : `Afternoon rounds, ${n}. Let's go!`,
        'Every answer has a "why". Reading it is where the learning happens.',
      ],
      start: [
        `${shift.n} patients, ${shift.lives} lives. You got this.`,
        'Read the last line of each question first.',
        'New shift! Slow is smooth, smooth is fast.',
      ],
      right: ['Nice catch!', "That's right!", 'Textbook!', 'Exactly.', 'Nailed it.', 'Your patient thanks you.'],
      streak: [
        `${ctx.streak} in a row! You're on fire.`,
        `Streak ×${Engine.multiplier(ctx.streak || 0)}! Keep it going.`,
        `${ctx.streak} straight. Charge nurse is watching!`,
      ],
      wrong: [
        'Shake it off. Read the why.',
        "Close one. Now you'll remember it.",
        "That's how we learn. It's in Missed Patients now.",
        'Breathe. Next patient.',
      ],
      part: ['Partly there! Check which ones you missed.', 'Almost. SATA is all or nothing for the streak.'],
      low: ['Last life! Slow down and read every option.', 'One life left. Use a lifeline if you need it.'],
      back: ['Back on track!', "There it is. That's my nurse."],
      codeblue: [
        'Code Blue! Quick and calm.',
        'Trust your first instinct.',
        `Every right answer buys ${CONFIG.codeBlue.secondsPerRight} seconds!`,
      ],
      boss: ['The Superbug hates good nursing!', 'Hit it with what you know!', 'Wrong answers heal it. Focus!'],
      bossPhase: ["It's mutating! Questions just got harder.", 'It changed color. Stay sharp!'],
      exam: ['Exam mode: no hints until the end.', 'Pace yourself. One question at a time.'],
      review: ['Re-rounding on missed patients. Second chances!', `${days} right days and they are discharged.`],
      rapid: [
        `Rapid Response, Room ${ctx.room}! Different floor, same brain. ×${EVENTS.rapid.bonus} points!`,
        `Overhead page: Rapid Response to Room ${ctx.room}. Switch gears!`,
      ],
      visitor: ['A family member has a quick question for you!', 'Visitor at the bedside! Answer them and earn bonus XP.'],
      outage: [
        `Power outage! Backup lights only. ×${EVENTS.outage.bonus} points while it lasts.`,
        `The lights went out! Charts still readable. ×${EVENTS.outage.bonus} points.`,
      ],
      daily: [
        `Today's daily challenge: ${MODES.daily.n} patients. Make them count!`,
        `Daily challenge! Same ${MODES.daily.n} patients all day.`,
      ],
      win: ['What a shift!', 'You crushed it!', 'Chief Nurse material.'],
      lose: ['Rough shift. The misses are saved for review.', 'Every nurse has hard shifts. Review and come back.'],
    };
    const pool = P[kind] || P.floor;
    let s = pick(pool);
    if (kind === 'right' && ctx.trick && Math.random() < CONFIG.talk.trickChance) s = 'Remember: ' + ctx.trick;
    return s;
  },
  // the nurse's face for each kind of line
  moods: {
    right: 'happy', streak: 'cheer', back: 'happy', win: 'cheer', review: 'happy', start: 'happy', visitor: 'happy', daily: 'happy',
    wrong: 'worried', low: 'worried', bossPhase: 'worried', outage: 'worried', lose: 'sad',
    part: 'focus', codeblue: 'focus', boss: 'focus', exam: 'focus', rapid: 'focus',
  },
  mood(kind) { return this.moods[kind] || 'happy'; },
};
