// ---------- end-of-round report ----------
function answerText(q, ans) {
  if (ans == null) return '—';
  if (q.type === 'order') return ans.map((i, k) => `${k + 1}. ${q.steps[i]}`).join('  ');
  if (q.type === 'sata') return ans.map((i) => q.opts[i].t).join('; ') || '—';
  return q.opts[ans] ? q.opts[ans].t : '—';
}
function correctText(q) {
  if (q.type === 'order') return q.steps.map((t, k) => `${k + 1}. ${t}`).join('  ');
  return q.opts.filter((o) => o.c).map((o) => o.t).join('; ');
}

function resultListHTML(run, onlyMissed) {
  const rows = run.results.filter((r) => !onlyMissed || !r.correct);
  if (!rows.length) return '';
  return `<ul class="result-list">${rows.map((r) => {
    const q = Content.byId[r.qid];
    const st = r.correct ? 'ok' : r.frac > 0 ? 'part' : 'bad';
    return `<li class="${st}"><details>
      <summary><span class="ri">${icon(r.correct ? 'check' : 'x')}</span><span class="rq">${esc(q.stem)}</span></summary>
      <div class="rbody">
        ${r.correct ? '' : `<p><span class="label">Your answer</span>${esc(answerText(q, r.ans))}</p>`}
        <p><span class="label">Correct</span>${esc(correctText(q))}</p>
        <p class="dim">${esc(q.why)}</p>
        ${q.trick ? `<p class="rtrick">${icon('bulb')}${esc(q.trick)}</p>` : ''}
      </div></details></li>`;
  }).join('')}</ul>`;
}

// ---------- discharge parade: this round's patients celebrate, scaled by the score ----------
// level 1 (<50%): polite waves · 2 (50-79%): conga line · 3 (80-99%): conga + hats in the air
// level 4 (100%, or the Superbug beaten): full parade, the nurse crowd-surfs over everyone
function paradeLevel(run) {
  const n = run.results.length;
  if (!n || run.mode === 'exam') return 0;
  if (run.mode === 'boss') return run.won ? 4 : 1;
  const pct = run.results.filter((r) => r.correct).length / n;
  const P = CONFIG.parade;
  return pct === 1 && n >= P.fullMinPatients ? 4 : pct >= P.hats ? 3 : pct >= P.conga ? 2 : 1;
}
function paradeHTML(run) {
  const lv = paradeLevel(run);
  if (!lv || (WR.state.settings.whimsy || 'full') === 'off') return '';
  const seen = new Set();
  const rows = run.results.filter((r) => !seen.has(r.qid) && seen.add(r.qid)).slice(-CONFIG.parade.maxPatients);
  const happy = lv >= 3 ? 'starry' : lv === 2 ? 'cheer' : 'happy';
  const hat = '<svg class="pp-hat" viewBox="0 0 20 24" aria-hidden="true">' +
    '<path d="M2 22 L10 2 L18 22z" fill="#f6bd52" stroke="#c98a1a"/>' +
    '<path d="M5 15 l10 -2 M7 9 l6 -1" stroke="#ff6b8a" stroke-width="2"/>' +
    '<circle cx="10" cy="2.5" r="2.5" fill="#ff6b8a"/></svg>';
  const people = rows.map((r, k) => {
    const q = Content.byId[r.qid];
    const p = patientFor(q, String(run.seed));
    // missed patients look sheepish but cheerful
    const face = patientHead(p, r.correct ? happy : 'silly');
    return `<span class="pp ${r.correct ? '' : 'missed'}" style="--i:${k}">${lv >= 3 && r.correct ? hat : ''}${face}</span>`;
  }).join('');
  const surfer = lv === 4
    ? `<span class="pp-surfer">${nurseSVG(WR.state.profile.avatar, 'cheer', { headOnly: true })}</span>`
    : '';
  return `<div class="parade lv-${lv}" aria-hidden="true"><div class="parade-track">${people}</div>${surfer}</div>`;
}

// ---------- the report's headline, per mode: { title, sub, mood, extra } ----------
// (mood is the nurse's face; the score cut-offs for it are cosmetic)
const fillBar = (frac, color) => `<div class="bar"><i style="width:${frac * 100}%${color ? ';background:' + color : ''}"></i></div>`;

