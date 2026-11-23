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
  return pct === 1 && n >= 5 ? 4 : pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : 1;
}
function paradeHTML(run) {
  const lv = paradeLevel(run);
  if (!lv || (WR.state.settings.whimsy || 'full') === 'off') return '';
  const seen = new Set();
  const rows = run.results.filter((r) => !seen.has(r.qid) && seen.add(r.qid)).slice(-12);
  const happy = lv >= 3 ? 'starry' : lv === 2 ? 'cheer' : 'happy';
  const hat = '<svg class="pp-hat" viewBox="0 0 20 24" aria-hidden="true"><path d="M2 22 L10 2 L18 22z" fill="#f6bd52" stroke="#c98a1a"/><path d="M5 15 l10 -2 M7 9 l6 -1" stroke="#ff6b8a" stroke-width="2"/><circle cx="10" cy="2.5" r="2.5" fill="#ff6b8a"/></svg>';
  const people = rows.map((r, k) => {
    const q = Content.byId[r.qid];
    const p = patientFor(q, String(run.seed));
    // missed patients look sheepish but cheerful
    return `<span class="pp ${r.correct ? '' : 'missed'}" style="--i:${k}">${lv >= 3 && r.correct ? hat : ''}${patientHead(p, r.correct ? happy : 'silly')}</span>`;
  }).join('');
  const surfer = lv === 4 ? `<span class="pp-surfer">${nurseSVG(WR.state.profile.avatar, 'cheer', { headOnly: true })}</span>` : '';
  return `<div class="parade lv-${lv}" aria-hidden="true"><div class="parade-track">${people}</div>${surfer}</div>`;
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
    let title, sub, mood, extra = '';
    if (run.mode === 'shift') {
      const done = n >= run.queue.length;
      title = done ? (right === n ? 'Perfect shift!' : 'Shift complete') : 'Shift over';
      sub = done ? `${Content.unitLabel(run.unit)}` : 'You ran out of lives. Every miss is saved for review.';
      mood = done ? (right / Math.max(1, n) >= 0.7 ? 'cheer' : 'happy') : 'sad';
      const m = Engine.mastery(run.unit);
      extra = `<div class="card unit-card"><div><span class="label">Room ${Content.unitById[run.unit].room} mastery</span>
        <div class="room-stars big">${starRow(m.stars)}</div></div>
        <div class="mini-bars"><div><span>Answered right at least once</span><b class="num">${m.ever}/${m.total}</b></div><div class="bar"><i style="width:${m.everFrac * 100}%"></i></div>
        <div><span>Mastered (right on 2 different days)</span><b class="num">${m.solid}/${m.total}</b></div><div class="bar"><i style="width:${m.solidFrac * 100}%;background:var(--good)"></i></div></div></div>`;
      const ev = run.event;
      if (ev && ev.results.length) {
        const er = ev.results.filter((x) => x.correct).length;
        const line = ev.type === 'rapid' ? `<b>Rapid Response:</b> ${er}/${ev.results.length} right. That's recall from other rooms, the kind the final exam asks for.`
          : ev.type === 'visitor' ? `<b>Visitor question:</b> ${er ? 'answered right, +15 bonus XP.' : 'missed; it is saved for review.'}`
            : `<b>Power outage:</b> ${er}/${ev.results.length} right by flashlight.`;
        extra += `<div class="card ev-sum ev-${ev.type}">${icon(ev.type === 'rapid' ? 'alarm' : ev.type === 'visitor' ? 'users' : 'sparkle')}<p>${line}</p></div>`;
      }
    } else if (run.mode === 'daily') {
      const d = WR.state.daily;
      title = right === n ? 'Daily challenge: perfect!' : 'Daily challenge done';
      mood = right >= 4 ? 'cheer' : 'happy';
      sub = run.dailyFirst ? `${right} of ${n} right · ${d.streak}-day daily streak${d.streak > 1 ? '!' : ''}` : `${right} of ${n} right · replay (today's streak was already counted)`;
    } else if (run.mode === 'review') {
      title = 'Re-rounds done'; sub = `${right} of ${n} right. Patients right on 2 different days get discharged.`; mood = 'happy';
    } else if (run.mode === 'codeblue') {
      title = right >= 12 ? 'Patient saved!' : 'Code called'; sub = `You answered ${right} right before time ran out.`; mood = right >= 8 ? 'cheer' : 'focus';
      extra = `<p class="dim center">Best Code Blue score: <b class="num">${fmt(WR.state.codeBlueBest)}</b></p>`;
    } else if (run.mode === 'boss') {
      title = run.won ? 'Superbug defeated!' : 'The Superbug got away'; mood = run.won ? 'cheer' : 'sad';
      sub = run.won ? 'Infection cleared. The whole hospital is cheering.' : `It had ${run.hp} HP left. Review your misses and try again.`;
    } else {
      title = 'Exam results'; mood = pct >= 80 ? 'cheer' : pct >= 65 ? 'happy' : 'focus';
      sub = pct >= 80 ? 'Exam ready. Keep it warm with short daily shifts.' : pct >= 65 ? 'Close! Focus on your weakest rooms below.' : 'Good baseline. Your weakest rooms are listed below.';
      const by = {};
      run.results.forEach((r) => { const u = Content.byId[r.qid].unit; by[u] = by[u] || [0, 0]; by[u][1]++; if (r.correct) by[u][0]++; });
      extra = `<div class="card"><span class="label">Score by room</span><div class="unit-bars">${Content.units.filter((u) => by[u.id]).sort((a, b) => by[a.id][0] / by[a.id][1] - by[b.id][0] / by[b.id][1]).map((u) => {
        const [r, t] = by[u.id], f = r / t;
        return `<div class="ub"><span>${u.room} ${esc(u.topic)}</span><div class="bar"><i style="width:${f * 100}%;background:${f >= 0.8 ? 'var(--good)' : f >= 0.6 ? 'var(--warn)' : 'var(--bad)'}"></i></div><b class="num">${r}/${t}</b></div>`;
      }).join('')}</div></div>`;
    }
    const badges = [...new Set(run.newBadges)].map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
    const stats = [
      ['Patients', n], ['Right', `${right}`], ['Accuracy', pct + '%'],
      ['Score', fmt(run.score)], ['Best streak', run.best], ['XP earned', '+' + fmt(xp)],
    ];
    const missedN = run.results.filter((r) => !r.correct).length;
    let btns = '';
    if (missedN && run.mode !== 'review') btns += `<button class="btn" data-action="reviewRun">${icon('bed')}Review these ${missedN} misses</button>`;
    if (run.mode === 'shift') btns += `<button class="btn primary big" data-action="again">Next shift in Room ${Content.unitById[run.unit].room}</button>`;
    if (run.mode === 'daily') btns += `<button class="btn" data-action="again">Replay today's 5 (not scored)</button>`;
    if (run.mode === 'codeblue' || run.mode === 'boss') btns += `<button class="btn primary big" data-action="again">${run.mode === 'boss' ? 'Fight again' : 'Run another Code Blue'}</button>`;
    btns += `<button class="btn ${run.mode === 'review' || run.mode === 'exam' || run.mode === 'daily' ? 'primary big' : ''}" data-action="home">Back to the floor</button>`;
    return `<div class="narrow report-wrap">
      <div class="report-hero">
        <div class="report-nurse">${nurseSVG(WR.state.profile.avatar, mood)}</div>
        <div><span class="label">${esc(MODE_TITLE[run.mode] || (run.mode === 'review' ? 'Missed patients' : 'Shift report'))}</span><h1 tabindex="-1">${esc(title)}</h1><p class="dim">${esc(sub)}</p>
        ${run.mode === 'exam' ? `<p class="exam-pct num">${pct}%</p>` : ''}</div>
      </div>
      ${paradeHTML(run)}
      <div class="stat-grid">${stats.map(([k, v]) => `<div class="stat"><span class="label">${k}</span><b class="num">${v}</b></div>`).join('')}</div>
      ${extra}
      ${badges.length ? `<div class="card"><span class="label">New badges</span><div class="badge-row">${badges.map((b) => `<div class="badge on">${icon(b.ico)}<b>${esc(b.n)}</b><span>${esc(b.d)}</span></div>`).join('')}</div></div>` : ''}
      <div class="report-actions">${btns}</div>
      ${n ? `<div class="card"><span class="label">${run.mode === 'exam' ? 'Every question, with explanations' : 'Patients this round'}</span>${resultListHTML(run, false)}</div>` : ''}
    </div>`;
  },
  mount() {
    const run = App.run;
    if (!run) return;
    const good = run.mode === 'boss' ? run.won : run.results.length && run.results.filter((r) => r.correct).length / run.results.length >= 0.8;
    if (paradeLevel(run) === 4 && (WR.state.settings.whimsy || 'full') !== 'off') { Sound.play('tada'); FX.confetti(); }
    else if (good) { Sound.play('win'); FX.confetti(); } else if (run.mode === 'boss' || (run.maxLives && run.lives <= 0)) Sound.play('lose');
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
