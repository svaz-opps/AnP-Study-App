// ---------- hospital floor (home) ----------
function hudHTML() {
  const s = WR.state;
  const rp = Engine.rankProgress();
  const days = Engine.daysToExam();
  const goal = Engine.dailyTarget();
  const today = s.days.today === todayStr() ? s.days.answered : 0;
  const examChip = days == null
    ? `<button class="chip exam" data-action="settings">${icon('calendar')}Set exam date</button>`
    : days > 0 ? `<span class="chip exam">${icon('calendar')}<span class="num">${days}</span> day${days === 1 ? '' : 's'} to exam</span>`
      : days === 0 ? `<span class="chip exam">${icon('calendar')}Exam day. You've got this!</span>` : `<span class="chip exam">${icon('calendar')}Exam done</span>`;
  return `<header class="hud wrap">
    <button class="hud-me" data-action="locker" aria-label="Open locker room to change your nurse">
      <span class="ava">${nurseSVG(s.profile.avatar, 'happy', { headOnly: true })}</span>
      <span><b>${esc(s.profile.name || 'Nurse')}</b><span>${esc(rp.cur.n)}</span></span>
    </button>
    <div class="hud-xp">
      <div class="label"><span>XP <span class="num">${fmt(s.xp)}</span></span><span>${rp.nxt ? `${fmt(rp.toGo)} to ${esc(rp.nxt.n)}` : 'Top rank!'}</span></div>
      <div class="bar" role="progressbar" aria-valuenow="${Math.round(rp.frac * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress to next rank"><i style="width:${Math.round(rp.frac * 100)}%"></i></div>
    </div>
    <div class="hud-chips">
      <span class="chip streak" title="Days in a row">${icon('flame')}<span><span class="num">${s.days.streak || 0}</span>-day streak</span></span>
      <span class="chip" title="Patients answered today">${icon('target')}<span class="num">${today}/${goal}</span> today</span>
      ${examChip}
    </div>
  </header>`;
}

function roomHTML(u) {
  const m = Engine.mastery(u.id);
  const p = patientFor({ id: 'room-' + u.id, stem: '' });
  const mood = m.stars >= 3 ? 'cheer' : m.missed > 0 ? 'worried' : m.seen ? 'happy' : 'neutral';
  const label = `Room ${u.room}, ${u.ward}, ${u.topic}. ${m.stars} of 3 stars. ${m.solid} of ${m.total} mastered.${m.missed ? ` ${m.missed} missed patients waiting.` : ''}`;
  return `<button class="room" data-action="room" data-unit="${u.id}" aria-label="${esc(label)}">
    <span class="room-body">
      <span class="room-top"><span class="room-plate">${u.room}</span><span class="room-stars">${starRow(m.stars)}</span>${m.missed ? `<span class="room-dot num" title="Missed patients waiting">${m.missed}</span>` : ''}</span>
      <span class="room-ward">${esc(u.ward)}</span>
      <span class="room-topic">${esc(u.topic)}</span>
      <span class="room-blurb">${esc(u.blurb)}</span>
      <span class="room-pt"><span class="pt">${patientHead(p, mood)}</span><span class="room-meta"><span class="num">${m.solid}/${m.total}</span><br>mastered</span></span>
    </span>
    <span class="door"></span>
  </button>`;
}

function dockHTML() {
  const nMissed = Engine.missed().length;
  return `<nav class="dock wrap" aria-label="Main">
    <button data-action="missed">${icon('bed')}<span class="t">Missed patients</span>${nMissed ? `<span class="count num">${nMissed}</span>` : ''}</button>
    <button data-action="exam">${icon('clipboard')}<span class="t">Exam simulation</span></button>
    <button data-action="locker">${icon('shirt')}<span class="t">Locker room</span></button>
    <button data-action="stats">${icon('chart')}<span class="t">Report card</span></button>
    <button data-action="settings" aria-label="Settings">${icon('gear')}<span class="t">Settings</span></button>
  </nav>`;
}

