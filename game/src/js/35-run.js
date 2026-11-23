// ---------- a play session: shift, review, code blue, boss, exam ----------
const MODES = {
  shift: { lives: 3, n: 10, feedback: true, lifelines: true },
  review: { lives: 0, n: 10, feedback: true, lifelines: false },
  codeblue: { lives: 0, n: Infinity, feedback: false, lifelines: false, time: 60 },
  boss: { lives: 3, n: Infinity, feedback: true, lifelines: true, hp: 1500 },
  exam: { lives: 0, n: 50, feedback: false, lifelines: false },
};

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
    this.lifelines = m.lifelines ? { colleague: 1, coffee: 1 } : { colleague: 0, coffee: 0 };
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
  }

  get q() { return this.cur ? Content.byId[this.cur.qid] : null; }
  get total() { return this.cfg.n === Infinity ? null : this.queue.length; }

  next() {
    if (this.over) return false;
    this.idx++;
    let qid;
    if (this.mode === 'codeblue') {
      qid = Engine.pickOne((q) => Content.isQuick(q), this.results.map((r) => r.qid).concat(WR.state.recent.slice(0, 10)));
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
    const pts = Engine.points(q, res.frac, this.streak);
    c.pts = pts;
    this.score += pts.pts;
    WR.state.points += pts.pts;
    const lostLife = !res.correct && res.frac < 0.5;
    c.lostLife = false;
    if (this.maxLives && lostLife) { this.lives--; c.lostLife = true; }
    if (this.mode === 'codeblue') this.timeLeft = Math.max(0, this.timeLeft + (res.correct ? 3 : -5));
    if (this.mode === 'boss') {
      if (res.correct) { c.dmg = Math.round(100 * Engine.multiplier(this.streak)); this.hp = Math.max(0, this.hp - c.dmg); }
      else { c.heal = 80; this.hp = Math.min(this.maxHp, this.hp + 80); }
      const newPhase = this.hp <= this.maxHp / 3 ? 2 : this.hp <= (this.maxHp * 2) / 3 ? 1 : 0;
      c.phaseUp = newPhase > this.phase;
      this.phase = Math.max(this.phase, newPhase);
    }
    if (this.streak > 0 && this.streak % 10 === 0 && this.cfg.lifelines) { this.lifelines.coffee++; c.bonusCoffee = true; }
    const rec = Engine.record(q, res);
    c.discharged = rec.discharged;
    this.results.push({ qid: q.id, correct: res.correct, frac: res.frac, pts: pts.pts, ans });
    const xp = pts.pts / 10;
    const up = Engine.addXP(xp);
    if (up != null) this.rankUp = up;
    const badges = Engine.checkBadges();
    this.newBadges.push(...badges);
    c.badges = badges;
    Store.save();
    if (this.mode === 'boss' && this.hp <= 0) { this.won = true; }
    return res;
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
    return !!(this.lifelines.colleague && c && !c.revealed && (this.q.type === 'order' ? c.sel[0] !== 0 || c.sel.length !== 1 : this.colleagueCuts().length));
  }

  useColleague() {
    const c = this.cur, q = this.q;
    if (!this.canColleague()) return false;
    if (q.type === 'order') {
      this.lifelines.colleague--; this.usedLifeline = true;
      c.sel = [0];
      c.gone = [];
      c.hint = 'Your colleague placed the first step for you.';
    } else {
      // single answer: a true 50/50 (the right answer + one wrong one stay)
      // select all that apply: half the wrong options go, rounded up
      const remove = this.colleagueCuts();
      this.lifelines.colleague--; this.usedLifeline = true;
      c.gone.push(...remove);
      c.sel = c.sel.filter((i) => remove.indexOf(i) === -1);
      c.hint = q.type === 'sata' ? `Your colleague crossed out ${remove.length} wrong option${remove.length > 1 ? 's' : ''}.` : "Your colleague narrowed it down to two. It's one of these.";
    }
    return true;
  }

  useCoffee() {
    if (!this.lifelines.coffee || this.lives >= this.maxLives) return false;
    this.lifelines.coffee--; this.usedLifeline = true;
    this.lives++;
    return true;
  }

  stress() {
    let s;
    if (this.mode === 'codeblue') s = 0.5 + 0.45 * (1 - this.timeLeft / 60);
    else if (this.mode === 'boss') s = 0.32 + this.phase * 0.14 + (this.maxLives - this.lives) * 0.1;
    else if (this.mode === 'exam') s = 0.3;
    else s = 0.12 + (this.maxLives ? (this.maxLives - this.lives) * 0.2 : 0);
    s += Math.min(0.3, this.wrongRun * 0.12) - Math.min(0.1, this.streak * 0.02);
    return clamp(s, 0.05, 1);
  }

  finish() {
    if (this.over) return;
    this.over = true;
    const s = WR.state;
    const right = this.results.filter((r) => r.correct).length;
    const extra = [];
    let bonus = 0;
    if (this.mode === 'shift') {
      const u = s.units[this.unit] || (s.units[this.unit] = { shifts: 0, perfect: 0, best: 0 });
      u.shifts++;
      u.best = Math.max(u.best, this.score);
      bonus += 20;
      if (this.results.length >= this.queue.length && right === this.results.length && this.results.length >= 10) { u.perfect++; extra.push('shift_perfect'); bonus += 50; }
      if (this.lives === 1 && this.results.length >= this.queue.length) extra.push('comeback');
    }
    if (this.mode === 'codeblue') {
      extra.push('codeblue');
      if (right >= 12) extra.push('codeblue12');
      s.codeBlueBest = Math.max(s.codeBlueBest, this.score);
      bonus += right * 2;
    }
    if (this.mode === 'boss') {
      s.boss.best = Math.max(s.boss.best, this.score);
      if (this.won) { s.boss.wins++; extra.push('boss'); bonus += 150; if (!this.usedLifeline) { extra.push('boss_clean'); s.boss.noLifelineWin = true; } }
    }
    if (this.mode === 'exam') {
      const pct = this.results.length ? right / this.results.length : 0;
      const byUnit = {};
      this.results.forEach((r) => { const u = Content.byId[r.qid].unit; byUnit[u] = byUnit[u] || [0, 0]; byUnit[u][1]++; if (r.correct) byUnit[u][0]++; });
      s.exams = s.exams.concat({ date: todayStr(), n: this.results.length, right, byUnit }).slice(-20);
      extra.push('exam');
      if (pct >= 0.8 && this.results.length >= 40) extra.push('exam80');
      bonus += 40;
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
    const r = new Run(o.mode, { unit: o.unit, queue: o.queue });
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
    const P = {
      floor: [
        `Ready for rounds, ${n}? Tap a room to start a shift.`,
        'Missed patients come back until you get them right on 2 different days.',
        'Rooms 107 to 109 have the most instructor focus points.',
        hour < 12 ? `Good morning, ${n}! Coffee first, then rounds.` : hour >= 21 ? `Night shift, ${n}? Short shifts beat cramming.` : `Afternoon rounds, ${n}. Let's go!`,
        'Every answer has a "why". Reading it is where the learning happens.',
      ],
      start: ['10 patients, 3 lives. You got this.', 'Read the last line of each question first.', 'New shift! Slow is smooth, smooth is fast.'],
      right: ['Nice catch!', "That's right!", 'Textbook!', 'Exactly.', 'Nailed it.', 'Your patient thanks you.'],
      streak: [`${ctx.streak} in a row! You're on fire.`, `Streak ×${Engine.multiplier(ctx.streak || 0)}! Keep it going.`, `${ctx.streak} straight. Charge nurse is watching!`],
      wrong: ['Shake it off. Read the why.', "Close one. Now you'll remember it.", "That's how we learn. It's in Missed Patients now.", 'Breathe. Next patient.'],
      part: ['Partly there! Check which ones you missed.', 'Almost. SATA is all or nothing for the streak.'],
      low: ['Last life! Slow down and read every option.', 'One life left. Use a lifeline if you need it.'],
      back: ['Back on track!', "There it is. That's my nurse."],
      codeblue: ['Code Blue! Quick and calm.', 'Trust your first instinct.', 'Every right answer buys 3 seconds!'],
      boss: ['The Superbug hates good nursing!', 'Hit it with what you know!', 'Wrong answers heal it. Focus!'],
      bossPhase: ["It's mutating! Questions just got harder.", 'It changed color. Stay sharp!'],
      exam: ['Exam mode: no hints until the end.', 'Pace yourself. One question at a time.'],
      review: ['Re-rounding on missed patients. Second chances!', 'Two right days and they are discharged.'],
      win: ['What a shift!', 'You crushed it!', 'Chief Nurse material.'],
      lose: ['Rough shift. The misses are saved for review.', 'Every nurse has hard shifts. Review and come back.'],
    };
    const pool = P[kind] || P.floor;
    let s = pick(pool);
    if (kind === 'right' && ctx.trick && Math.random() < 0.4) s = 'Remember: ' + ctx.trick;
    return s;
  },
  mood(kind) {
    return { right: 'happy', streak: 'cheer', wrong: 'worried', part: 'focus', low: 'worried', back: 'happy', codeblue: 'focus', boss: 'focus', bossPhase: 'worried', win: 'cheer', lose: 'sad', exam: 'focus', review: 'happy', start: 'happy' }[kind] || 'happy';
  },
};
