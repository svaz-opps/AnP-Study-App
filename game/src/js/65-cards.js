// ---------- thank-you cards ----------
// A patient discharged from Missed Patients (right on CONFIG.mastery.solidDays different days after a miss) leaves a
// thank-you card: their face, a pun, the fact behind their question, and the room. Cards are
// collected in an album, so the hardest-won facts become the ones you keep looking at.
// three puns per room, plus some that fit any room
const CARD_JOKES = {
  ch1: [
    'Thanks for keeping me in homeostasis. My set point is "grateful."',
    'You found my anatomical position: lying in bed, palms up, very happy.',
    'My negative feedback about you? There isn\'t any.',
  ],
  ch2: [
    'You have great chemistry with patients. Ionic, even.',
    'I was acidic before you came. Now I\'m a steady pH 7.4.',
    'Thanks for the bond. Covalent, I hope. We shared so much.',
  ],
  ch3: [
    'You really got me out of a hypertonic situation.',
    'My mitochondria are powered by gratitude now.',
    'Thanks for the active transport home. No gradient required.',
  ],
  ch4: [
    'You broke my worries down like glycolysis.',
    'Thanks! I\'m feeling about 32 ATP better.',
    'Catabolize the bad days, anabolize the good ones. Thanks, nurse!',
  ],
  ch5: [
    'You\'ve got connective-tissue energy. You hold everything together.',
    'My epithelium is stratified with joy.',
    'Thanks for not being squamish about my case.',
  ],
  ch6: [
    'You got under my skin, in the best way. Dermis-deep gratitude.',
    'Thanks for the TLC: Total Layer Care, all five epidermal layers.',
    'Warmest regards, regulated by my sweat glands.',
  ],
  ch7: [
    'Thanks for having my back. And my femur.',
    'I found you very humerus.',
    'You were osteo-fantastic. No bones about it.',
  ],
  ch8: [
    'We really clicked. Like a joint, but healthy.',
    'Thanks for the support. I\'d hug you, but... range of motion.',
    'You\'re the hinge my whole recovery turned on.',
  ],
  ch9: [
    'Thanks for the pull! Actin and myosin approve.',
    'My gratitude is in sustained tetany.',
    'Thanks for flexing those nursing skills.',
  ],
  ch10: [
    'You gave me an action potential of happiness: all or nothing, and it\'s ALL.',
    'Thanks for crossing the synapse to help me.',
    'My neurons are firing "thank you" at max frequency.',
  ],
  ch11: [
    'You were on my mind. Specifically, the frontal lobe.',
    'Thanks for using your cerebrum. My cerebellum is dancing.',
    'Choosing you as my nurse? A no-brainer.',
  ],
  ch12: [
    'I see you, I hear you, I appreciate you. That\'s three senses.',
    'Thanks for the rods and cones of support.',
    'You were ear-resistible. Cochlea-ly the best.',
  ],
};
const CARD_JOKES_ANY = [
  'Discharged and delighted. Thank you, nurse!',
  'Thanks for remembering me after I stumped you!',
  'You came back for me. That\'s what good nurses do.',
  'From missed to mastered. We did it!',
  'The jello was okay. You were great.',
  'Thanks for reading the "why." I could tell.',
  'I\'ll tell everyone at bingo about you.',
  'Second time\'s the charm. Thanks for the re-round!',
  'You turned my chart around!',
  'Out of bed and out the door. Thank you!',
  'Your memory trick saved the day.',
  'Two right days, one hero. Thanks!',
];

const Cards = {
  joke(q) {
    const pool = (CARD_JOKES[q.unit] || []).concat(CARD_JOKES_ANY);
    return pool[hashStr('card:' + q.id) % pool.length];
  },
  fact(q) {
    if (q.trick) return q.trick;
    const m = /^.*?[.!?](\s|$)/.exec(q.why || '');
    return (m ? m[0] : q.why || '').trim();
  },
  patient(q) { return patientFor(q, 'card'); },
  count() { return Object.keys(WR.state.cards || {}).filter((id) => Content.byId[id]).length; },
  give(q) {
    const s = WR.state;
    if (s.cards[q.id]) return false;
    s.cards[q.id] = { d: todayStr() };
    return true;
  },
  // the card itself; reveal = the flip-in version shown in the explanation panel
  html(q, opts = {}) {
    const p = this.patient(q), u = Content.unitById[q.unit];
    return `<div class="tycard ${opts.reveal ? 'reveal' : ''}" style="--card-tint:${p.gown}">
      <div class="tyc-face">${patientHead(p, 'cheer')}</div>
      <div class="tyc-body"><span class="label">Thank-you card · Room ${u.room} ${esc(u.ward)}</span>
        <p class="tyc-joke">“${esc(this.joke(q))}”<span class="tyc-sign">${esc(p.name)}</span></p>
        <p class="tyc-fact">${icon('bulb')}<span>${esc(this.fact(q))}</span></p></div>
    </div>`;
  },
};

// ----- the album
Screens.cards = {
  cls: 'cards-screen',
  render() {
    const s = WR.state;
    const n = Cards.count();
    const missed = Engine.missed();
    const rooms = Content.units.map((u) => {
      const got = Object.keys(s.cards).filter((id) => Content.byId[id] && Content.byId[id].unit === u.id)
        .sort((a, b) => (s.cards[a].d < s.cards[b].d ? 1 : -1));
      const waiting = missed.filter((q) => q.unit === u.id).length;
      if (!got.length && !waiting) return '';
      const tiles = got.map((id) => {
        const q = Content.byId[id], p = Cards.patient(q);
        return `<button class="card-tile" data-action="openCard" data-q="${esc(id)}" aria-label="Card from ${esc(p.name)}" ` +
          `style="--card-tint:${p.gown}">${patientHead(p, 'cheer')}<span>${esc(p.name)}</span></button>`;
      }).join('');
      // locked tiles for patients still waiting in Missed Patients (up to 6)
      const ghosts = Array.from({ length: Math.min(waiting, 6) }, () => `<span class="card-tile ghost" aria-hidden="true">${icon('lock')}</span>`).join('');
      const waitChip = waiting ? `<span class="chip faint">${waiting} still in Missed Patients</span>` : '';
      return `<div class="card album-room"><div class="mr-head"><span class="room-plate">${u.room}</span><b>${esc(u.ward)} · ${esc(u.topic)}</b>
        <span class="chip">${got.length} card${got.length === 1 ? '' : 's'}</span>${waitChip}</div>
        <div class="card-grid">${tiles}${ghosts}</div></div>`;
    }).join('');
    const empty = `<div class="card empty">${patientHead(patientFor({ id: 'card-empty', stem: '' }), 'cheer')}<h2>No cards yet</h2>
      <p class="dim">Miss a question and the patient goes to Missed Patients. Get it right on ${CONFIG.mastery.solidDays} different days
        to discharge them, and they leave you a thank-you card with the fact you learned.</p></div>`;
    const more = rooms && missed.length
      ? `<button class="btn primary" data-action="missed">${icon('bed')}Re-round missed patients to earn more</button>`
      : '';
    return `${topbar('Get-well cards', `${n} collected · from patients you discharged`)}
      <div class="narrow stack">${rooms || empty}${more}</div>`;
  },
  act: {
    openCard(d) {
      const q = Content.byId[d.q];
      if (!q) return;
      Sound.play('pop');
      App.modal(`${Cards.html(q, { reveal: true })}<p class="dim tyc-stem"><span class="label">Their question</span>${esc(q.stem)}</p>
        <div class="actions"><button class="btn primary" data-m="ok">Close</button></div>`);
    },
  },
};
