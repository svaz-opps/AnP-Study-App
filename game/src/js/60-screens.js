// ---------- missed patients, locker, report card, settings, onboarding ----------
function topbar(title, sub) {
  return `<div class="topbar narrow"><button class="icon-btn" data-action="home" aria-label="Back to the floor">${icon('back')}</button>
    <div class="grow"><h1 tabindex="-1">${esc(title)}</h1>${sub ? `<p class="dim">${esc(sub)}</p>` : ''}</div></div>`;
}

// ----- missed patients
Screens.missed = {
  // one room's card: its waiting patients (the first few) and a Re-round button
  roomHTML(u, list) {
    const days = CONFIG.mastery.solidDays;
    const rows = list.slice(0, 4).map((q) => {
      const r = WR.state.items[q.id];
      const status = r.ok ? `${r.ok} of ${days} days right` : 'missed ' + r.w + '×';
      return `<li><span class="rq">${esc(q.stem)}</span><span class="faint num">${status}</span></li>`;
    }).join('');
    const more = list.length > 4 ? `<li class="faint">+ ${list.length - 4} more</li>` : '';
    return `<div class="card missed-room"><div class="mr-head"><span class="room-plate">${u.room}</span><b>${esc(u.ward)} · ${esc(u.topic)}</b><span
      class="chip">${list.length} waiting</span>
          <button class="btn" data-action="reviewUnit" data-unit="${u.id}">Re-round</button></div>
          <ul class="mr-list">${rows}${more}</ul></div>`;
  },
  render() {
    const all = Engine.missed();
    const s = WR.state;
    let body;
    if (!all.length) {
      const about = `When you miss a question, the patient comes here. Get it right on ${CONFIG.mastery.solidDays} `
        + "different days and they're discharged.";
      body = `<div class="card empty">${patientHead(patientFor({ id: 'empty-missed', stem: '' }), 'cheer')}` +
        `<h2>No missed patients</h2><p class="dim">${about}</p></div>`;
    } else {
      const rooms = Content.units.map((u) => {
        const list = all.filter((q) => q.unit === u.id);
        return list.length ? this.roomHTML(u, list) : '';
      }).join('');
      body = `<button class="btn primary big block" data-action="reviewAll">${icon('play')}Start re-rounds ` +
        `(${Math.min(MODES.review.n, all.length)} patients)</button>
      <div class="missed-rooms">${rooms}</div>`;
    }
    return `${topbar('Missed patients', `${all.length} waiting · ${s.discharged} discharged so far`)}<div class="narrow stack">${body}</div>`;
  },
  act: {
    reviewAll() { startReview(Engine.pickReview(null), 'Missed patients'); },
    reviewUnit(d) { startReview(Engine.pickReview(d.unit), 'Missed: ' + Content.unitById[d.unit].topic); },
  },
};

// ----- locker room
function unlockReq(key) { return UNLOCKS[key]; }
function isUnlocked(key) {
  const u = UNLOCKS[key];
  if (!u || WR.debug) return true;
  if (u.rank != null) return Engine.rankIndex() >= u.rank;
  if (u.badge) return !!WR.state.badges[u.badge];
  return true;
}
function reqText(key) {
  const u = UNLOCKS[key];
  if (!u) return '';
  if (u.rank != null) return `Reach ${RANKS[u.rank].n}`;
  const b = BADGES.find((x) => x.id === u.badge);
  return b ? `Earn "${b.n}"` : '';
}

const LOCKER_TABS = [
  ['skin', 'Skin'], ['hair', 'Hair'], ['hairColor', 'Hair color'], ['eyes', 'Eyes'],
  ['scrubs', 'Scrubs'], ['pattern', 'Pattern'], ['shoes', 'Clogs'], ['acc', 'Extras'],
];

