// ---------- hospital floor (home) ----------
// the XP bar fills from where it was last shown, so XP earned on a shift visibly flows in when you get back
let hudXpShown = null, hudXpNum = null;
function hudHTML() {
  const s = WR.state;
  const rp = Engine.rankProgress();
  const days = Engine.daysToExam();
  const goal = Engine.dailyTarget();
  const today = s.days.today === todayStr() ? s.days.answered : 0;
  const cal = icon('calendar');
  let examChip;
  if (days == null) examChip = `<button class="chip exam" data-action="settings">${cal}Set exam date</button>`;
  else if (days > 0) examChip = `<span class="chip exam">${cal}<span class="num">${days}</span> day${days === 1 ? '' : 's'} to exam</span>`;
  else if (days === 0) examChip = `<span class="chip exam">${cal}Exam day. You've got this!</span>`;
  else examChip = `<span class="chip exam">${cal}Exam done</span>`;
  const pct = Math.round(rp.frac * 100);
  // fraction of the current fill to start from: 0 the first time (or after a rank-up), the old level after a shift
  const xpFrom = hudXpShown == null || pct < hudXpShown || !pct ? 0 : (hudXpShown / pct).toFixed(3);
  hudXpShown = pct;
  const toNext = rp.nxt ? `${fmt(rp.toGo)} to ${esc(rp.nxt.n)}` : 'Top rank!';
  return `<header class="hud wrap">
    <button class="hud-me" data-action="locker" aria-label="Open locker room to change your nurse">
      <span class="ava">${nurseSVG(s.profile.avatar, 'happy', { headOnly: true })}</span>
      <span><b>${esc(s.profile.name || 'Nurse')}</b><span>${esc(rp.cur.n)}</span></span>
    </button>
    <div class="hud-xp">
      <div class="label"><span>XP <span class="num" id="hud-xp-num">${fmt(s.xp)}</span></span><span>${toNext}</span></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
        aria-label="Progress to next rank"><i style="width:${pct}%;--from:${xpFrom}"></i></div>
    </div>
    <div class="hud-chips">
      <span class="chip streak" title="Days in a row">${icon('flame')}<span><span
        class="num">${s.days.streak || 0}</span>-day streak</span></span>
      <span class="chip today ${today >= goal ? 'met' : ''}" title="Patients answered today">${icon(today >= goal ? 'check' : 'target')}<span
        class="num">${today}/${goal}</span> today</span>
      ${examChip}
      ${dailyChip()}
    </div>
  </header>`;
}

function dailyChip() {
  const d = WR.state.daily, done = d.last === todayStr();
  const streak = d.last === todayStr() || d.last === yesterdayStr() ? d.streak : 0;
  const label = (done ? 'Daily done' : 'Daily challenge') + (streak ? ` · <span class="num">${streak}</span>d` : '');
  const aria = (done ? 'Daily challenge done today' : "Start today's daily challenge") + (streak ? `, ${streak}-day daily streak` : '');
  return `<button class="chip daily ${done ? 'done' : 'todo'}" data-action="daily" aria-label="${aria}">` +
    `${icon(done ? 'check' : 'sparkle')}<span>${label}</span></button>`;
}

// goal gradient on the room card: how many more patients earn the next star
function nextStarHTML(m) {
  const need = Engine.nextStarNeed(m);
  if (need <= 0) return '';
  const what = m.stars === 2 ? 'mastered' : 'right';
  return `<br><span class="next-star" title="${need} more ${what} for the next star"><span class="num">${need}</span> to ${'★'.repeat(m.stars + 1)}</span>`;
}