const ReportSummary = {
  shift(run, right, n) {
    const done = n >= run.queue.length;
    const out = {
      title: done ? (right === n ? 'Perfect shift!' : 'Shift complete') : 'Shift over',
      sub: done ? `${Content.unitLabel(run.unit)}` : 'You ran out of lives. Every miss is saved for review.',
      mood: done ? (right / Math.max(1, n) >= 0.7 ? 'cheer' : 'happy') : 'sad',
    };
    const m = Engine.mastery(run.unit);
    out.extra = `<div class="card unit-card"><div><span class="label">Room ${Content.unitById[run.unit].room} mastery</span>
        <div class="room-stars big">${starRow(m.stars)}</div></div>
        <div class="mini-bars"><div><span>Known now (right, not in Missed Patients)</span><b class="num">${m.ever}/${m.total}</b></div>${fillBar(m.everFrac)}
        <div><span>Mastered (right on ${CONFIG.mastery.solidDays} different days)</span><b
          class="num">${m.solid}/${m.total}</b></div>${fillBar(m.solidFrac, 'var(--good)')}</div></div>`;
    const ev = run.event;
    if (ev && ev.results.length) {
      const er = ev.results.filter((x) => x.correct).length, of = ev.results.length;
      let line;
      if (ev.type === 'rapid') line = `<b>Rapid Response:</b> ${er}/${of} right. That's recall from other rooms, the kind the final exam asks for.`;
      else if (ev.type === 'visitor') {
        line = `<b>Visitor question:</b> ${er ? `answered right, +${EVENTS.visitor.xp} bonus XP.` : 'missed; it is saved for review.'}`;
      } else line = `<b>Power outage:</b> ${er}/${of} right by flashlight.`;
      const ico = { rapid: 'alarm', visitor: 'users' }[ev.type] || 'sparkle';
      out.extra += `<div class="card ev-sum ev-${ev.type}">${icon(ico)}<p>${line}</p></div>`;
    }
    return out;
  },
  daily(run, right, n) {
    const d = WR.state.daily;
    return {
      title: right === n ? 'Daily challenge: perfect!' : 'Daily challenge done',
      mood: right >= 4 ? 'cheer' : 'happy',
      sub: run.dailyFirst
        ? `${right} of ${n} right · ${d.streak}-day daily streak${d.streak > 1 ? '!' : ''}`
        : `${right} of ${n} right · replay (today's streak was already counted)`,
    };
  },
  review(run, right, n) {
    const sub = `${right} of ${n} right. Patients right on ${CONFIG.mastery.solidDays} different days get discharged.`;
    return { title: 'Re-rounds done', sub, mood: 'happy' };
  },
  codeblue(run, right) {
    return {
      title: right >= CONFIG.badges.codeblue12 ? 'Patient saved!' : 'Code called',
      sub: `You answered ${right} right before time ran out.`,
      mood: right >= 8 ? 'cheer' : 'focus',
      extra: `<p class="dim center">Best Code Blue score: <b class="num">${fmt(WR.state.codeBlueBest)}</b></p>`,
    };
  },
  boss(run) {
    return {
      title: run.won ? 'Superbug defeated!' : 'The Superbug got away',
      mood: run.won ? 'cheer' : 'sad',
      sub: run.won ? 'Infection cleared. The whole hospital is cheering.' : `It had ${run.hp} HP left. Review your misses and try again.`,
    };
  },
  exam(run, right, n, pct) {
    const pass = pct >= CONFIG.exam.passFraction * 100, close = pct >= CONFIG.exam.closeFraction * 100;
    let sub = 'Good baseline. Your weakest rooms are listed below.';
    if (pass) sub = 'Exam ready. Keep it warm with short daily shifts.';
    else if (close) sub = 'Close! Focus on your weakest rooms below.';
    // right / total per room, weakest room first
    const by = {};
    run.results.forEach((r) => {
      const u = Content.byId[r.qid].unit;
      by[u] = by[u] || [0, 0];
      by[u][1]++;
      if (r.correct) by[u][0]++;
    });
    const frac = (u) => by[u.id][0] / by[u.id][1];
    const rows = Content.units.filter((u) => by[u.id]).sort((a, b) => frac(a) - frac(b)).map((u) => {
      const [r, t] = by[u.id], f = r / t;
      const color = f >= 0.8 ? 'var(--good)' : f >= 0.6 ? 'var(--warn)' : 'var(--bad)';
      return `<div class="ub"><span>${u.room} ${esc(u.topic)}</span>${fillBar(f, color)}<b class="num">${r}/${t}</b></div>`;
    }).join('');
    const extra = `<div class="card"><span class="label">Score by room</span><div class="unit-bars">${rows}</div></div>`;
    return { title: 'Exam results', mood: pass ? 'cheer' : close ? 'happy' : 'focus', sub, extra };
  },
};