Screens.locker = {
  cls: 'locker-screen',
  tab: 'hair',
  mood: 'happy',
  render() {
    const av = WR.state.profile.avatar;
    const tab = this.tab;
    const tabs = LOCKER_TABS.map(([k, n]) =>
      `<button class="tab ${k === tab ? 'on' : ''}" data-action="tab" data-tab="${k}" aria-pressed="${k === tab}">${n}</button>`).join('');
    const lockIcon = `<span class="lock">${icon('lock')}</span>`;
    // one choice: `inner` is its preview, `action`/`data` say what tapping it does
    const swatch = (lk, inner, label, on, action, data, lockedLabel) => {
      const open = isUnlocked(lk);
      return `<button class="swatch ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-action="${action}" ${data} aria-pressed="${on}" ` +
        `aria-label="${esc(label)}${open ? '' : lockedLabel}">${inner}${open ? '' : lockIcon}` +
        `<span class="sw-name">${esc(open ? label : reqText(lk))}</span></button>`;
    };
    const sw = (key, i, inner, label, on) =>
      swatch(`${key}:${i}`, inner, label, on, 'set', `data-key="${key}" data-val="${i}"`, ' (locked: ' + esc(reqText(`${key}:${i}`)) + ')');
    const dot = (color) => `<span class="dot" style="background:${color}"></span>`;
    const preview = (patch) => `<span class="sw-ava">${nurseSVG(Object.assign({}, av, patch), 'happy', { headOnly: true })}</span>`;
    const body = (patch) => `<span class="sw-body">${nurseSVG(Object.assign({}, av, patch), 'happy')}</span>`;
    const hairColors = av.hair === 7 ? AVATAR.hijab.map((c, i) => ({ n: 'Hijab ' + (i + 1), c })) : AVATAR.hairColor;
    const items = {
      skin: () => AVATAR.skin.map((c, i) => sw('skin', i, dot(c), `Skin tone ${i + 1}`, av.skin === i)),
      hair: () => AVATAR.hair.map((n, i) => sw('hair', i, preview({ hair: i }), n, av.hair === i)),
      hairColor: () => hairColors.map((h, i) => sw('hairColor', i, dot(h.c), h.n, av.hairColor === i)),
      eyes: () => AVATAR.eyes.map((n, i) => sw('eyes', i, preview({ eyes: i }), n, av.eyes === i)),
      scrubs: () => AVATAR.scrubs.map((c, i) => sw('scrubs', i, dot(c.c), c.n, av.scrubs === i)),
      pattern: () => AVATAR.pattern.map((n, i) => sw('pattern', i, body({ pattern: i }), n, av.pattern === i)),
      shoes: () => AVATAR.shoes.map((c, i) => sw('shoes', i, dot(c.c), c.n, av.shoes === i)),
      acc: () => AVATAR.acc.map((a) => {
        const on = (av.acc || []).indexOf(a.id) !== -1;
        return swatch('acc:' + a.id, preview({ acc: [a.id] }), a.n, on, 'acc', `data-id="${a.id}"`, ' (locked)');
      }),
    }[tab]().join('');
    const quip = ['Looking sharp!', 'Ready for rounds!', 'Love these scrubs.', 'Fresh shift, fresh look.'][Object.keys(av).length % 4];
    return `${topbar('Locker room', 'Make your nurse yours. Some items unlock as you rank up and earn badges.')}
      <div class="locker narrow">
        <div class="locker-preview card"><button class="locker-nurse" data-action="poke"
          aria-label="Your nurse. Tap to change expression.">${nurseSVG(av, this.mood)}</button>
          <div class="bubble">${esc(quip)}</div></div>
        <div class="locker-controls">
          <div class="tabs" role="toolbar" aria-label="Customize">${tabs}</div>
          <div class="swatches">${items}</div>
        </div>
      </div>`;
  },
  act: {
    tab(d) { Screens.locker.tab = d.tab; App.rerender(); },
    set(d) {
      const lk = `${d.key}:${d.val}`;
      if (!isUnlocked(lk)) { App.toast(`Locked: ${reqText(lk)}`); return; }
      WR.state.profile.avatar[d.key] = +d.val;
      const av = WR.state.profile.avatar;
      if (d.key === 'hair' && +d.val === 7) av.hairColor = Math.min(av.hairColor, AVATAR.hijab.length - 1); // fewer hijab colours
      Sound.play('tap'); Store.save(); App.rerender();
    },
    acc(d) {
      if (!isUnlocked('acc:' + d.id)) { App.toast(`Locked: ${reqText('acc:' + d.id)}`); return; }
      const a = WR.state.profile.avatar; a.acc = a.acc || [];
      const k = a.acc.indexOf(d.id);
      if (k === -1) a.acc.push(d.id); else a.acc.splice(k, 1);
      Sound.play('tap'); Store.save(); App.rerender();
    },
    poke() {
      const moods = ['happy', 'cheer', 'focus', 'cool', 'silly', 'starry', 'sleepy', 'worried', 'dizzy', 'neutral'];
      Screens.locker.mood = moods[(moods.indexOf(Screens.locker.mood) + 1) % moods.length];
      Sound.play('tap'); App.rerender();
    },
  },
};

// ----- report card: where you stand
// Every question is in one state (Engine.statusOf); the report card shows those states for the whole bank,
// each room and each instructor focus point, plus first-try accuracy, the last two weeks and exam simulations.
const STATUS_INFO = {
  mastered: { label: 'Mastered', note: () => `right on ${CONFIG.mastery.solidDays} different days` },
  learning: { label: 'Learning', note: () => `right, not yet on ${CONFIG.mastery.solidDays} days` },
  due: { label: 'Due for review', note: () => 'mastered, time for a refresh' },
  missed: { label: 'Missed', note: () => 'waiting in Missed Patients' },
  new: { label: 'Not started', note: () => 'not answered right yet' },
};
const pctText = (x) => Math.round(x * 100) + '%';
const shortDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// one whole split into the five states. tall: the bank-wide bar; otherwise a thin row bar
function statusBar(b, tall) {
  const total = b.total || 1;
  const parts = Engine.STATUSES.filter((k) => b[k] > 0);
  const name = parts.map((k) => `${STATUS_INFO[k].label} ${b[k]}`).join(', ');
  const segs = parts.map((k) => `<i class="st-${k}" style="flex-grow:${b[k]}" ` +
    `title="${STATUS_INFO[k].label}: ${b[k]} (${pctText(b[k] / total)})"></i>`).join('');
  return `<div class="st-bar ${tall ? 'tall' : ''}" role="img" aria-label="${esc(name || 'No questions')}">${segs}</div>`;
}
function statusLegend(b) {
  return `<ul class="st-legend">${Engine.STATUSES.map((k) => `<li><i class="sw st-${k}"></i><span>${STATUS_INFO[k].label}` +
    ` <b class="num">${b[k]}</b></span><span class="faint">${STATUS_INFO[k].note()}</span></li>`).join('')}</ul>`;
}