// one room door on the floor. `place` adds grid placement (the portrait layout)
function roomHTML(u, place = '', suggested = false) {
  const m = Engine.mastery(u.id);
  const p = patientFor({ id: 'room-' + u.id, stem: '', unit: u.id });
  const mood = m.stars >= 3 ? 'cheer' : m.missed > 0 ? 'worried' : m.seen ? 'happy' : 'neutral';
  const waiting = m.missed ? ` ${m.missed} missed patients waiting.` : '';
  const need = Engine.nextStarNeed(m);
  const toStar = need ? ` ${need} more ${m.stars === 2 ? 'mastered' : 'right'} for the next star.` : '';
  const label = `Room ${u.room}, ${u.ward}, ${u.topic}. ${m.stars} of 3 stars. ${m.solid} of ${m.total} mastered.${toStar}${waiting}` +
    (suggested ? ' Suggested by your nurse.' : '');
  return `<button class="room${suggested ? ' suggest' : ''}"${place} data-action="room" data-unit="${u.id}" aria-label="${esc(label)}">
    <span class="room-body">
      <span class="room-top"><span class="room-plate">${u.room}</span><span class="room-stars">${starRow(m.stars)}</span>${m.missed ? `<span class="room-dot num" title="Missed patients waiting">${m.missed}</span>` : ''}</span>
      <span class="room-ward">${esc(u.ward)}</span>
      <span class="room-topic">${esc(u.topic)}</span>
      <span class="room-blurb">${esc(u.blurb)}</span>
      <span class="room-pt"><span class="pt">${patientHead(p, mood)}</span><span
        class="room-meta"><span class="num">${m.solid}/${m.total}</span> mastered${nextStarHTML(m)}</span></span>
    </span>
    <span class="door"></span>
  </button>`;
}