function reportButtons(run) {
  const missedN = run.results.filter((r) => !r.correct).length;
  const btn = (cls, action, text) => `<button class="btn${cls ? ' ' + cls : ''}" data-action="${action}">${text}</button>`;
  let btns = '';
  if (missedN && run.mode !== 'review') btns += btn('', 'reviewRun', `${icon('bed')}Review these ${missedN} misses`);
  if (run.mode === 'shift') btns += btn('primary big', 'again', `Next shift in Room ${Content.unitById[run.unit].room}`);
  if (run.mode === 'daily') btns += btn('', 'again', `Replay today's ${MODES.daily.n} (not scored)`);
  if (run.mode === 'codeblue' || run.mode === 'boss') {
    btns += btn('primary big', 'again', run.mode === 'boss' ? 'Fight again' : 'Run another Code Blue');
  }
  const homeIsMain = run.mode === 'review' || run.mode === 'exam' || run.mode === 'daily';
  btns += `<button class="btn ${homeIsMain ? 'primary big' : ''}" data-action="home">Back to the floor</button>`;
  return btns;
}

Screens.report = {
  cls: 'report',
  render() {
    const run = App.run;
    if (!run) return '';
    const right = run.results.filter((r) => r.correct).length;
    const n = run.results.length;
    const pct = n ? Math.round((right / n) * 100) : 0;
    const xp = WR.state.xp - run.xpStart;
    const { title, sub, mood, extra = '' } = ReportSummary[run.mode](run, right, n, pct);
    const badges = [...new Set(run.newBadges)].map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
    const stats = [
      ['Patients', n], ['Right', `${right}`], ['Accuracy', pct + '%'],
      ['Score', fmt(run.score)], ['Best streak', run.best], ['XP earned', '+' + fmt(xp)],
    ];
    const kind = MODE_TITLE[run.mode] || (run.mode === 'review' ? 'Missed patients' : 'Shift report');
    const statHTML = stats.map(([k, v]) => `<div class="stat"><span class="label">${k}</span><b class="num">${v}</b></div>`).join('');
    const badgeHTML = badges.length
      ? '<div class="card"><span class="label">New badges</span><div class="badge-row">' +
        badges.map((b) => `<div class="badge on">${icon(b.ico)}<b>${esc(b.n)}</b><span>${esc(b.d)}</span></div>`).join('') + '</div></div>'
      : '';
    const listLabel = run.mode === 'exam' ? 'Every question, with explanations' : 'Patients this round';
    return `<div class="narrow report-wrap">
      <div class="report-hero">
        <div class="report-nurse">${nurseSVG(WR.state.profile.avatar, mood)}</div>
        <div><span class="label">${esc(kind)}</span><h1 tabindex="-1">${esc(title)}</h1><p class="dim">${esc(sub)}</p>
        ${run.mode === 'exam' ? `<p class="exam-pct num">${pct}%</p>` : ''}</div>
      </div>
      ${paradeHTML(run)}
      <div class="stat-grid">${statHTML}</div>
      ${extra}
      ${badgeHTML}
      <div class="report-actions">${reportButtons(run)}</div>
      ${n ? `<div class="card"><span class="label">${listLabel}</span>${resultListHTML(run, false)}</div>` : ''}
    </div>`;
  },
  mount() {
    const run = App.run;
    if (!run) return;
    const n = run.results.length, right = run.results.filter((r) => r.correct).length;
    const good = run.mode === 'boss' ? run.won : n && right / n >= CONFIG.parade.hats;
    const whimsyOn = (WR.state.settings.whimsy || 'full') !== 'off';
    if (paradeLevel(run) === 4 && whimsyOn) { Sound.play('tada'); FX.confetti(); }
    else if (good) { Sound.play('win'); FX.confetti(); }
    else if (run.mode === 'boss' || (run.maxLives && run.lives <= 0)) Sound.play('lose');
    celebrate(run);
    badgeToast(run.endBadges || []);
    run.endBadges = [];
  },
  act: {
    again() {
      const run = App.run;
      if (run.mode === 'shift') startShift(run.unit); else if (run.mode === 'daily') startDaily(); else startMode(run.mode);
    },
    reviewRun() {
      const ids = App.run.results.filter((r) => !r.correct).map((r) => r.qid);
      startReview([...new Set(ids)], 'Review this round');
    },
  },
};