const StatsParts = {
  // the headline: estimated score, last exam simulation, exam countdown, pace, and the whole bank
  stand(s) {
    const rd = Engine.readiness(), pace = Engine.pace(), b = rd.b;
    const solid = b.mastered + b.due;
    const confText = { low: 'low confidence', medium: 'medium confidence', fair: 'fair confidence' }[rd.conf];
    const hero = rd.pct == null
      ? `<b class="hero-num">—</b><span class="faint">Answer ${rd.need} more question${rd.need === 1 ? '' : 's'} for an estimate.</span>`
      : `<b class="hero-num num">${rd.pct}%</b><span class="faint">Rough estimate · ${confText} (last ${rd.n} answers)</span>`;
    const last = s.exams[s.exams.length - 1];
    const examTile = last
      ? this.tile('Last exam simulation', pctText(last.right / last.n), `${last.right}/${last.n} on ${shortDate(last.date)}`)
      : this.tile('Last exam simulation', '—', 'Take one from the floor: the truest test');
    const days = pace.examIn;
    const daysTile = days == null ? this.tile('Exam', '—', '<button class="linkish" data-action="settings">Set the exam date</button>')
      : this.tile('Days to exam', days > 0 ? days : days === 0 ? 'Today' : 'Done', days > 0 ? `Daily target ${Engine.dailyTarget()} answers` : '');
    let paceNote;
    if (pace.left === 0) paceNote = 'Every question mastered!';
    else if (pace.rate == null) paceNote = 'Shows after a few days of play';
    else if (pace.rate <= 0) paceNote = `No net gain over ${pace.span} days`;
    else {
      const when = pace.finishIn <= 365 ? shortDate(dayStr(dayNum() + pace.finishIn)) : 'over a year';
      const need = days > 0 ? (pace.left / days).toFixed(1) : null;
      paceNote = `All mastered by ${when}` + (need ? (pace.onTrack ? ' · on track' : ` · behind: ${need}/day needed`) : '');
    }
    const paceTile = this.tile('Pace', pace.rate == null ? '—' : `${pace.rate.toFixed(1)}/day`, `mastered lately · ${paceNote}`);
    return `<div class="card stand">
      <div class="stand-top">
        <div class="stand-hero"><span class="label">Estimated exam score</span>${hero}</div>
        <div class="stand-tiles">${examTile}${daysTile}${paceTile}</div>
      </div>
      <div class="stand-bank"><span class="label">Question bank</span>
        <p class="bank-line"><b class="num">${solid}</b> of <b class="num">${b.total}</b> mastered` +
        `${b.due ? ` (${b.due} due for review)` : ''} · <b class="num">${b.learning}</b> learning · ` +
        `<b class="num">${b.missed}</b> missed · <b class="num">${b.new}</b> not started</p>
        ${statusBar(b, true)}${statusLegend(b)}</div>
      <details class="how"><summary>How is this worked out?</summary>
        <p>Every question is in one state. <b>Mastered</b>: right on ${CONFIG.mastery.solidDays} different days (with no
        colleague's help). Mastered questions come back after ${CONFIG.mastery.reviewAfterDays.join(', then ')} days, and
        once more in the last ${CONFIG.mastery.examWeekRefresh} days before the exam; until you answer them they are
        <b>due for review</b>. A miss puts a question in <b>Missed</b> until it is right on ${CONFIG.mastery.solidDays}
        different days again. Stars count what you know now, so a miss can take a star away until you fix it.</p>
        <p>The estimated score uses your own accuracy on questions in each state, across the whole bank. It is a rough
        guide: an exam simulation is the real test.</p></details>
    </div>`;
  },
  tile(label, value, note) {
    return `<div class="stat"><span class="label">${label}</span><b class="num">${value}</b><span class="faint">${note}</span></div>`;
  },
  // what to do next: due reviews, missed patients, today's target
  todo(s) {
    const due = Engine.due().length, missed = Engine.missed().length;
    const today = s.days.today === todayStr() ? s.days.answered : 0, goal = Engine.dailyTarget();
    const btns = [];
    if (due) btns.push(`<button class="btn primary" data-action="refreshDue">${icon('play')}Refresh fading (${Math.min(due, MODES.review.n)})</button>`);
    if (missed) btns.push(`<button class="btn" data-action="missed">${icon('bed')}Missed patients (${missed})</button>`);
    const lines = [
      `<b class="num">${due}</b> mastered question${due === 1 ? '' : 's'} due for review`,
      `<b class="num">${missed}</b> missed patient${missed === 1 ? '' : 's'} waiting`,
      `<b class="num">${today}/${goal}</b> answered today`,
    ];
    return `<div class="card todo-card"><span class="label">Next up</span>
      <ul class="todo-list">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
      ${btns.length ? `<div class="report-actions left">${btns.join('')}</div>` : '<p class="dim">Nothing due. Nice work!</p>'}</div>`;
  },
  rooms() {
    const ctx = Engine.statusCtx();
    const rows = Content.units.map((u) => {
      const m = Engine.mastery(u.id, ctx);
      const bits = [];
      if (m.missed) bits.push(`${m.missed} missed`);
      if (m.due) bits.push(`${m.due} due`);
      return `<div class="ub"><span>${u.room} ${esc(u.topic)}</span>${statusBar(m.b)}` +
        `<span class="room-stars" aria-label="${m.stars} of 3 stars">${starRow(m.stars)}</span>` +
        `<span class="ub-note faint num">${m.solid}/${m.total} mastered${bits.length ? ' · ' + bits.join(' · ') : ''}</span></div>`;
    }).join('');
    const M = CONFIG.mastery;
    const rule = `★ ${pctText(M.oneStar)} known · ★★ ${pctText(M.twoStars)} known · ★★★ ${pctText(M.threeStars)} mastered`;
    return `<div class="card"><span class="label">Rooms</span><p class="faint rule">${rule} (known = right and not missed)</p>
      <div class="unit-bars">${rows}</div></div>`;
  },
  focus() {
    const rep = Engine.focusReport();
    const n = { mastered: 0, progress: 0, new: 0 };
    rep.forEach((a) => { n[a.state]++; });
    const weak = Engine.weakFocus();
    const row = (a) => {
      const sec = Content.section(a.sec), seen = a.qids.length - a.b.new;
      const bits = [`missed ${a.b.missed} of ${seen} answered`];
      if (a.b.due) bits.push(`${a.b.due} due for review`);
      return `<li><b>${esc(sec.focus[a.i])}</b><span class="faint">${esc(sec.num + ' ' + sec.title)} · ${bits.join(' · ')}</span></li>`;
    };
    const weakHTML = weak.length ? `<span class="label">Weakest right now</span><ol class="weak-list">${weak.map(row).join('')}</ol>
      <button class="btn primary" data-action="practiceWeak">${icon('target')}Practice these</button>`
      : '<p class="dim">No weak focus points right now. Missed questions put their focus points here until you fix them.</p>';
    const covB = { total: rep.length, mastered: n.mastered, learning: n.progress, due: 0, missed: 0, new: n.new };
    return `<div class="card focus-cov"><span class="label">Instructor focus points</span>
      <p class="bank-line"><b class="num">${n.mastered}</b> of <b class="num">${rep.length}</b> fully mastered · ` +
      `<b class="num">${n.progress}</b> in progress · <b class="num">${n.new}</b> not started</p>
      ${statusBar(covB)}
      <p class="faint rule">From the new ATI-style questions, which are each tagged to the focus points they test.</p>
      ${weakHTML}</div>`;
  },
  types(s) {
    const f = s.firstStats || { type: {} };
    const rows = Object.keys(TYPE_INFO).map((t) => ({ t, first: f.type[t], all: s.typeStats[t] }));
    const rate = (o) => (o && o.n ? o.r / o.n : null);
    const ranked = rows.filter((x) => x.first && x.first.n >= 5).sort((x, y) => rate(x.first) - rate(y.first));
    const weakest = ranked.length > 1 ? ranked[0].t : null;
    const cells = rows.map(({ t, first, all }) => {
      const main = rate(first) != null ? pctText(rate(first)) : '—';
      const over = all && all.n ? `overall ${pctText(rate(all))} of ${all.n}` : 'not answered yet';
      const tag = t === weakest ? '<span class="tag">weakest</span>' : '';
      return `<div class="stat ${t === weakest ? 'weakest' : ''}"><span class="label">${TYPE_INFO[t].label}${tag}</span>` +
        `<b class="num">${main}</b><span class="faint num">first try${first ? ` · ${first.n}` : ''} · ${over}</span></div>`;
    }).join('');
    const since = f.since ? ` First-try counts started ${shortDate(f.since)}.` : '';
    return `<div class="card"><span class="label">Accuracy by question type</span>
      <p class="faint rule">First try = the first time you saw each question: the honest number. Overall includes repeats.${since}</p>
      <div class="stat-grid type-grid">${cells}</div></div>`;
  },
  trend() {
    const { series, thisWeek, lastWeek } = Engine.recent(14);
    const max = Math.max(1, ...series.map((d) => d.n));
    const cols = series.map((d, i) => {
      const lbl = i === series.length - 1 ? 'Today' : i === 0 ? shortDate(d.day) : '';
      const tip = `${shortDate(d.day)}: ${d.n} answers, ${d.r} right`;
      return `<div class="tr-col" title="${tip}"><div class="tr-stack" style="height:${(d.n / max) * 100}%">` +
        `${d.n - d.r ? `<i class="tr-miss" style="flex-grow:${d.n - d.r}"></i>` : ''}` +
        `${d.r ? `<i class="tr-right" style="flex-grow:${d.r}"></i>` : ''}</div><span class="tr-day">${lbl}</span></div>`;
    }).join('');
    const wk = (w) => (w.n ? `${pctText(w.r / w.n)} right of ${w.n}` : 'no answers');
    let delta = '';
    if (thisWeek.n && lastWeek.n) {
      const dd = Math.round((thisWeek.r / thisWeek.n - lastWeek.r / lastWeek.n) * 100);
      delta = dd === 0 ? ' · same as last week' : ` · ${dd > 0 ? '▲' : '▼'} ${Math.abs(dd)} points vs last week`;
    }
    const rows = series.map((d) => `<tr><td>${d.day}</td><td>${d.n}</td><td>${d.r}</td></tr>`).join('');
    return `<div class="card trend"><span class="label">Last 14 days</span>
      <p class="bank-line">This week: <b>${wk(thisWeek)}</b>${delta}. Last week: ${wk(lastWeek)}.</p>
      <div class="tr-chart" aria-hidden="true"><span class="tr-max num">${max}</span>${cols}</div>
      <ul class="st-legend inline"><li><i class="sw tr-right"></i>right</li><li><i class="sw tr-miss"></i>wrong or helped</li></ul>
      <table class="sr-only"><caption>Answers per day, last 14 days</caption><tr><th>Day</th><th>Answers</th><th>Right</th></tr>${rows}</table>
    </div>`;
  },
  exams(s) {
    if (!s.exams.length) return '<div class="card"><span class="label">Exam simulations</span><p class="dim">No exam simulations yet. ' +
      `Find it on the floor: ${MODES.exam.n} mixed questions, no hints, like the real final.</p></div>`;
    const list = s.exams.slice().reverse();
    const pct = (e) => Math.round((e.right / e.n) * 100);
    const row = (e, i) => {
      const prev = list[i + 1];
      const d = prev ? pct(e) - pct(prev) : null;
      const ch = d == null ? '' : `<span class="faint num">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)}</span>`;
      return `<li><span>${esc(shortDate(e.date))}</span><b class="num">${pct(e)}%</b><span class="faint num">${e.right}/${e.n}</span>${ch}</li>`;
    };
    const latest = list[0];
    let weakest = '';
    if (latest.byUnit) {
      const rooms = Object.keys(latest.byUnit).filter((u) => Content.unitById[u])
        .map((u) => ({ u: Content.unitById[u], r: latest.byUnit[u][0], n: latest.byUnit[u][1] }))
        .sort((x, y) => x.r / x.n - y.r / y.n).slice(0, 3);
      weakest = `<p class="faint rule">Weakest rooms last time: ${rooms.map((x) =>
        `Room ${x.u.room} ${esc(x.u.topic)} ${x.r}/${x.n}`).join(' · ')}</p>`;
    }
    return `<div class="card"><span class="label">Exam simulations</span>${weakest}<ul class="exam-list">${list.map(row).join('')}</ul></div>`;
  },
  extras(s) {
    const pctOf = (o) => (o && o.n ? pctText(o.r / o.n) : '—');
    const f = (s.firstStats && s.firstStats.origin) || {};
    return `<div class="stat-grid">
      ${this.tile('New ATI-style questions', pctOf(f.new), `first try · overall ${pctOf(s.originStats.new)}`)}
      ${this.tile('Guide questions', pctOf(f.guide), `first try · overall ${pctOf(s.originStats.guide)} (may be memorized)`)}
      ${this.tile('Cross-room recall', pctOf(s.rapid), 'Rapid Response questions from other rooms')}
      ${this.tile('Discharged', s.discharged, 'missed, then fixed')}
    </div>`;
  },
};

