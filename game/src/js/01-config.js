// ---------- game settings: the numbers you might want to tune ----------
// Every rule, reward, threshold and timing the game uses lives here, so changing one
// is a one-line edit. After editing, rebuild: python3 game/build.py --strict
// Text the player reads (badge descriptions, tutorial, tips) is built from these values,
// so it stays correct when a number changes.
//
// Not here on purpose:
//   - colours, spacing and fonts: src/css/00-tokens.css
//   - room names and blurbs: content/units.json
//   - questions: content/questions/*.json
//   - avatar options, patient names, nurse lines, jokes: the files that draw or say them

const CONFIG = {
  // ----- play modes -----
  // lives: hearts per round (0 = none) · n: patients per round (Infinity = until time / HP runs out)
  // feedback: show the explanation after each answer · lifelines: Ask a colleague + Coffee break
  modes: {
    shift: { lives: 3, n: 10, feedback: true, lifelines: true },
    review: { lives: 0, n: 10, feedback: true, lifelines: false },
    codeblue: { lives: 0, n: Infinity, feedback: false, lifelines: false, time: 60 },
    boss: { lives: 3, n: Infinity, feedback: true, lifelines: true, hp: 1500 },
    exam: { lives: 0, n: 50, feedback: false, lifelines: false },
    daily: { lives: 0, n: 5, feedback: true, lifelines: false },
  },

  lifelines: {
    colleague: 1,            // "Ask a colleague" uses per round
    coffee: 1,               // "Coffee break" uses per round (+1 life each)
    bonusCoffeeEvery: 10,    // an extra coffee break for every N right in a row
  },

  // a wrong answer costs a life only if it is less than this fraction right (select-all / ordering)
  lifeLostBelow: 0.5,

  // ----- points, streaks, XP -----
  scoring: {
    basePoints: { mcq: 100, sata: 150, priority: 150, teaching: 150, order: 150, math: 200 },
    // streak multiplier: the first row whose `streak` you have reached applies
    streakMultipliers: [
      { streak: 10, mult: 3 },
      { streak: 6, mult: 2 },
      { streak: 3, mult: 1.5 },
    ],
    pointsPerXP: 10,         // XP earned = points / this
  },

  // extra XP when a round ends
  bonusXP: {
    shift: 20,
    perfectShift: 50,        // every patient right on a full shift
    daily: 30,               // first finish of the day's challenge
    codeBluePerRight: 2,
    bossWin: 150,
    exam: 40,
  },

  // rank names and the total XP each one starts at
  ranks: [
    { n: 'Orientee', xp: 0 },
    { n: 'Graduate Nurse', xp: 400 },
    { n: 'Staff Nurse', xp: 1500 },
    { n: 'Charge Nurse', xp: 4000 },
    { n: 'Nurse Educator', xp: 7500 },
    { n: 'Nurse Manager', xp: 12000 },
    { n: 'Chief Nurse', xp: 18000 },
  ],

  // ----- mastery: stars, discharge, the Operating Room -----
  mastery: {
    solidDays: 2,            // right on this many different days = mastered (and a missed patient is discharged)
    // a room's stars, by the share of its questions:
    oneStar: 0.6,            // answered right at least once
    twoStars: 0.8,           // answered right at least once
    threeStars: 0.9,         // mastered
  },

  boss: {
    unlockRooms: 4,          // the OR opens after a star in this many rooms...
    unlockShifts: 12,        // ...or after this many finished shifts, whichever comes first
    damagePerRight: 100,     // × the streak multiplier
    healPerWrong: 80,
    // it gets harder (phase 2, then 3) when its HP falls to these fractions of the maximum
    phaseAt: [2 / 3, 1 / 3],
  },

  codeBlue: {
    secondsPerRight: 3,
    secondsPerWrong: 5,
    nextAfterRightMs: 420,   // pause before the next patient
    nextAfterWrongMs: 900,
    skipRecent: 10,          // don't repeat any of the last N questions you saw anywhere
  },

  exam: {
    perRoom: 2,              // every room gets at least this many questions; the rest are weighted toward weak spots
    newQuestionBoost: 1.3,   // extra weight for the new ATI-style questions
    passFraction: 0.8,       // "Exam Ready" badge score...
    passMinQuestions: 40,    // ...on at least this many answered questions
    closeFraction: 0.65,     // report says "Close!" from here up to the pass mark
    nextMs: 280,             // pause before the next question (no feedback in exam mode)
  },

  daily: {
    fromMissed: 2,           // questions picked from your missed list; the rest come from the whole bank
  },

  // ----- random shift events -----
  // chance: share of shifts that get one. Each type lists its point multiplier (bonus), whether a
  // wrong answer is free (safe), and where in the shift it goes.
  events: {
    chance: 0.25,
    rapid: { name: 'Rapid Response', bonus: 2, safe: true, questions: 2, startFrom: 3, startSpread: 5 },
    visitor: { name: 'Visitor', bonus: 1, safe: true, xp: 15, at: 5 },
    outage: { name: 'Power outage', bonus: 1.5, safe: false, questions: 3, startFrom: 2, startSpread: 5 },
  },

  // ----- which patient comes next (spaced review) -----
  // A question's chance of being picked is proportional to its weight.
  picking: {
    unseen: 3,
    unseenNew: 3.6,          // unseen new ATI-style question
    missed: 4.5,             // missed, last seen on an earlier day (due for review)
    missedToday: 1.4,        // missed earlier today (let it rest a little)
    learning: 1.8,           // right before but not yet mastered, not right today
    learningRightToday: 0.6,
    mastered: 0.35,
    recentFactor: 0.12,      // × weight for questions among your last `history.recentQuestions`
    weakRoomBias: 1.2,       // up to (1 + this) × weight for rooms you have answered least
    reviewOtherDay: 3,       // Missed Patients re-rounds: prefer misses from earlier days
    reviewToday: 1,
    rapidDueAfterDays: 3,    // Rapid Response treats an unmastered question as fading after this many days
  },

  // ----- daily study target (the "today" chip) -----
  dailyTarget: {
    noExamDate: 20,          // with no exam date set
    min: 10,                 // otherwise: what's left ÷ days to the exam, kept within min..max
    max: 150,
    choices: [20, 40, 60],   // fixed targets offered in Settings
  },

  // ----- how much history the save keeps -----
  history: {
    recentQuestions: 40,
    activeDays: 90,
    exams: 20,
  },

  // ----- badge thresholds -----
  // The badge ids (streak10, cards25...) are keys in saved progress, so they never change,
  // even if the number here does. Descriptions are written from these values.
  badges: {
    shift3: 3,               // shifts finished
    shiftPerfectMin: 10,     // patients in a shift for "Perfect Shift"
    streak10: 10, streak25: 25,
    codeblue12: 12,          // right answers in one Code Blue round
    sata: 10, priority: 10, teaching: 10, math: 5, order: 5,   // right answers of each type
    discharge25: 25,
    daystreak3: 3, daystreak7: 7,
    daily3: 3, daily7: 7,    // daily challenges on back-to-back days
    cards10: 10, cards25: 25, cards50: 50,
    nightHour: 22,           // "Night Shift": studying at or after this hour (24 h clock)
  },

  // ----- silly patient reactions (22-whimsy.js) -----
  whimsy: {
    legendaryStreak: 15,     // streak for the top tier of reactions
    codeBlueMaxTier: 1,      // keep Code Blue quick
    mildMaxTier: { good: 2, chaos: 1 },
    soundDelayMs: 260,       // after the right/wrong chime
  },

  // ----- the nurse's chatter -----
  talk: {
    streakShoutouts: [3, 6, 10, 15, 20, 25],
    chatterChance: 0.25,     // chance of a new line on each new patient
    trickChance: 0.4,        // chance a right answer repeats the memory trick
  },

  // ----- end-of-round parade -----
  // level by share right: below `conga` = 1 (polite waves), below `hats` = 2 (conga line),
  // below 100% = 3 (hats in the air), 100% on at least `fullMinPatients` = 4 (full parade)
  parade: { conga: 0.5, hats: 0.8, fullMinPatients: 5, maxPatients: 12 },

  // ----- heart monitor (bedside ECG) -----
  // stress is 0..1; it sets the heart rate and colour
  monitor: {
    bpmCalm: 62, bpmMax: 154,
    amberAt: 0.45, redAt: 0.72,
    sweepSeconds: 3.2,       // time for the trace to cross the screen
    maxPixelRatio: 2,        // canvas resolution cap (sharper costs more to draw)
    stress: {
      shift: 0.12, perLifeLost: 0.2,
      codeBlueStart: 0.5, codeBlueRise: 0.45,   // climbs as the clock runs down
      boss: 0.32, bossPerPhase: 0.14, bossPerLifeLost: 0.1,
      exam: 0.3,
      perWrongInARow: 0.12, wrongCap: 0.3,
      perRightInARow: 0.02, rightCap: 0.1,
    },
  },

  // ----- screen layout -----
  layout: {
    wideMinWidth: 1000,      // px; wide screens in landscape put the bedside beside the chart
    regularMinWidth: 700,
    twoColumnMaxChars: 34,   // wide screens show 4 short options in a 2 × 2 grid
  },

  profile: { nameMaxLength: 18 },

  // ----- timings (ms) -----
  // Some must match a CSS animation; the CSS file and rule are named.
  timing: {
    toastMs: 2600,
    rankToastMs: 3200,
    badgeToastDelayMs: 600,
    badgeToastGapMs: 1400,
    floatTextMs: 1300,       // 40-screens.css .float-text (1.2s)
    flashMs: 500,
    eventBannerMs: 2000,
    phaseBannerMs: 1900,     // 30-chart.css .phase-banner
    bossPhaseLineMs: 900,
    bossHurtMs: 700,
    timerDeltaMs: 1000,      // 30-chart.css .timer-delta (1s)
    cardSoundMs: 500,
    bubbleTuckMs: 260,       // the floor speech bubble shrinks into the nurse before she walks
    walkPxPerSecond: 700,    // the nurse's walk to a room
    walkMinSeconds: 0.35,
    walkMaxSeconds: 1.1,
    doorOpenMs: 360,
    confettiSeconds: 3.2,
    saveLocalMs: 1000,       // write progress to this browser this long after the last change (always on leaving the page)
    saveCloudMs: 2500,       // and to the Claude account (claude.ai only)
    cloudLoadTimeoutMs: 10000,
  },
};

// shorthands used across the code
const MODES = CONFIG.modes;
const RANKS = CONFIG.ranks;
