// ---------- patient chart (the question screen) ----------
const MODE_TITLE = { codeblue: 'Code Blue', boss: 'Operating Room', exam: 'Exam simulation', daily: 'Daily challenge' };

Screens.chart = {
  cls: 'chart',
  ecg: null,
  timerOff: null,
  autoT: null,

  render() {
    const run = App.run;
    if (!run || !run.cur) return '<p class="dim">No patient loaded.</p>';
    return `<div class="chart-grid">${this.bedsideHTML(run)}${this.chartsideHTML(run)}</div>`;
  },

  // ----- left pane
  livesHTML(run, lostIdx = -1) {
    if (!run.maxLives) return '';
    let s = `<div class="lives" id="lives" aria-label="${run.lives} of ${run.maxLives} lives">`;
    for (let i = 0; i < run.maxLives; i++) s += `<span class="${i < run.lives ? 'on' : 'off'} ${i === lostIdx ? 'lost' : ''}">${icon('heart')}</span>`;
    return s + '</div>';
  },
  scoreHTML(run) {
    const mult = Engine.multiplier(run.streak);
    return `<div class="score"><small>SCORE</small><span class="num">${fmt(run.score)}</span></div>
      <div class="streak ${run.streak >= 3 ? 'hot' : ''}" aria-label="Streak ${run.streak}, multiplier ${mult}">${icon('flame')}<span>×${mult}</span><span class="num faint">${run.streak} in a row</span></div>`;
  },
  ptMood(run) {
    const c = run.cur;
    if (!c.revealed) return run.mode === 'codeblue' ? 'worried' : 'neutral';
    return c.res.correct ? 'happy' : c.res.frac > 0 ? 'neutral' : 'worried';
  },
  bedsideHTML(run) {
    const q = run.q, c = run.cur, p = c.patient;
    const unit = Content.unitById[q.unit];
    const title = run.mode === 'shift' ? Content.unitLabel(run.unit) : run.mode === 'review' ? run.label : MODE_TITLE[run.mode];
    const ev = run.evNow();
    let sub = run.total ? `Patient ${run.idx + 1} of ${run.total}` : run.mode === 'boss' ? `Phase ${run.phase + 1} of 3` : `Patient ${run.idx + 1}`;
    if (ev) sub = ev.type === 'rapid' ? `Rapid Response · Room ${unit.room} ${esc(unit.ward)}` : ev.type === 'visitor' ? `${sub} · Visitor question` : `${sub} · Power outage`;
    const talk = run.talk || { text: Talk.line(run.mode === 'shift' ? 'start' : run.mode), mood: 'happy' };
    run.talk = talk;
    const av = WR.state.profile.avatar;
    const sec = Content.section(q.sec);
    const top = `<div class="topbar">
      <button class="icon-btn" data-action="quit" aria-label="Leave this round">${icon('close')}</button>
      <div class="grow"><div class="label">${esc(title)}</div><b>${sub}</b></div>
      ${this.livesHTML(run)}
    </div>`;
    const monitor = `<div class="monitor" id="monitor"><canvas id="ecg" aria-hidden="true"></canvas>
      <div class="vitals" aria-hidden="true"><span class="hr"><small>HR</small><b id="hr">72</b></span><span class="spo2"><small>SpO₂</small><b>${run.mode === 'codeblue' ? 88 : 97 + (p.age % 3)}</b></span></div></div>`;
    let middle;
    if (run.mode === 'boss') {
      middle = `<div class="arena" id="arena">${this.hpHTML(run)}
        <div class="arena-stage"><div class="nurse" id="arena-nurse">${nurseSVG(av, talk.mood)}</div><div class="boss" id="boss">${bossSVG(run.phase)}</div></div>
        <div class="bubble" id="talk">${esc(talk.text)}</div></div>${monitor}`;
    } else {
      middle = `<div class="bedside-row">
        <div class="patient-card"><div class="bed" id="bed">${patientInBed(p, this.ptMood(run))}</div>
          ${ev && ev.type === 'visitor' ? `<div class="visitor" aria-hidden="true">${patientHead(patientFor({ id: 'visitor:' + q.id, stem: '' }), 'happy')}</div>` : ''}
          <div class="pt-info"><b>${esc(p.name)}</b><span class="sub">${p.age} y · Bed ${unit.room}-${p.bed}</span><span class="pt-topic">${esc(sec.num + ' ' + sec.title)}</span><span class="band">NKDA</span></div></div>
        ${monitor}${ev && ev.type === 'outage' ? '<div class="outage-dark" aria-hidden="true"></div>' : ''}</div>`;
    }
    const nurse = run.mode === 'boss' ? '' : `<div class="nurse-row" id="nurse-row"><div class="nurse">${nurseSVG(av, talk.mood)}</div><div class="bubble" id="talk">${esc(talk.text)}</div></div>`;
    return `<aside class="bedside ${ev ? 'ev-' + ev.type : ''}">${top}${middle}<div class="scorebar" id="scorebar">${this.scoreHTML(run)}</div>${nurse}</aside>`;
  },
  hpHTML(run) {
    return `<div class="hp"><div class="hp-row"><span>The Superbug</span><span class="num" id="hp-num">${run.hp} / ${run.maxHp}</span></div>
      <div class="bar" role="progressbar" aria-label="Boss health" aria-valuenow="${run.hp}" aria-valuemin="0" aria-valuemax="${run.maxHp}"><i id="hp-bar" style="width:${(run.hp / run.maxHp) * 100}%"></i></div></div>`;
  },

  // ----- right pane
  progHTML(run) {
    if (run.mode === 'codeblue') {
      return `<div class="timer" id="timer" role="timer" aria-label="Time left">${icon('alarm')}<div class="bar"><i id="timer-bar" style="width:${(run.timeLeft / 60) * 100}%"></i></div><b class="num" id="timer-num">${Math.ceil(run.timeLeft)}</b></div>`;
    }
    if (!run.total) return '';
    let pips = '';
    for (let i = 0; i < run.total; i++) {
      const r = run.results[i];
      let cls = i === run.idx && !run.cur.revealed ? 'now' : r ? (run.mode === 'exam' ? 'ok' : r.correct ? 'ok' : r.frac > 0 ? 'part' : 'bad') : '';
      if (run.event && run.event.qids.indexOf(run.queue[i]) !== -1) cls += ' ev ev-' + run.event.type;
      pips += `<i class="${cls}"></i>`;
    }
    return `<div class="prog-row"><div class="pips" aria-label="Patient ${run.idx + 1} of ${run.total}">${pips}</div></div>`;
  },
  optsHTML(run) {
    const q = run.q, c = run.cur;
    const showTruth = c.revealed && run.mode !== 'exam';
    const isOrder = q.type === 'order', isMulti = q.type === 'sata';
    const texts = c.order.map((i) => (isOrder ? q.steps[i] : q.opts[i].t));
    const grid = App.size === 'wide' && !isOrder && texts.length === 4 && texts.every((t) => t.length <= 34) && q.type !== 'priority';
    let s = `<ol class="opts ${grid ? 'grid2' : ''}" id="opts">`;
    c.order.forEach((i, k) => {
      const o = isOrder ? { t: q.steps[i] } : q.opts[i];
      const selPos = c.sel.indexOf(i);
      const sel = selPos !== -1;
      const cls = ['opt'];
      if (isMulti) cls.push('multi');
      if (c.gone.indexOf(i) !== -1) cls.push('gone');
      let mark = '';
      if (showTruth) {
        if (isOrder) { cls.push(selPos === i ? 'right' : 'wrong'); mark = icon(selPos === i ? 'check' : 'x'); }
        else if (o.c && (sel || !isMulti)) { cls.push('right'); mark = icon('check'); }
        else if (o.c && isMulti) { cls.push('missed'); mark = icon('check'); }
        else if (sel) { cls.push('wrong'); mark = icon('x'); }
      } else if (sel) cls.push(isOrder ? 'placed' : 'sel');
      const lead = isOrder ? `<span class="ord num">${sel ? selPos + 1 : '·'}</span>` : `<span class="key">${LETTERS[k]}</span>`;
      const pt = q.type === 'priority' ? `<span class="pt-mini">${patientHead(patientFor({ id: q.id + ':' + i, stem: o.t }), 'neutral')}</span>` : '';
      const after = showTruth && isOrder ? `<span class="order-ans">Step ${i + 1}</span>` : '';
      const label = `${isOrder ? '' : 'Option ' + LETTERS[k] + ': '}${o.t}${sel && !showTruth ? (isOrder ? `, placed ${selPos + 1}` : ', selected') : ''}`;
      s += `<li><button class="${cls.join(' ')}" data-action="pick" data-i="${i}" ${c.revealed || c.gone.indexOf(i) !== -1 ? 'disabled' : ''} aria-label="${esc(label)}" ${isMulti ? `aria-pressed="${sel}"` : ''}>${lead}${pt}<span class="t">${esc(o.t)}</span>${after}<span class="mark">${mark}</span></button></li>`;
    });
    return s + '</ol>';
  },
  paperHTML(run) {
    const q = run.q, c = run.cur, sec = Content.section(q.sec);
    const help = q.type === 'sata' ? 'Select all that apply, then tap Submit.' : q.type === 'order' ? 'Tap the steps in order, then tap Submit. Tap a placed step to take it back.' : 'Choose an answer, then tap Submit.';
    return `<div class="paper-head"><span class="qtype ${q.type}">${TYPE_INFO[q.type].label}</span><span class="paper-topic">${q.origin === 'guide' ? 'From your study guide' : 'ATI-style'} · ${esc(sec.num)}</span></div>
      <p class="stem" id="stem">${esc(q.stem)}</p>
      ${help && !c.revealed ? `<p class="paper-help">${help}</p>` : ''}
      ${c.hint && !c.revealed ? `<p class="paper-hint">${icon('users')}${esc(c.hint)}</p>` : ''}
      ${this.optsHTML(run)}`;
  },
  trayHTML(run) {
    const q = run.q, c = run.cur;
    if (c.revealed) return '';
    let s = '';
    if (run.cfg.lifelines) {
      s += `<button class="life-btn" data-action="colleague" ${run.canColleague() ? '' : 'disabled'} aria-label="Ask a colleague: a 50/50 that leaves the right answer and one wrong one (on select-all questions, half the wrong options go; on ordering, the first step is placed). ${run.lifelines.colleague} left">${icon('users')}<span class="t">Ask a colleague</span><span class="n">${run.lifelines.colleague}</span></button>`;
      s += `<button class="life-btn" data-action="coffee" ${run.lifelines.coffee && run.lives < run.maxLives ? '' : 'disabled'} aria-label="Coffee break: gain one life. ${run.lifelines.coffee} left">${icon('coffee')}<span class="t">Coffee break</span><span class="n">${run.lifelines.coffee}</span></button>`;
    }
    s += '<span class="grow"></span>';
    if (q.type === 'order') s += `<button class="btn" data-action="undo" ${c.sel.length ? '' : 'disabled'}>${icon('undo')}Undo</button>`;
    s += `<button class="btn primary big" data-action="submit" ${run.ready() ? '' : 'disabled'}>Submit</button>`;
    return s;
  },
  chartsideHTML(run) {
    const c = run.cur;
    const fb = c.revealed && run.cfg.feedback;
    return `<main class="chartside">
      <div id="prog">${this.progHTML(run)}</div>
      <article class="clipboard" id="clipboard" aria-label="Patient chart"><div class="clip" aria-hidden="true"></div><div class="paper" id="paper">${this.paperHTML(run)}</div></article>
      <div class="tray" id="tray">${this.trayHTML(run)}</div>
      <div class="feedback" id="feedback" ${fb ? '' : 'hidden'} role="region" aria-label="Explanation">${fb ? this.feedbackHTML(run) : ''}</div>
    </main>`;
  },

  feedbackHTML(run) {
    const q = run.q, c = run.cur, res = c.res, sec = Content.section(q.sec);
    const st = res.correct ? 'ok' : res.frac > 0 ? 'part' : 'bad';
    const r = rng(q.id);
    const title = res.correct ? pick(['Correct!', 'Nice work!', 'Right on!', 'You got it!'], r) : res.frac > 0 ? 'Partly right' : 'Not quite';
    const pts = c.pts.pts ? `+${fmt(c.pts.pts)}${c.pts.mult > 1 ? ` ×${c.pts.mult}` : ''}` : '';
    let answer;
    if (q.type === 'order') answer = `<ol>${q.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`;
    else answer = `<ul>${q.opts.filter((o) => o.c).map((o) => `<li>${esc(o.t)}</li>`).join('')}</ul>`;
    const ansLabel = q.type === 'order' ? 'Correct order' : q.type === 'sata' ? 'Correct answers' : q.type === 'teaching' ? 'Statement that needs more teaching' : 'Correct answer';
    const notes = [];
    if (c.ev === 'rapid') { const u = Content.unitById[q.unit]; notes.push(`${icon('alarm')} Rapid Response from Room ${u.room} · ${esc(u.ward)}: ×2 points${c.evSafe ? ', and no life lost' : ''}.`); }
    if (c.ev === 'visitor') notes.push(`${icon('users')} Visitor question${res.correct ? ': +15 bonus XP' : ''}${c.evSafe ? '. No life lost' : ''}.`);
    if (c.ev === 'outage') notes.push(`${icon('sparkle')} Power outage: ×1.5 points.`);
    if (c.lostLife) notes.push(`${icon('heart')} You lost a life.`);
    if (c.discharged) notes.push(`${icon('bed')} Patient discharged from Missed Patients!${c.card ? ' They left you a thank-you card.' : ''}`);
    if (!res.correct && run.mode !== 'review') notes.push(`${icon('bed')} Saved to Missed Patients for review.`);
    if (c.bonusCoffee) notes.push(`${icon('coffee')} 10 in a row earned you an extra coffee break.`);
    if (c.dmg) notes.push(`${icon('sparkle')} ${c.dmg} damage to the Superbug.`);
    if (c.heal) notes.push(`${icon('bug')} The Superbug healed 80 HP.`);
    let tips = '';
    if (q.trick) tips += `<div class="tip trick">${icon('bulb')}<div><span class="label">Memory trick</span>${esc(q.trick)}</div></div>`;
    const guideTips = (sec.tips || []).filter((t) => t.kind !== 'note' || !q.trick).slice(0, q.trick ? 1 : 2);
    guideTips.forEach((t) => { tips += `<div class="tip guide">${icon('book')}<div><span class="label">From your guide<span class="src">${esc(t.label)}</span></span>${esc(t.text)}</div></div>`; });
    tips += `<div class="tip ati">${icon('target')}<div><span class="label">ATI test tip</span>${esc(q.tip || TYPE_INFO[q.type].tip)}</div></div>`;
    let others = '';
    if (q.type !== 'order' && q.opts.some((o) => o.w)) {
      others = `<details class="more"><summary>Why the other options are wrong</summary><ul class="why-list">${q.opts.filter((o) => !o.c && o.w).map((o) => `<li><b>${esc(o.t)}</b>${esc(o.w)}</li>`).join('')}</ul></details>`;
    }
    const hit = new Set((q.focus || []).filter((f) => f[0] === q.sec).map((f) => f[1]));
    const focus = sec.focus.length ? `<ul class="focus-list">${sec.focus.map((f, i) => `<li class="${hit.has(i) ? 'hit' : ''}">${esc(f)}</li>`).join('')}</ul>` : '<p class="dim">This section has no instructor focus points.</p>';
    const guide = `<details class="more" ${App.size === 'wide' ? '' : ''}><summary>Read the guide: ${esc(sec.num)} ${esc(sec.title)}</summary><p class="label" style="margin-top:6px">Instructor focus points</p>${focus}</details>`;
    const endLabel = run.isEnd() ? (run.mode === 'boss' ? (run.won ? 'Victory!' : 'See results') : 'See shift report') : 'Next patient';
    return `<div class="fb-head ${st}"><span class="ico">${icon(st === 'ok' ? 'check' : st === 'part' ? 'target' : 'x')}</span><h2>${title}</h2>${pts ? `<span class="pts num">${pts}</span>` : ''}</div>
      ${notes.length ? `<div class="fb-notes">${notes.map((n) => `<p>${n}</p>`).join('')}</div>` : ''}
      <div class="fb-answer"><span class="label">${ansLabel}</span>${answer}</div>
      <p class="fb-why">${esc(q.why)}</p>
      <div class="fb-tips">${tips}</div>
      ${c.card && Content.byId[c.card] ? Cards.html(Content.byId[c.card], { reveal: true }) : ''}
      ${others}${guide}
      <div class="fb-actions"><button class="btn primary big" data-action="next" data-autofocus>${endLabel}${icon('play')}</button></div>`;
  },

  // ----- lifecycle
  mount(el) {
    const run = App.run;
    if (!run) return;
    el.classList.add('mode-' + run.mode);
    const cv = $('#ecg', el);
    if (cv) {
      this.ecg = new ECG(cv, $('#hr', el), $('#monitor', el));
      this.ecg.stress = this.ecg.shown = run.stress();
      this.ecg.beep = run.mode === 'codeblue';
    }
    if (run.mode === 'codeblue' && !this.timerOff) {
      this.timerOff = Loop.add((dt) => this.tickTimer(dt));
    }
    if (run.cur.revealed && run.cfg.feedback) { const f = $('#feedback', el); if (f) f.scrollTop = 0; }
  },
  leave() {
    Whimsy.clear();
    if (this.ecg) { this.ecg.destroy(); this.ecg = null; }
    if (this.timerOff && App.name !== 'chart') { this.timerOff(); this.timerOff = null; }
    clearTimeout(this.autoT);
  },
  tickTimer(dt) {
    const run = App.run;
    if (!run || run.mode !== 'codeblue' || run.over) { if (this.timerOff) { this.timerOff(); this.timerOff = null; } return; }
    if (document.getElementById('modal-root').firstChild) return; // paused while a dialog is open
    run.timeLeft = Math.max(0, run.timeLeft - dt);
    const bar = $('#timer-bar'), num = $('#timer-num');
    if (bar) bar.style.width = (run.timeLeft / 60) * 100 + '%';
    if (num) num.textContent = Math.ceil(run.timeLeft);
    if (this.ecg) this.ecg.stress = run.stress();
    if (run.timeLeft <= 0) {
      this.timerOff(); this.timerOff = null;
      run.finish();
      Sound.play('alarm');
      App.show('report');
    }
  },

  // partial refreshes keep the ECG and animations running
  refresh(parts) {
    const run = App.run, el = App.el;
    const set = (id, html) => { const n = $('#' + id, el); if (n) n.innerHTML = html; };
    if (parts.includes('paper')) set('paper', this.paperHTML(run));
    if (parts.includes('tray')) set('tray', this.trayHTML(run));
    if (parts.includes('prog')) set('prog', this.progHTML(run));
    if (parts.includes('score')) set('scorebar', this.scoreHTML(run));
    if (parts.includes('bed')) set('bed', patientInBed(run.cur.patient, this.ptMood(run)));
    if (parts.includes('talk')) {
      const t = $('#talk', el); if (t) { t.textContent = run.talk.text; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
      const n = $('#nurse-row .nurse', el) || $('#arena-nurse', el); if (n) n.innerHTML = nurseSVG(WR.state.profile.avatar, run.talk.mood);
    }
    if (parts.includes('feedback')) {
      const f = $('#feedback', el);
      if (f) {
        const show = run.cur.revealed && run.cfg.feedback;
        f.hidden = !show;
        f.innerHTML = show ? this.feedbackHTML(run) : '';
        if (show) { f.scrollTop = 0; const b = $('[data-action="next"]', f); if (b && !('ontouchstart' in window)) b.focus({ preventScroll: true }); if (App.size === 'wide') f.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); }
      }
    }
  },
  say(kind, ctx) { const run = App.run; run.talk = { text: Talk.line(kind, ctx), mood: Talk.mood(kind) }; },

  afterSubmit(res) {
    const run = App.run, c = run.cur, q = run.q, el = App.el;
    if (this.ecg) this.ecg.stress = run.stress();
    if (run.mode === 'exam') {
      this.refresh(['paper', 'tray', 'prog']);
      this.autoT = setTimeout(() => this.advance(), 280);
      return;
    }
    const stem = $('#stem', el);
    const ptsTxt = c.pts.pts ? `+${c.pts.pts}${c.pts.mult > 1 ? ' ×' + c.pts.mult : ''}` : '';
    const prevLives = run.lives + (c.lostLife ? 1 : 0);
    if (res.correct) {
      Sound.play('right');
      FX.float(ptsTxt, stem, 'good');
      if ([3, 6, 10, 15, 20, 25].includes(run.streak)) this.say('streak', { streak: run.streak });
      else if (run.results.length > 1 && !run.results[run.results.length - 2].correct) this.say('back');
      else this.say('right', { trick: q.trick });
    } else if (res.frac > 0) {
      Sound.play('part');
      if (ptsTxt) FX.float(ptsTxt, stem, 'warn');
      this.say('part');
    } else {
      Sound.play('wrong');
      FX.shake($('#clipboard', el));
      FX.flash('bad');
      this.say(run.maxLives && run.lives === 1 ? 'low' : 'wrong');
    }
    if (run.mode === 'boss') this.bossFx(c);
    this.refresh(['paper', 'tray', 'prog', 'score', 'bed', 'talk']);
    Whimsy.react(run, res);
    if (c.lostLife) { const l = $('#lives', el); if (l) l.outerHTML = this.livesHTML(run, run.lives); }
    if (run.mode === 'codeblue') {
      const tm = $('#timer', el);
      if (tm) { const d = document.createElement('span'); d.className = 'timer-delta'; d.style.color = res.correct ? 'var(--good)' : 'var(--bad)'; d.textContent = res.correct ? '+3s' : '−5s'; tm.style.position = 'relative'; tm.appendChild(d); setTimeout(() => d.remove(), 1000); }
      this.autoT = setTimeout(() => this.advance(), res.correct ? 420 : 900);
      return;
    }
    this.refresh(['feedback']);
    if (c.card) Sound.play('tada', 500);
    celebrate(run);
    if (c.badges && c.badges.length) badgeToast(c.badges);
    void prevLives;
  },

  bossFx(c) {
    const run = App.run, el = App.el;
    const boss = $('#boss', el), nurse = $('#arena-nurse', el);
    if (c.dmg) {
      FX.projectile(nurse, boss).then(() => {
        Sound.play('hit');
        if (boss) { boss.innerHTML = bossSVG(run.phase, 'hurt'); boss.classList.remove('hit'); void boss.offsetWidth; boss.classList.add('hit'); }
        FX.float('−' + c.dmg, boss, 'bad');
        setTimeout(() => { if (boss && boss.isConnected) boss.innerHTML = bossSVG(run.phase); }, 700);
      });
    } else if (c.heal) {
      Sound.play('heal');
      if (boss) { boss.classList.remove('heal'); void boss.offsetWidth; boss.classList.add('heal'); }
      FX.float('+' + c.heal + ' HP', boss, 'good');
    }
    const hpN = $('#hp-num', el), hpB = $('#hp-bar', el);
    if (hpN) hpN.textContent = `${run.hp} / ${run.maxHp}`;
    if (hpB) hpB.style.width = (run.hp / run.maxHp) * 100 + '%';
    if (c.phaseUp && run.hp > 0) {
      const ar = $('#arena', el);
      if (ar) { const b = document.createElement('div'); b.className = 'phase-banner'; b.textContent = run.phase === 1 ? 'It mutated!' : 'Final form!'; ar.appendChild(b); setTimeout(() => b.remove(), 1900); }
      Sound.play('alarm');
      setTimeout(() => { this.say('bossPhase'); this.refresh(['talk']); }, 900);
    }
  },

  eventBanner(type) {
    const bs = $('.bedside', App.el);
    if (!bs) return;
    const b = document.createElement('div');
    b.className = 'ev-banner ev-' + type;
    b.setAttribute('role', 'status');
    b.textContent = { rapid: 'Rapid Response!', visitor: 'Visitor!', outage: 'Power outage!' }[type];
    bs.appendChild(b);
    setTimeout(() => b.remove(), 2000);
    Sound.play(type === 'rapid' ? 'alarm' : type === 'visitor' ? 'door' : 'slidedown');
  },

  advance() {
    const run = App.run;
    clearTimeout(this.autoT);
    if (!run) return;
    if (run.isEnd() || run.over) {
      if (!run.over) run.finish();
      App.show('report');
      return;
    }
    if (!run.next()) { App.show('report'); return; }
    const evStart = run.evFirst();
    if (evStart) this.say(run.event.type, { room: Content.unitById[run.q.unit].room });
    else if (run.mode !== 'codeblue' && run.mode !== 'exam' && Math.random() < 0.25) this.say(run.mode === 'boss' ? 'boss' : run.mode === 'daily' ? 'daily' : 'start');
    App.rerender();
    if (evStart) this.eventBanner(run.event.type);
    Store.saveRun();
    const sec = App.el;
    if (sec && !reducedMotion()) { const cb = $('#clipboard', sec); if (cb) cb.animate([{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' }); }
    App.el.scrollTop = 0;
  },

  act: {
    pick(d) {
      const run = App.run;
      if (!run || run.cur.revealed) return;
      // every question type waits for Submit; tapping an option only selects it
      run.toggle(+d.i);
      Sound.play('tap');
      Screens.chart.refresh(['paper', 'tray']);
    },
    submit() {
      const run = App.run;
      if (!run || !run.ready()) return;
      const res = run.submit();
      Screens.chart.afterSubmit(res);
    },
    undo() {
      const run = App.run;
      run.cur.sel.pop();
      Screens.chart.refresh(['paper', 'tray']);
    },
    colleague() {
      const run = App.run;
      if (run.useColleague()) { Sound.play('colleague'); Screens.chart.refresh(['paper', 'tray']); }
    },
    coffee() {
      const run = App.run, el = App.el;
      if (run.useCoffee()) {
        Sound.play('coffee');
        FX.float('+1 life', $('#lives', el), 'good');
        const l = $('#lives', el); if (l) l.outerHTML = Screens.chart.livesHTML(run);
        if (Screens.chart.ecg) Screens.chart.ecg.stress = run.stress();
        Screens.chart.refresh(['tray']);
      }
    },
    next() { Screens.chart.advance(); },
    async quit() {
      const run = App.run;
      const msg = run.mode === 'exam' ? 'Your exam answers so far will not be scored.' : 'Answers you already gave are saved. This round will not count as a finished shift.';
      if (await App.confirm('Leave this round?', msg, 'Leave')) {
        if (run.mode === 'codeblue' || run.mode === 'boss') run.finish();
        App.run = null;
        App.show('floor');
      }
    },
  },

  key(e) {
    const run = App.run;
    if (!run || !run.cur || document.getElementById('modal-root').firstChild) return;
    const k = e.key.toUpperCase();
    if (k === 'ENTER') {
      if (run.cur.revealed && run.cfg.feedback) { e.preventDefault(); this.advance(); }
      else if (run.ready()) { e.preventDefault(); this.act.submit(); }
      return;
    }
    let pos = LETTERS.indexOf(k);
    if (pos === -1 && /^[1-6]$/.test(k)) pos = +k - 1;
    if (pos >= 0 && pos < run.cur.order.length && !run.cur.revealed) {
      e.preventDefault();
      const i = run.cur.order[pos];
      if (run.cur.gone.indexOf(i) === -1) this.act.pick({ i });
    }
  },
};