Screens.stats = {
  render() {
    const s = WR.state, rp = Engine.rankProgress();
    const badges = BADGES.map((b) => {
      const got = !!s.badges[b.id];
      return `<div class="badge ${got ? 'on' : ''}">${icon(got ? b.ico : 'lock')}<b>${esc(b.n)}</b><span>${esc(b.d)}</span></div>`;
    }).join('');
    const sub = `${esc(rp.cur.n)} · ${fmt(s.xp)} XP · ${Object.keys(s.badges).length} of ${BADGES.length} badges`;
    const P = StatsParts;
    return `${topbar('Report card', sub)}
      <div class="narrow stack">
        ${P.stand(s)}
        ${P.todo(s)}
        ${P.rooms()}
        ${P.focus()}
        ${P.types(s)}
        ${P.trend()}
        ${P.exams(s)}
        ${P.extras(s)}
        <div class="card"><span class="label">Badges</span><div class="badge-row">${badges}</div></div>
      </div>`;
  },
  act: {
    practiceWeak() { startReview(Engine.pickFocus(Engine.weakFocus()), 'Weak focus points'); },
    refreshDue() { startReview(Engine.pickDue(), 'Due for review'); },
  },
};

// ----- how to keep progress safe (the hosted version saves only in this browser)
const SaveHelp = {
  hosted() { return !(window.claude && typeof window.claude.use === 'function'); },
  ios() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  homeApp() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; },
  // where the player is right now, in one line
  status() {
    if (!this.ios()) return 'Progress is saved in this browser on this computer only.';
    if (this.homeApp()) return `${icon('check')} You are playing from the Home Screen icon, so Safari will not ` +
      `clear your progress.`;
    return 'You are playing in Safari. Safari can erase saved progress if you go about a week without opening the ' +
      'game, so add it to your Home Screen.';
  },
  steps(inModal) {
    const share = 'the <b>Share</b> button (a square with an arrow pointing up; on newer iPads it can be inside the ' +
      '<b>•••</b> menu)';
    const backupButton = inModal ? '<b>Back up now</b> below' : '<b>Download backup</b> above';
    const homeSteps = this.homeApp() ? '' : `
      <h3>1. Put the game on your Home Screen</h3>
      <ol class="steps">
        <li>In Safari, with this game open, tap ${share}.</li>
        <li>Scroll down and tap <b>Add to Home Screen</b>, then tap <b>Add</b>.</li>
        <li>From now on, always open Ward Rounds from its new icon (the red cross). It opens full screen and keeps
          its own save that Safari will not clear.</li>
        <li><b>Already played here in Safari?</b> The icon starts with a fresh save. Move your progress first:
          tap ${backupButton} and choose <b>Save to Files</b>. Then open the new icon, go to Settings,
          tap <b>Restore from backup</b>, and pick that file.</li>
      </ol>`;
    const n = this.homeApp() ? '' : '2. ';
    return `${homeSteps}
      <h3>${n}Make a backup now and then</h3>
      <ol class="steps">
        <li>Go to Settings (the gear) and tap <b>Download backup</b>.</li>
        <li>Choose <b>Save to Files</b>, then pick a folder (iCloud Drive keeps it safe even if you lose the iPad).</li>
        <li>To bring progress back, or onto another iPad: Settings, <b>Restore from backup</b>, then pick the file.</li>
      </ol>
      <h3>Things that erase progress</h3>
      <ul class="steps">
        <li>Deleting the Home Screen icon (it deletes that icon's save).</li>
        <li>Settings app, Safari, <b>Clear History and Website Data</b> (erases the save in Safari).</li>
        <li>Playing in a <b>Private</b> tab (nothing is kept after you close it).</li>
      </ul>`;
  },
  // shown once in Safari on an iPad, until "Got it"
  maybeRemind() {
    if (!this.hosted() || !this.ios() || this.homeApp() || WR.state.tips.iosSave) return;
    App.modal(`<h2>Keep your progress safe</h2>
      <p class="dim">Your progress is saved on this iPad only, and Safari can erase it if you go about a week without
        playing. Two quick habits keep it safe:</p>
      <div class="save-help">${this.steps(true)}</div>
      <div class="actions"><button class="btn" data-m="later">Remind me later</button><button class="btn"
        data-m="backup">${icon('download')}Back up now</button><button class="btn primary" data-m="ok" data-autofocus>Got it</button></div>`,
    (m) => {
      if (m === 'backup') { Screens.settings.act.backup(); return true; }
      if (m === 'ok') { WR.state.tips.iosSave = true; Store.save(); }
      return false;
    });
  },
};