function dockHTML() {
  const nMissed = Engine.missed().length, nCards = Cards.count();
  const missedCount = nMissed ? `<span class="count num">${nMissed}</span>` : '';
  const cardCount = nCards ? `<span class="count num" style="background:var(--accent);color:var(--accent-ink)">${nCards}</span>` : '';
  return `<nav class="dock wrap" aria-label="Main">
    <button data-action="missed">${icon('bed')}<span class="t">Missed patients</span>${missedCount}</button>
    <button data-action="exam">${icon('clipboard')}<span class="t">Exam simulation</span></button>
    <button data-action="cards">${icon('card')}<span class="t">Get-well cards</span>${cardCount}</button>
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
    const alarm = `<button class="alarm" data-action="codeblue" aria-label="Start a Code Blue timed round">` +
      `<span class="light"></span>Code Blue</button>`;
    const BOSS = CONFIG.boss;
    const lockNote = `★ in ${BOSS.unlockRooms} rooms or ${BOSS.unlockShifts} shifts (${Engine.shiftsDone()}/${BOSS.unlockShifts})`;
    const elev = `<button class="elevator ${bossOpen ? '' : 'locked'}" data-action="boss" ` +
      `aria-label="Operating room: boss fight${bossOpen ? '' : ' (locked)'}"><span class="doors"></span>` +
      `<span>OR: Boss fight<small>${bossOpen ? 'The Superbug awaits' : lockNote}</small></span></button>`;
    // the nurse usually points at a room worth visiting (and it glows); otherwise she shares a tip
    const sug = Engine.suggestRoom();
    const pointAt = sug && (sug.why === 'ready' || Math.random() < CONFIG.talk.suggestChance) ? sug : null;
    let say = Talk.line('floor');
    if (pointAt) {
      const r = pointAt.unit.room, n = pointAt.n;
      say = pointAt.why === 'ready'
        ? `Room ${r} has ${n} missed patient${n === 1 ? '' : 's'} ready to go home. One right answer today each!`
        : `Room ${r} could use a visit: ${n} more right for its next star.`;
    }
    const sugId = pointAt && pointAt.unit.id;
    const bubble = `<div class="bubble pop" id="floor-bubble">${esc(say)}</div>`;
    const walker = `<div class="walker" id="walker">${nurseSVG(WR.state.profile.avatar, 'happy')}</div>`;
    let plan;
    if (App.layout === 'h') {
      plan = `<div class="floorplan h wrap" id="floorplan">
        <div class="rooms rooms-top">${units.slice(0, 6).map((u) => roomHTML(u, '', u.id === sugId)).join('')}</div>
        <div class="corridor">
          <div class="station"><div class="station-desk" aria-hidden="true">NURSES' STATION</div>${bubble}</div>
          ${alarm}${elev}
        </div>
        <div class="rooms rooms-bottom">${units.slice(6).map((u) => roomHTML(u, '', u.id === sugId)).join('')}</div>
        ${walker}
      </div>`;
    } else {
      // two columns of rooms either side of the corridor
      const rows = units.map((u, i) => roomHTML(u, ` style="grid-column:${i % 2 ? 3 : 1};grid-row:${Math.floor(i / 2) + 1}"`, u.id === sugId)).join('');
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
    // XP earned since the floor was last shown rolls in alongside the bar
    if (hudXpNum != null && hudXpNum < WR.state.xp) FX.countUp($('#hud-xp-num', el), hudXpNum, WR.state.xp, 900);
    hudXpNum = WR.state.xp;
    // stars earned since the floor was last shown stamp onto their room cards
    const stars = {};
    Content.units.forEach((u) => { stars[u.id] = Engine.mastery(u.id).stars; });
    if (this.shownStars && !calmChosen()) {
      Content.units.forEach((u) => {
        const was = this.shownStars[u.id] || 0;
        if (stars[u.id] <= was) return;
        const lit = $$(`.room[data-unit="${u.id}"] .room-stars .on`, el);
        lit.slice(was).forEach((s, k) => s.classList.add('stamp'));
      });
    }
    this.shownStars = stars;
    // back from a shift: she comes out of the room she went into and walks back to the station
    const unit = this.lastRoom;
    this.lastRoom = null;
    if (unit && !calmChosen()) this.comeBack(unit);
  },
  // where she stands outside a room's door (walker's top-left, in floor-plan coordinates)
  doorPos(roomEl) {
    const plan = $('#floorplan'), walker = $('#walker');
    const pr = plan.getBoundingClientRect(), rr = roomEl.getBoundingClientRect(), cor = $('.corridor', plan).getBoundingClientRect();
    if (App.layout === 'h') {
      return { x: rr.left - pr.left + rr.width / 2 - walker.offsetWidth / 2, y: cor.top - pr.top + cor.height / 2 - walker.offsetHeight / 2 };
    }
    return { x: cor.left - pr.left + cor.width / 2 - walker.offsetWidth / 2, y: rr.top - pr.top + rr.height / 2 - walker.offsetHeight / 2 };
  },
  // which way "into the room" is from the corridor, for stepping in and out of the door
  doorDir(roomEl) {
    const d = 34;
    if (App.layout === 'h') return { dx: 0, dy: roomEl.closest('.rooms-top') ? -d : d };
    return { dx: Array.from(roomEl.parentNode.children).indexOf(roomEl) % 2 ? d : -d, dy: 0 };
  },
  // Continuity for the trip back: the door opens, she steps out, it closes behind her, she walks to the station,
  // and only then do her speech bubble and the corridor buttons pop back in (one after another, not all at once).
  // A tap on a room while this plays takes over cleanly (walkId).
  comeBack(unit) {
    const plan = $('#floorplan'), walker = $('#walker'), room = plan && $(`.room[data-unit="${unit}"]`, plan);
    const svg = walker && $('svg', walker);
    if (!room || !svg || !svg.animate) return;
    const id = ++this.walkId;
    const T = CONFIG.timing;
    const bubble = $('#floor-bubble');
    const btns = $$('.corridor .alarm, .corridor .elevator', plan);
    if (bubble) { bubble.classList.remove('pop'); bubble.style.visibility = 'hidden'; }
    btns.forEach((b) => { b.style.opacity = '0'; b.style.pointerEvents = 'none'; }); // hidden buttons can't be tapped
    const start = this.doorPos(room), home = this.home(), dir = this.doorDir(room);
    walker.style.transition = 'none';
    walker.style.transform = `translate(${start.x}px, ${start.y}px)`;
    void walker.offsetWidth;
    walker.style.transition = '';
    room.classList.add('open');
    svg.style.transformOrigin = '50% 100%';
    svg.animate([{ transform: `translate(${dir.dx}px, ${dir.dy}px) scale(.85)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: T.stepInMs, easing: 'cubic-bezier(.2, .8, .2, 1)', delay: 120, fill: 'backwards' });
    setTimeout(() => {
      if (id !== this.walkId) return;
      room.classList.remove('open');
      const dist = Math.hypot(home.x - start.x, home.y - start.y);
      const dur = clamp(dist / T.walkPxPerSecond, T.walkMinSeconds, T.walkMaxSeconds);
      walker.style.setProperty('--step', clamp(T.walkStridePx / Math.max(1, dist / dur), 0.1, 0.22).toFixed(3) + 's');
      walker.style.transitionDuration = dur + 's';
      walker.classList.add('walking');
      walker.style.transform = `translate(${home.x}px, ${home.y}px)`;
      setTimeout(() => {
        if (id !== this.walkId) return;
        walker.classList.remove('walking');
        svg.animate([{ transform: 'scaleY(.95) translateY(2px)' }, { transform: 'none' }],
          { duration: 180, easing: 'cubic-bezier(.2, .9, .3, 1.4)' });
        if (bubble) { bubble.style.visibility = ''; bubble.classList.add('pop'); }
        btns.forEach((b, i) => {
          b.style.opacity = ''; b.style.pointerEvents = '';
          b.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }],
            { duration: 280, delay: 120 + i * 70, easing: 'cubic-bezier(.2, .9, .3, 1.25)', fill: 'backwards' });
        });
      }, dur * 1000 + 30);
    }, 120 + T.stepInMs + 60);
  },
  walkId: 0,
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
  // The walk to a room (and the bubble/button tuck and door swing around it) stops only on the game's own Calm
  // setting, like the heart monitor: on Auto it plays even when the device asks for reduced motion, since a
  // nurse who jumps to the door reads as a glitch.
  // The speech bubble shrinks into the nurse (towards her head) before she sets off, so she never walks over it.
  tuckBubble() {
    return new Promise((resolve) => {
      const bubble = $('#floor-bubble'), walker = $('#walker');
      if (!bubble) { resolve(); return; }
      const done = () => { bubble.style.visibility = 'hidden'; resolve(); };
      if (!walker || calmChosen() || !bubble.animate) { done(); return; }
      const br = bubble.getBoundingClientRect(), wr = walker.getBoundingClientRect();
      const ox = wr.left + wr.width / 2 - br.left, oy = wr.top + wr.height * 0.3 - br.top;
      bubble.classList.remove('pop');
      bubble.style.transformOrigin = `${ox}px ${oy}px`;
      bubble.animate(
        [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.05)', opacity: 0 }],
        { duration: CONFIG.timing.bubbleTuckMs, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' },
      ).finished.then(done, done);
    });
  },
  // Walk to a room's door. Character-animation rules (ANIMATION_NOTES.md): a little crouch before she sets off
  // (anticipation), a step rate that matches her speed so her feet don't slide, the door starting to open just
  // before she gets there (overlapping action), and a small settle when she stops.
  walkTo(roomEl) {
    return new Promise((resolve) => {
      const plan = $('#floorplan'), walker = $('#walker');
      if (!plan || !walker || calmChosen()) { resolve(); return; }
      this.walkId++; // cancels a walk back from a room that is still playing
      const { x, y } = this.doorPos(roomEl);
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(walker.style.transform) || [0, 0, 0];
      const dist = Math.hypot(x - m[1], y - m[2]);
      const T = CONFIG.timing;
      const dur = clamp(dist / T.walkPxPerSecond, T.walkMinSeconds, T.walkMaxSeconds);
      // one step per stride length travelled, kept between a brisk patter and a stroll
      walker.style.setProperty('--step', clamp(T.walkStridePx / Math.max(1, dist / dur), 0.1, 0.22).toFixed(3) + 's');
      walker.style.transitionDuration = dur + 's';
      // the Code Blue and OR buttons shrink away as she sets off, so she is never hidden behind them
      $$('.corridor .alarm, .corridor .elevator', plan).forEach((b) => {
        b.style.opacity = '';
        b.style.pointerEvents = 'none';
        b.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.05)', opacity: 0 }],
          { duration: T.buttonTuckMs, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' });
      });
      const svg = $('svg', walker);
      const canAnimate = !!(svg && svg.animate);
      if (canAnimate) svg.style.transformOrigin = '50% 100%';
      const go = () => {
        walker.classList.add('walking');
        walker.style.transform = `translate(${x}px, ${y}px)`;
        setTimeout(() => roomEl.classList.add('open'), Math.max(0, dur * 1000 - T.doorLeadMs));
        setTimeout(() => {
          walker.classList.remove('walking');
          if (canAnimate) {
            svg.animate([{ transform: 'scaleY(.95) translateY(2px)' }, { transform: 'none' }],
              { duration: 180, easing: 'cubic-bezier(.2, .9, .3, 1.4)' });
          }
          resolve();
        }, dur * 1000 + 30);
      };
      if (canAnimate) {
        svg.animate([{ transform: 'none' }, { transform: 'scaleY(.93) translateY(3px)' }, { transform: 'none' }],
          { duration: T.walkCrouchMs, easing: 'ease-in-out' });
        setTimeout(go, T.walkCrouchMs * 0.6);
      } else go();
    });
  },
  // She steps through the open door: a short move towards the room and a fade, so she goes somewhere instead of
  // vanishing when the screen changes.
  stepIn(roomEl) {
    const walker = $('#walker'), svg = walker && $('svg', walker);
    if (!svg || !svg.animate || calmChosen()) return Promise.resolve();
    const { dx, dy } = this.doorDir(roomEl);
    return svg.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.85)`, opacity: 0 }],
      { duration: CONFIG.timing.stepInMs, easing: 'cubic-bezier(.4, 0, .9, .4)', fill: 'forwards' }).finished.catch(() => {});
  },
  act: {
    async room(d, el) {
      if (Screens.floor.busy) return;
      Screens.floor.busy = true;
      Sound.play('tap');
      await Screens.floor.tuckBubble();
      await Screens.floor.walkTo(el);
      el.classList.add('open');
      Sound.play('door');
      if (!calmChosen()) {
        await sleep(CONFIG.timing.doorSettleMs);
        await Screens.floor.stepIn(el);
      }
      Screens.floor.busy = false;
      const r = el.getBoundingClientRect();
      App.zoomFrom = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; // the room grows into the bedside screen
      startShift(d.unit);
      Screens.floor.lastRoom = d.unit;
    },
    codeblue() { startMode('codeblue'); },
    daily() {
      const done = WR.state.daily.last === todayStr();
      const n = MODES.daily.n, fromMissed = CONFIG.daily.fromMissed, B = CONFIG.badges;
      const about = `${n} patients, the same set all day: ${fromMissed} from your missed or weak list `
        + `and ${n - fromMissed} from anywhere in the bank. Finish it on back-to-back days to build a daily streak `
        + `and unlock a party hat (${B.daily3} days) and rubber-duck scrubs (${B.daily7} days).`;
      const replayNote = done
        ? '<p class="dim">' +
          '<b>You already finished today\'s.</b> A replay is fine for practice but does not add to the streak.</p>'
        : '';
      App.modal(`<h2>Daily challenge</h2><p class="dim">${about}</p>${replayNote}
        <div class="actions"><button class="btn" data-m="no">Not now</button><button class="btn primary"
          data-m="go">${done ? 'Replay' : 'Start'}</button></div>`,
      (m) => { if (m === 'go') startDaily(); return false; });
    },
    boss() {
      if (!Engine.bossUnlocked() && !WR.debug) {
        const BOSS = CONFIG.boss;
        const why = `The Superbug only fights experienced nurses. Earn a star in ${BOSS.unlockRooms} rooms, `
          + `or finish ${BOSS.unlockShifts} shifts (you've finished ${Engine.shiftsDone()}). `
          + `A star means you've answered ${Math.round(CONFIG.mastery.oneStar * 100)}% of a room's patients right ` +
            `at least once.`;
        App.modal(`<h2>The OR is locked</h2><p class="dim">${why}</p>`
          + '<div class="actions"><button class="btn primary" data-m="ok">Back to rounds</button></div>');
        return;
      }
      startMode('boss');
    },
    exam() {
      const about = `${MODES.exam.n} mixed questions from every room, like the real final. `
        + 'No lifelines and no explanations until the end, then a full score report by unit.';
      App.modal(`<h2>Exam simulation</h2><p class="dim">${about}</p>
        <div class="actions"><button class="btn" data-m="no">Not now</button><button class="btn primary"
          data-m="go">Start exam</button></div>`,
      (m) => { if (m === 'go') startMode('exam'); return false; });
    },
  },
};

function startShift(unit) {
  App.run = new Run('shift', { unit, queue: Engine.pickShift(unit) });
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
function startDaily() {
  App.run = new Run('daily', { queue: Engine.pickDaily() });
  App.run.next();
  Store.save();
  App.show('chart', {}, 'zoom-in');
}
function startMode(mode) {
  const queue = mode === 'exam' ? Engine.pickExam() : [];
  App.run = new Run(mode, { queue });
  App.run.next();
  if (mode === 'codeblue') Sound.play('alarm');
  App.show('chart', {}, 'zoom-in');
}