Screens.floor = {
  cls: 'floor',
  render() {
    const units = Content.units;
    const bossOpen = Engine.bossUnlocked();
    const alarm = `<button class="alarm" data-action="codeblue" aria-label="Start a Code Blue timed round"><span class="light"></span>Code Blue</button>`;
    const elev = `<button class="elevator ${bossOpen ? '' : 'locked'}" data-action="boss" aria-label="Operating room: boss fight${bossOpen ? '' : ' (locked)'}"><span class="doors"></span><span>OR: Boss fight<small>${bossOpen ? 'The Superbug awaits' : `★ in ${Engine.BOSS_ROOMS} rooms or ${Engine.BOSS_SHIFTS} shifts (${Engine.shiftsDone()}/${Engine.BOSS_SHIFTS})`}</small></span></button>`;
    const bubble = `<div class="bubble pop" id="floor-bubble">${esc(Talk.line('floor'))}</div>`;
    const walker = `<div class="walker" id="walker">${nurseSVG(WR.state.profile.avatar, 'happy')}</div>`;
    let plan;
    if (App.layout === 'h') {
      plan = `<div class="floorplan h wrap" id="floorplan">
        <div class="rooms rooms-top">${units.slice(0, 6).map(roomHTML).join('')}</div>
        <div class="corridor">
          <div class="station"><div class="station-desk" aria-hidden="true">NURSES' STATION</div>${bubble}</div>
          ${alarm}${elev}
        </div>
        <div class="rooms rooms-bottom">${units.slice(6).map(roomHTML).join('')}</div>
        ${walker}
      </div>`;
    } else {
      const rows = units.map((u, i) => roomHTML(u).replace('class="room"', `class="room" style="grid-column:${i % 2 ? 3 : 1};grid-row:${Math.floor(i / 2) + 1}"`)).join('');
      plan = `<div class="station-card show"><div class="station-desk" aria-hidden="true">STATION</div>${bubble}</div>
      <div class="floorplan v wrap" id="floorplan">
        <div class="rooms">${rows}</div>
        <div class="corridor"></div>
        <div class="floor-end">${alarm}${elev}</div>
        ${walker}
      </div>`;
    }
    return hudHTML() + plan + dockHTML();
  },
  mount(el) {
    this.placeWalker(false);
  },
  home() {
    const plan = $('#floorplan'), walker = $('#walker');
    if (!plan || !walker) return { x: 0, y: 0 };
    const cor = $('.corridor', plan).getBoundingClientRect(), pr = plan.getBoundingClientRect();
    if (App.layout === 'h') {
      const desk = $('.station-desk', plan).getBoundingClientRect();
      return { x: desk.right - pr.left + 6, y: cor.top - pr.top + cor.height / 2 - walker.offsetHeight / 2 };
    }
    return { x: cor.left - pr.left + cor.width / 2 - walker.offsetWidth / 2, y: cor.top - pr.top + 6 };
  },
  placeWalker(animate) {
    const walker = $('#walker');
    if (!walker) return;
    const p = this.home();
    if (!animate) walker.style.transition = 'none';
    walker.style.transform = `translate(${p.x}px, ${p.y}px)`;
    if (!animate) { void walker.offsetWidth; walker.style.transition = ''; }
  },
  walkTo(roomEl) {
    return new Promise((resolve) => {
      const plan = $('#floorplan'), walker = $('#walker');
      if (!plan || !walker || reducedMotion()) { resolve(); return; }
      const pr = plan.getBoundingClientRect(), rr = roomEl.getBoundingClientRect(), cor = $('.corridor', plan).getBoundingClientRect();
      let x, y;
      if (App.layout === 'h') {
        x = rr.left - pr.left + rr.width / 2 - walker.offsetWidth / 2;
        y = cor.top - pr.top + cor.height / 2 - walker.offsetHeight / 2;
      } else {
        x = cor.left - pr.left + cor.width / 2 - walker.offsetWidth / 2;
        y = rr.top - pr.top + rr.height / 2 - walker.offsetHeight / 2;
      }
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(walker.style.transform) || [0, 0, 0];
      const dist = Math.hypot(x - m[1], y - m[2]);
      const dur = clamp(dist / 700, 0.35, 1.1);
      walker.style.transitionDuration = dur + 's';
      walker.classList.add('walking');
      walker.style.transform = `translate(${x}px, ${y}px)`;
      setTimeout(() => { walker.classList.remove('walking'); resolve(); }, dur * 1000 + 30);
    });
  },
  act: {
    async room(d, el) {
      if (Screens.floor.busy) return;
      Screens.floor.busy = true;
      Sound.play('tap');
      await Screens.floor.walkTo(el);
      el.classList.add('open');
      Sound.play('door');
      await sleep(reducedMotion() ? 0 : 360);
      Screens.floor.busy = false;
      startShift(d.unit);
    },
    codeblue() { startMode('codeblue'); },
    boss() {
      if (!Engine.bossUnlocked() && !WR.debug) {
        App.modal(`<h2>The OR is locked</h2><p class="dim">The Superbug only fights experienced nurses. Earn a star in ${Engine.BOSS_ROOMS} rooms, or finish ${Engine.BOSS_SHIFTS} shifts (you've finished ${Engine.shiftsDone()}). A star means you've answered 60% of a room's patients right at least once.</p><div class="actions"><button class="btn primary" data-m="ok">Back to rounds</button></div>`);
        return;
      }
      startMode('boss');
    },
    exam() {
      App.modal(`<h2>Exam simulation</h2><p class="dim">50 mixed questions from every room, like the real final. No lifelines and no explanations until the end, then a full score report by unit.</p>
        <div class="actions"><button class="btn" data-m="no">Not now</button><button class="btn primary" data-m="go">Start exam</button></div>`,
      (m) => { if (m === 'go') startMode('exam'); return false; });
    },
  },
};

function startShift(unit) {
  App.run = new Run('shift', { unit, queue: Engine.pickShift(unit, 10) });
  App.run.next();
  App.show('chart', {}, 'zoom-in');
}
function startReview(qids, label) {
  if (!qids.length) { App.toast('No missed patients here. Nice work!'); return; }
  App.run = new Run('review', { queue: qids });
  App.run.label = label || 'Missed patients';
  App.run.next();
  App.show('chart', {}, 'zoom-in');
}
function startMode(mode) {
  const queue = mode === 'exam' ? Engine.pickExam(50) : [];
  App.run = new Run(mode, { queue });
  App.run.next();
  if (mode === 'codeblue') Sound.play('alarm');
  App.show('chart', {}, 'zoom-in');
}