// ----- settings
Screens.settings = {
  render() {
    const st = WR.state.settings;
    const cloud = Store.cloud.status === 'cloud'
      ? 'Progress autosaves to your Claude account after every tap, even mid-round, so it follows you to any device.'
      : 'Progress autosaves in this browser after every tap, even mid-round. It stays on this device only: '
        + 'see below for how to keep it safe.';
    // a row of buttons for one setting
    const seg = (key, opts) => {
      const btns = opts.map(([v, n]) => {
        const on = String(st[key]) === String(v);
        return `<button class="${on ? 'on' : ''}" data-action="setting" data-key="${key}" data-val="${v}" aria-pressed="${on}">${n}</button>`;
      }).join('');
      return `<div class="seg" role="group">${btns}</div>`;
    };
    const row = (title, note, control) =>
      `<div class="card set-row"><div><b>${title}</b>${note ? `<p class="dim">${note}</p>` : ''}</div>${control}</div>`;
    const goals = [[0, 'Auto']].concat(CONFIG.dailyTarget.choices.map((n) => [n, String(n)]));
    let saveHelp = '';
    if (Store.cloud.status !== 'cloud' && SaveHelp.hosted()) {
      const plain = '<ol class="steps"><li>Tap <b>Download backup</b> now and then and keep the file.</li>'
        + '<li>To bring progress back, or onto another device, tap <b>Restore from backup</b> and pick the file.</li>'
        + "<li>Clearing this browser's history or site data, or playing in a private window, erases progress.</li></ol>";
      saveHelp = `<div class="card save-help"><b>${SaveHelp.ios() ? 'How to save your game on iPad' : 'How to keep your progress'}</b>
          <p class="dim">${SaveHelp.status()}</p>${SaveHelp.ios() ? SaveHelp.steps() : plain}</div>`;
    }
    return `${topbar('Settings')}
      <div class="narrow stack">
        ${row('Sound', 'Chimes, buzzers, and the Code Blue alarm.', seg('sound', [[true, 'On'], [false, 'Off']]))}
        ${row('Motion', '"Calm" turns off walking, shaking, confetti, and the moving heart monitor.', seg('motion', [['auto', 'Auto'], ['full', 'Full'], ['reduced', 'Calm']]))}
        ${row('Silly patients', 'How wild patients get on a hot streak (and when things go wrong).',
          seg('whimsy', [['full', 'Full'], ['mild', 'Mild'], ['off', 'Off']]))}
        ${row('Text size', '', seg('text', [[1, 'A'], [1.12, 'A+'], [1.25, 'A++']]))}
        <div class="card set-row"><div><b>Exam date</b><p class="dim">Powers the countdown and your daily target.</p></div>
          <input type="date" id="exam-date" value="${esc(st.examDate)}" aria-label="Exam date"></div>
        ${row('Daily target', "Auto spreads what's left over the days before your exam.", seg('dailyGoal', goals))}
        <div class="card"><b>Your progress</b><p class="dim">${cloud}</p>
          <div class="btn-row"><button class="btn" data-action="backup">${icon('download')}Download backup</button>
          <label class="btn file-btn">${icon('upload')}Restore from backup<input type="file" id="restore"
            accept=".json,application/json"></label>
          <button class="btn" data-action="tutorial">${icon('book')}Show tutorial</button>
          <button class="btn danger" data-action="reset">Reset progress</button></div></div>
        ${saveHelp}
        <p class="faint center">Ward Rounds · BIOL 2401 study guide edition · ${Content.all().length} patients</p>
      </div>`;
  },
  mount(el) {
    const d = $('#exam-date', el);
    if (d) d.addEventListener('change', () => {
      WR.state.settings.examDate = d.value;
      Store.save();
      App.toast(d.value ? 'Exam date saved.' : 'Exam date cleared.');
    });
    const f = $('#restore', el);
    if (f) f.addEventListener('change', () => {
      const file = f.files && f.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = async () => {
        const ok = await App.confirm('Restore this backup?', 'It replaces your current progress on this device and in your account.', 'Restore');
        if (!ok) return;
        try {
          Store.importText(String(rd.result));
          applySettings();
          App.toast('Backup restored.');
          App.rerender();
        } catch (e) { App.toast(e.message || 'That file could not be read.'); }
      };
      rd.readAsText(file);
    });
  },
  act: {
    setting(d) {
      let v = d.val;
      // buttons carry text: turn it back into a boolean or number (motion and whimsy stay words)
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (!isNaN(+v) && d.key !== 'motion' && d.key !== 'whimsy') v = +v;
      WR.state.settings[d.key] = v;
      Store.save(); applySettings(); Sound.play('tap'); App.rerender();
    },
    async backup() {
      const text = Store.exportText();
      const filename = `ward-rounds-backup-${todayStr()}.json`;
      // claude.ai: its own download service
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (dl) {
        try { await dl.save({ filename, data: text }); App.toast('Backup saved.'); return; }
        catch (e) { if (e && e.code === 'declined') return; }
      }
      // iPad / iPhone: the share sheet's "Save to Files" works in Safari and from the Home Screen app
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      try {
        const file = new File([text], filename, { type: 'application/json' });
        if (ios && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Ward Rounds backup' });
          App.toast('Backup ready. Choose "Save to Files" to keep it.');
          return;
        }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      // everywhere else: an ordinary file download
      try {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        App.toast('Backup downloaded.');
        return;
      } catch (e) { /* fall through to the clipboard */ }
      try { await navigator.clipboard.writeText(text); App.toast('Backup copied. Paste it into a note and save it ' +
        'as a .json file.'); }
      catch (e) { App.toast('Saving files is not available here.'); }
    },
    tutorial() { App.show('onboard', { step: 2 }); },
    async reset() {
      if (await App.confirm('Reset all progress?', 'XP, badges, stars, and missed patients will be erased. Your ' +
        'settings stay.', 'Erase everything', true)) {
        Store.reset(); App.toast('Progress reset.'); App.show('onboard', { step: 0 });
      }
    },
  },
};

function applySettings() {
  document.documentElement.style.setProperty('--text-scale', WR.state.settings.text || 1);
  document.documentElement.dataset.calm = reducedMotion() ? '1' : '0';
}

// ----- onboarding
const topMultiplier = Math.max(...CONFIG.scoring.streakMultipliers.map((m) => m.mult));
const TUTORIAL = [
  {
    ico: 'bed', t: 'Each room is a ward',
    d: `Rooms 101 to 112 match your 12 chapters. Tap a room and your nurse walks in. A shift is ${MODES.shift.n} ` +
      `patients, `
      + 'and every patient is one question on a chart.',
  },
  {
    ico: 'heart', t: 'Lives, streaks, lifelines',
    d: `You get ${MODES.shift.lives} lives per shift. Right answers in a row raise your score multiplier up to ` +
      `×${topMultiplier}. `
      + 'Stuck? Ask a colleague to cross out wrong options (a right answer with help doesn\'t count toward mastery), '
      + 'or take a coffee break for +1 life.',
  },
  {
    ico: 'star', t: 'Learn from every miss',
    d: 'Every answer explains WHY, with memory tricks and ATI test tips. '
      + `Missed patients come back until you get them right on ${CONFIG.mastery.solidDays} different days. `
      + 'That is how stars and real mastery are earned.',
  },
];

Screens.onboard = {
  cls: 'onboard-screen',
  render(p) {
    const step = p.step || 0, s = WR.state, av = s.profile.avatar;
    const dots = `<div class="ob-dots">${[0, 1, 2, 3, 4].map((i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;
    let body;
    if (step === 0) {
      body = `<div class="ob-hero">${nurseSVG(av, 'cheer')}</div>
        <span class="label">BIOL 2401 · Anatomy & Physiology I</span>
        <h1 tabindex="-1">Welcome to Ward Rounds</h1>
        <p class="dim">A hospital study game built from your final exam study guide: ${Content.all().length} patients
          across 12 rooms.</p>
        <label class="ob-name"><span class="label">What should your patients call you? (optional)</span>
          <input id="nurse-name" type="text" maxlength="${CONFIG.profile.nameMaxLength}" autocomplete="nickname"
            value="${esc(s.profile.name)}" placeholder="Nurse name"></label>
        <button class="btn primary big block" data-action="ob" data-to="1">Next: make your nurse</button>`;
    } else if (step === 1) {
      // one row of choices: colour dots, or little nurse heads for hair styles
      const row = (key, list, isColor) => {
        const btns = list.map((x, i) => {
          const label = isColor ? (x.n || 'Tone ' + (i + 1)) : x;
          const inner = isColor
            ? `<span class="dot" style="background:${x.c || x}"></span>`
            : `<span class="sw-ava">${nurseSVG(Object.assign({}, av, { [key]: i }), 'happy', { headOnly: true })}</span>`;
          return `<button class="swatch small ${av[key] === i ? 'on' : ''}" data-action="obset" data-key="${key}" data-val="${i}" ` +
            `aria-label="${esc(label)}">${inner}</button>`;
        }).join('');
        return `<div class="ob-row">${btns}</div>`;
      };
      body = `<div class="ob-hero">${nurseSVG(av, 'happy')}</div><h1 tabindex="-1">Make your nurse</h1>
        <span class="label">Skin</span>${row('skin', AVATAR.skin, true)}
        <span class="label">Hair</span>${row('hair', AVATAR.hair, false)}
        <span class="label">Scrubs</span>${row('scrubs', AVATAR.scrubs.slice(0, 6), true)}
        <p class="faint">More in the Locker room later, including unlockable patterns and extras.</p>
        <button class="btn primary big block" data-action="ob" data-to="2">Looks good!</button>`;
    } else if (step <= 4) {
      const t = TUTORIAL[step - 2];
      body = `<div class="ob-card">${icon(t.ico)}</div><h1 tabindex="-1">${esc(t.t)}</h1><p class="dim ob-text">${esc(t.d)}</p>
        <button class="btn primary big block" data-action="ob"
          data-to="${step + 1}">${step === 4 ? 'Start my first shift' : 'Next'}</button>
        ${step < 4 ? `<button class="btn ghost block" data-action="ob" data-to="5">Skip</button>` : ''}`;
    }
    return `<div class="onboard narrow">${body}${dots}</div>`;
  },
  mount(el) {
    const n = $('#nurse-name', el);
    if (n) n.addEventListener('input', () => {
      WR.state.profile.name = n.value.trim().slice(0, CONFIG.profile.nameMaxLength);
    });
  },
  act: {
    ob(d) {
      const to = +d.to;
      Sound.play('tap');
      if (to >= 5) {
        const first = !WR.state.profile.onboarded;
        WR.state.profile.onboarded = true; Store.save({ now: true });
        if (first) startShift('ch7'); else App.show('floor');
        return;
      }
      Store.save();
      // swap the step in place: a full App.show() cross-fades two screens, so both steps' text overlapped (and was slow in Safari)
      App.params = { step: to };
      App.rerender({ scrollTop: 0 });
      const ob = $('.onboard', App.el);
      if (ob) ob.classList.add('ob-step');
    },
    obset(d) { WR.state.profile.avatar[d.key] = +d.val; Sound.play('tap'); App.rerender(); },
  },
};
