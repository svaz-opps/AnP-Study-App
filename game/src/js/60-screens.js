// ---------- missed patients, locker, report card, settings, onboarding ----------
function topbar(title, sub) {
  return `<div class="topbar narrow"><button class="icon-btn" data-action="home" aria-label="Back to the floor">${icon('back')}</button>
    <div class="grow"><h1 tabindex="-1">${esc(title)}</h1>${sub ? `<p class="dim">${esc(sub)}</p>` : ''}</div></div>`;
}

// ----- missed patients
Screens.missed = {
  render() {
    const all = Engine.missed();
    const s = WR.state;
    let body;
    if (!all.length) {
      body = `<div class="card empty">${patientHead(patientFor({ id: 'empty-missed', stem: '' }), 'cheer')}<h2>No missed patients</h2><p class="dim">When you miss a question, the patient comes here. Get it right on 2 different days and they're discharged.</p></div>`;
    } else {
      body = `<button class="btn primary big block" data-action="reviewAll">${icon('play')}Start re-rounds (${Math.min(10, all.length)} patients)</button>
      <div class="missed-rooms">${Content.units.map((u) => {
        const list = all.filter((q) => q.unit === u.id);
        if (!list.length) return '';
        return `<div class="card missed-room"><div class="mr-head"><span class="room-plate">${u.room}</span><b>${esc(u.ward)} · ${esc(u.topic)}</b><span class="chip">${list.length} waiting</span>
          <button class="btn" data-action="reviewUnit" data-unit="${u.id}">Re-round</button></div>
          <ul class="mr-list">${list.slice(0, 4).map((q) => { const r = s.items[q.id]; return `<li><span class="rq">${esc(q.stem)}</span><span class="faint num">${r.ok ? '1 of 2 days right' : 'missed ' + r.w + '×'}</span></li>`; }).join('')}${list.length > 4 ? `<li class="faint">+ ${list.length - 4} more</li>` : ''}</ul></div>`;
      }).join('')}</div>`;
    }
    return `${topbar('Missed patients', `${all.length} waiting · ${s.discharged} discharged so far`)}<div class="narrow stack">${body}</div>`;
  },
  act: {
    reviewAll() { startReview(Engine.pickReview(null, 10), 'Missed patients'); },
    reviewUnit(d) { startReview(Engine.pickReview(d.unit, 10), 'Missed: ' + Content.unitById[d.unit].topic); },
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
    const tabs = LOCKER_TABS.map(([k, n]) => `<button class="tab ${k === tab ? 'on' : ''}" data-action="tab" data-tab="${k}" aria-pressed="${k === tab}">${n}</button>`).join('');
    let items = '';
    const sw = (key, i, inner, label, on) => {
      const lk = `${key}:${i}`, open = isUnlocked(lk);
      return `<button class="swatch ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-action="set" data-key="${key}" data-val="${i}" aria-pressed="${on}" aria-label="${esc(label)}${open ? '' : ' (locked: ' + esc(reqText(lk)) + ')'}">${inner}${open ? '' : `<span class="lock">${icon('lock')}</span>`}<span class="sw-name">${esc(open ? label : reqText(lk))}</span></button>`;
    };
    const preview = (patch) => `<span class="sw-ava">${nurseSVG(Object.assign({}, av, patch), 'happy', { headOnly: true })}</span>`;
    if (tab === 'skin') items = AVATAR.skin.map((c, i) => sw('skin', i, `<span class="dot" style="background:${c}"></span>`, `Skin tone ${i + 1}`, av.skin === i)).join('');
    if (tab === 'hair') items = AVATAR.hair.map((n, i) => sw('hair', i, preview({ hair: i }), n, av.hair === i)).join('');
    if (tab === 'hairColor') items = (av.hair === 7 ? AVATAR.hijab.map((c, i) => ({ n: 'Hijab ' + (i + 1), c })) : AVATAR.hairColor).map((h, i) => sw('hairColor', i, `<span class="dot" style="background:${h.c}"></span>`, h.n, av.hairColor === i)).join('');
    if (tab === 'eyes') items = AVATAR.eyes.map((n, i) => sw('eyes', i, preview({ eyes: i }), n, av.eyes === i)).join('');
    if (tab === 'scrubs') items = AVATAR.scrubs.map((s, i) => sw('scrubs', i, `<span class="dot" style="background:${s.c}"></span>`, s.n, av.scrubs === i)).join('');
    if (tab === 'pattern') items = AVATAR.pattern.map((n, i) => sw('pattern', i, `<span class="sw-body">${nurseSVG(Object.assign({}, av, { pattern: i }), 'happy')}</span>`, n, av.pattern === i)).join('');
    if (tab === 'shoes') items = AVATAR.shoes.map((s, i) => sw('shoes', i, `<span class="dot" style="background:${s.c}"></span>`, s.n, av.shoes === i)).join('');
    if (tab === 'acc') items = AVATAR.acc.map((a) => {
      const lk = 'acc:' + a.id, open = isUnlocked(lk), on = (av.acc || []).indexOf(a.id) !== -1;
      return `<button class="swatch ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-action="acc" data-id="${a.id}" aria-pressed="${on}" aria-label="${esc(a.n)}${open ? '' : ' (locked)'}">${preview({ acc: [a.id] })}${open ? '' : `<span class="lock">${icon('lock')}</span>`}<span class="sw-name">${esc(open ? a.n : reqText(lk))}</span></button>`;
    }).join('');
    return `${topbar('Locker room', 'Make your nurse yours. Some items unlock as you rank up and earn badges.')}
      <div class="locker narrow">
        <div class="locker-preview card"><button class="locker-nurse" data-action="poke" aria-label="Your nurse. Tap to change expression.">${nurseSVG(av, this.mood)}</button>
          <div class="bubble">${esc(['Looking sharp!', 'Ready for rounds!', 'Love these scrubs.', 'Fresh shift, fresh look.'][Object.keys(av).length % 4])}</div></div>
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
      if (d.key === 'hair' && +d.val === 7) WR.state.profile.avatar.hairColor = Math.min(WR.state.profile.avatar.hairColor, AVATAR.hijab.length - 1);
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

// ----- report card
function weakFocus() {
  const agg = {};
  for (const q of Content.all()) {
    const r = WR.state.items[q.id];
    if (!r || !r.s || !q.focus || !q.focus.length) continue;
    for (const [sec, i] of q.focus) {
      const k = sec + '#' + i;
      const a = agg[k] || (agg[k] = { sec, i, s: 0, w: 0, qids: [] });
      a.s += r.s; a.w += r.w; a.qids.push(q.id);
    }
  }
  return Object.values(agg).filter((a) => a.w > 0).sort((a, b) => b.w / b.s - a.w / a.s || b.w - a.w).slice(0, 5);
}

Screens.stats = {
  render() {
    const s = WR.state, rp = Engine.rankProgress();
    const pctOf = (o) => (o && o.n ? Math.round((o.r / o.n) * 100) + '%' : '—');
    const units = Content.units.map((u) => {
      const m = Engine.mastery(u.id);
      return `<div class="ub"><span>${u.room} ${esc(u.topic)}</span><div class="bar dual"><i style="width:${m.everFrac * 100}%"></i><i class="solid" style="width:${m.solidFrac * 100}%"></i></div><span class="room-stars">${starRow(m.stars)}</span></div>`;
    }).join('');
    const types = Object.keys(TYPE_INFO).map((t) => `<div class="stat"><span class="label">${TYPE_INFO[t].label}</span><b class="num">${pctOf(s.typeStats[t])}</b><span class="faint num">${s.typeStats[t] ? s.typeStats[t].n : 0} answered</span></div>`).join('');
    const weak = weakFocus();
    const weakHTML = weak.length ? `<ol class="weak-list">${weak.map((a) => `<li><b>${esc(Content.section(a.sec).focus[a.i])}</b><span class="faint">${esc(Content.section(a.sec).num + ' ' + Content.section(a.sec).title)} · missed ${a.w} of ${a.s}</span></li>`).join('')}</ol>
      <button class="btn primary" data-action="practiceWeak">${icon('target')}Practice these</button>` : '<p class="dim">Answer some new ATI-style questions and your weakest instructor focus points will show up here.</p>';
    const badges = BADGES.map((b) => `<div class="badge ${s.badges[b.id] ? 'on' : ''}">${icon(s.badges[b.id] ? b.ico : 'lock')}<b>${esc(b.n)}</b><span>${esc(b.d)}</span></div>`).join('');
    const exams = s.exams.length ? `<ul class="exam-list">${s.exams.slice().reverse().map((e) => `<li><span>${esc(e.date)}</span><b class="num">${Math.round((e.right / e.n) * 100)}%</b><span class="faint num">${e.right}/${e.n}</span></li>`).join('')}</ul>` : '<p class="dim">No exam simulations yet. Find it on the floor.</p>';
    return `${topbar('Report card', `${esc(rp.cur.n)} · ${fmt(s.xp)} XP · ${Object.keys(s.badges).length} of ${BADGES.length} badges`)}
      <div class="narrow stack">
        <div class="stat-grid">
          <div class="stat"><span class="label">New ATI-style questions</span><b class="num">${pctOf(s.originStats.new)}</b><span class="faint">your honest readiness score</span></div>
          <div class="stat"><span class="label">Guide questions</span><b class="num">${pctOf(s.originStats.guide)}</b><span class="faint">may include memorized ones</span></div>
          <div class="stat"><span class="label">Discharged</span><b class="num">${s.discharged}</b><span class="faint">missed, then fixed</span></div>
          <div class="stat"><span class="label">Cross-room recall</span><b class="num">${pctOf(s.rapid)}</b><span class="faint">Rapid Response questions from other rooms</span></div>
        </div>
        <div class="card"><span class="label">Weakest instructor focus points</span>${weakHTML}</div>
        <div class="card"><span class="label">Rooms <span class="legend"><i></i>right once <i class="solid"></i>mastered</span></span><div class="unit-bars">${units}</div></div>
        <div class="card"><span class="label">Accuracy by question type</span><div class="stat-grid">${types}</div></div>
        <div class="card"><span class="label">Badges</span><div class="badge-row">${badges}</div></div>
        <div class="card"><span class="label">Exam simulations</span>${exams}</div>
      </div>`;
  },
  act: {
    practiceWeak() {
      const ids = [...new Set(weakFocus().flatMap((a) => a.qids))];
      startReview(shuffle(ids).slice(0, 10), 'Weak focus points');
    },
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
    if (this.homeApp()) return `${icon('check')} You are playing from the Home Screen icon, so Safari will not clear your progress.`;
    return 'You are playing in Safari. Safari can erase saved progress if you go about a week without opening the game, so add it to your Home Screen.';
  },
  steps(inModal) {
    const share = 'the <b>Share</b> button (a square with an arrow pointing up; on newer iPads it can be inside the <b>•••</b> menu)';
    const homeSteps = this.homeApp() ? '' : `
      <h3>1. Put the game on your Home Screen</h3>
      <ol class="steps">
        <li>In Safari, with this game open, tap ${share}.</li>
        <li>Scroll down and tap <b>Add to Home Screen</b>, then tap <b>Add</b>.</li>
        <li>From now on, always open Ward Rounds from its new icon (the red cross). It opens full screen and keeps its own save that Safari will not clear.</li>
        <li><b>Already played here in Safari?</b> The icon starts with a fresh save. Move your progress first: tap ${inModal ? '<b>Back up now</b> below' : '<b>Download backup</b> above'} and choose <b>Save to Files</b>. Then open the new icon, go to Settings, tap <b>Restore from backup</b>, and pick that file.</li>
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
      <p class="dim">Your progress is saved on this iPad only, and Safari can erase it if you go about a week without playing. Two quick habits keep it safe:</p>
      <div class="save-help">${this.steps(true)}</div>
      <div class="actions"><button class="btn" data-m="later">Remind me later</button><button class="btn" data-m="backup">${icon('download')}Back up now</button><button class="btn primary" data-m="ok" data-autofocus>Got it</button></div>`,
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
    const cloud = Store.cloud.status === 'cloud' ? 'Progress autosaves to your Claude account after every tap, even mid-round, so it follows you to any device.' : 'Progress autosaves in this browser after every tap, even mid-round. It stays on this device only: see below for how to keep it safe.';
    const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, n]) => `<button class="${String(st[key]) === String(v) ? 'on' : ''}" data-action="setting" data-key="${key}" data-val="${v}" aria-pressed="${String(st[key]) === String(v)}">${n}</button>`).join('')}</div>`;
    return `${topbar('Settings')}
      <div class="narrow stack">
        <div class="card set-row"><div><b>Sound</b><p class="dim">Chimes, buzzers, and the Code Blue alarm.</p></div>${seg('sound', [[true, 'On'], [false, 'Off']])}</div>
        <div class="card set-row"><div><b>Motion</b><p class="dim">"Calm" turns off walking, shaking, and confetti.</p></div>${seg('motion', [['auto', 'Auto'], ['full', 'Full'], ['reduced', 'Calm']])}</div>
        <div class="card set-row"><div><b>Silly patients</b><p class="dim">How wild patients get on a hot streak (and when things go wrong).</p></div>${seg('whimsy', [['full', 'Full'], ['mild', 'Mild'], ['off', 'Off']])}</div>
        <div class="card set-row"><div><b>Text size</b></div>${seg('text', [[1, 'A'], [1.12, 'A+'], [1.25, 'A++']])}</div>
        <div class="card set-row"><div><b>Exam date</b><p class="dim">Powers the countdown and your daily target.</p></div>
          <input type="date" id="exam-date" value="${esc(st.examDate)}" aria-label="Exam date"></div>
        <div class="card set-row"><div><b>Daily target</b><p class="dim">Auto spreads what's left over the days before your exam.</p></div>${seg('dailyGoal', [[0, 'Auto'], [20, '20'], [40, '40'], [60, '60']])}</div>
        <div class="card"><b>Your progress</b><p class="dim">${cloud}</p>
          <div class="btn-row"><button class="btn" data-action="backup">${icon('download')}Download backup</button>
          <label class="btn file-btn">${icon('upload')}Restore from backup<input type="file" id="restore" accept=".json,application/json"></label>
          <button class="btn" data-action="tutorial">${icon('book')}Show tutorial</button>
          <button class="btn danger" data-action="reset">Reset progress</button></div></div>
        ${Store.cloud.status === 'cloud' || !SaveHelp.hosted() ? '' : `<div class="card save-help"><b>${SaveHelp.ios() ? 'How to save your game on iPad' : 'How to keep your progress'}</b>
          <p class="dim">${SaveHelp.status()}</p>${SaveHelp.ios() ? SaveHelp.steps() : `<ol class="steps"><li>Tap <b>Download backup</b> now and then and keep the file.</li><li>To bring progress back, or onto another device, tap <b>Restore from backup</b> and pick the file.</li><li>Clearing this browser's history or site data, or playing in a private window, erases progress.</li></ol>`}</div>`}
        <p class="faint center">Ward Rounds · BIOL 2401 study guide edition · ${Content.all().length} patients</p>
      </div>`;
  },
  mount(el) {
    const d = $('#exam-date', el);
    if (d) d.addEventListener('change', () => { WR.state.settings.examDate = d.value; Store.save(); App.toast(d.value ? 'Exam date saved.' : 'Exam date cleared.'); });
    const f = $('#restore', el);
    if (f) f.addEventListener('change', () => {
      const file = f.files && f.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = async () => {
        if (!(await App.confirm('Restore this backup?', 'It replaces your current progress on this device and in your account.', 'Restore'))) return;
        try { Store.importText(String(rd.result)); applySettings(); App.toast('Backup restored.'); App.rerender(); } catch (e) { App.toast(e.message || 'That file could not be read.'); }
      };
      rd.readAsText(file);
    });
  },
  act: {
    setting(d) {
      let v = d.val;
      if (v === 'true') v = true; else if (v === 'false') v = false; else if (!isNaN(+v) && d.key !== 'motion' && d.key !== 'whimsy') v = +v;
      WR.state.settings[d.key] = v;
      Store.save(); applySettings(); Sound.play('tap'); App.rerender();
    },
    async backup() {
      const text = Store.exportText();
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (dl) {
        try { await dl.save({ filename: `ward-rounds-backup-${todayStr()}.json`, data: text }); App.toast('Backup saved.'); return; } catch (e) { if (e && e.code === 'declined') return; }
      }
      const filename = `ward-rounds-backup-${todayStr()}.json`;
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
      try { await navigator.clipboard.writeText(text); App.toast('Backup copied. Paste it into a note and save it as a .json file.'); }
      catch (e) { App.toast('Saving files is not available here.'); }
    },
    tutorial() { App.show('onboard', { step: 2 }); },
    async reset() {
      if (await App.confirm('Reset all progress?', 'XP, badges, stars, and missed patients will be erased. Your settings stay.', 'Erase everything', true)) {
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
const TUTORIAL = [
  { ico: 'bed', t: 'Each room is a ward', d: 'Rooms 101 to 112 match your 12 chapters. Tap a room and your nurse walks in. A shift is 10 patients, and every patient is one question on a chart.' },
  { ico: 'heart', t: 'Lives, streaks, lifelines', d: 'You get 3 lives per shift. Right answers in a row raise your score multiplier up to ×3. Stuck? Ask a colleague to cross out wrong options, or take a coffee break for +1 life.' },
  { ico: 'star', t: 'Learn from every miss', d: 'Every answer explains WHY, with memory tricks and ATI test tips. Missed patients come back until you get them right on 2 different days. That is how stars and real mastery are earned.' },
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
        <p class="dim">A hospital study game built from your final exam study guide: ${Content.all().length} patients across 12 rooms.</p>
        <label class="ob-name"><span class="label">What should your patients call you? (optional)</span>
          <input id="nurse-name" type="text" maxlength="18" autocomplete="nickname" value="${esc(s.profile.name)}" placeholder="Nurse name"></label>
        <button class="btn primary big block" data-action="ob" data-to="1">Next: make your nurse</button>`;
    } else if (step === 1) {
      const row = (key, list, isColor) => `<div class="ob-row">${list.map((x, i) => `<button class="swatch small ${av[key] === i ? 'on' : ''}" data-action="obset" data-key="${key}" data-val="${i}" aria-label="${esc(isColor ? (x.n || 'Tone ' + (i + 1)) : x)}">${isColor ? `<span class="dot" style="background:${x.c || x}"></span>` : `<span class="sw-ava">${nurseSVG(Object.assign({}, av, { [key]: i }), 'happy', { headOnly: true })}</span>`}</button>`).join('')}</div>`;
      body = `<div class="ob-hero">${nurseSVG(av, 'happy')}</div><h1 tabindex="-1">Make your nurse</h1>
        <span class="label">Skin</span>${row('skin', AVATAR.skin, true)}
        <span class="label">Hair</span>${row('hair', AVATAR.hair, false)}
        <span class="label">Scrubs</span>${row('scrubs', AVATAR.scrubs.slice(0, 6), true)}
        <p class="faint">More in the Locker room later, including unlockable patterns and extras.</p>
        <button class="btn primary big block" data-action="ob" data-to="2">Looks good!</button>`;
    } else if (step <= 4) {
      const t = TUTORIAL[step - 2];
      body = `<div class="ob-card">${icon(t.ico)}</div><h1 tabindex="-1">${esc(t.t)}</h1><p class="dim ob-text">${esc(t.d)}</p>
        <button class="btn primary big block" data-action="ob" data-to="${step + 1}">${step === 4 ? 'Start my first shift' : 'Next'}</button>
        ${step < 4 ? `<button class="btn ghost block" data-action="ob" data-to="5">Skip</button>` : ''}`;
    }
    return `<div class="onboard narrow">${body}${dots}</div>`;
  },
  mount(el) {
    const n = $('#nurse-name', el);
    if (n) n.addEventListener('input', () => { WR.state.profile.name = n.value.trim().slice(0, 18); });
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
      App.show('onboard', { step: to });
    },
    obset(d) { WR.state.profile.avatar[d.key] = +d.val; Sound.play('tap'); App.rerender(); },
  },
};
