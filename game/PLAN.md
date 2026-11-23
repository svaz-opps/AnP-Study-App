# Plan of attack: "Ward Rounds", a hospital study game (one HTML file, iPad-first)

## Context

Your prompt describes a nursing study game: ATI-style questions, a hospital floor, a nurse avatar, a boss fight, and so on. This repo (`AnP-Study-App`) already holds the full **BIOL 2401 A&P I final study guide**, parsed into `study-guide/data/source-content.json`:

- 12 chapters and 112 sections
- **239 instructor "Focus" points**. Chapters 7–9 (bones, joints, muscles) have 40/30/29 of them, written as specific exam facts.
- 232 existing MCQs (120 practice exam + 112 "check yourself"), each with an explanation
- 466 glossary terms
- mnemonics, study tips and clinical connections

**Decisions you confirmed:**
- Build it from this A&P guide, with questions written ATI-style. The engine stays content-agnostic, so a nursing pack can be swapped in later.
- All 12 chapters get a room, and Ch 7–9 get about twice the questions.
- The bank is 200 new items plus the guide's 232 questions.
- **The main device is an iPad**, in Safari, in both landscape and portrait. It still has to work in Split View and on a phone.

The goal is a single self-contained web page, published as a private claude.ai link you open on your iPad. It needs to work as a **real game** (a satisfying loop, stakes, rewards, polish) and as a **real study tool** (accurate content, explanations, spaced review of misses, mastery tracking, exam readiness). Both have to hold, not one at the expense of the other.

---

## 1. Units (hospital rooms) and question counts

Rooms map 1:1 to chapters. Counts are weighted by how many instructor focus points each chapter has. Rule: **every focus point is covered by at least one question** (the build script enforces this).

| Room | Unit (chapter) | Ward theme | New ATI-style Qs | Guide Qs re-used as "chart reviews" |
|---|---|---|---|---|
| 101 | Ch1 Foundations | Admissions / Triage | 14 | 18 |
| 102 | Ch2 Chemistry | Clinical Lab | 14 | 19 |
| 103 | Ch3 Cells | IV & Infusion (tonicity) | 14 | 18 |
| 104 | Ch4 Metabolism | Metabolic Clinic | 12 | 17 |
| 105 | Ch5 Tissues | Pathology | 12 | 17 |
| 106 | Ch6 Skin | Burn Unit | 14 | 17 |
| 107 | Ch7 Bones | Ortho | 30 | 26 |
| 108 | Ch8 Joints | Sports Med | 24 | 21 |
| 109 | Ch9 Muscles | Rehab / PT | 24 | 25 |
| 110 | Ch10 Neural signaling | Neuro Step-Down | 12 | 16 |
| 111 | Ch11 Neuroanatomy | Neuro ICU | 16 | 19 |
| 112 | Ch12 Senses | Eye & Ear Clinic | 14 | 19 |
| OR | Boss: "The Superbug" | Operating Room | draws from all rooms | — |
| **Total** | | | **200** | **232** → **432 patients** |

**Mix of new questions:** about 55% single-answer MCQ, 20% SATA (5–6 options), 10% "which client do I see first", 10% "needs further teaching", plus **ordered-response** items (tap the steps in order: muscle contraction, fracture repair, action potential, the path of sound and of light) and **about 8 med-math** items. Med-math stays tied to A&P where possible: rule of nines TBSA, pH being 10× per unit, tonicity and concentration, mg/kg dosing.

---

## 2. Study-app pillars (what makes it actually teach)

1. **Accurate, traceable content**
   - Every question cites its source section ID (for example `ch9-structure`) and the focus point(s) it covers.
   - The "why" panel shows a **"Read the guide"** excerpt (that section's focus points) right inside the app.
   - Provenance is honest: tips are labeled **"From your guide"** (the guide's mnemonics, study tips, clinical connections) or **"Added tip"** (mine).
2. **Explanations, not just answers.** Each item has:
   - a short, simple "why"
   - a **"why the others are wrong"** line for each wrong option
   - a memory trick
   - an **ATI test-taking tip**, for example "SATA: judge each option alone as true or false" or "Priority: airway → breathing → circulation, unstable before stable"

   The build script automatically attaches a section's mnemonic or tip to every question that cites that section.
3. **Retrieval practice plus spaced review ("Missed Patients")**
   - A wrong answer sends the patient to a Leitner box. They come back in later shifts and are "discharged" after **two correct answers in a row on different days**.
   - The badge on the nav shows how many are waiting.
4. **Adaptive selection.** Each shift's 10 patients come mostly from unseen questions, then missed ones, then weak focus points, with a little review of mastered ones (interleaving). Replays give you new patients.
5. **Mastery you can trust.** Stars come from **mastery across the unit's whole bank**, not one lucky run:
   - ★ = 60% of items answered correctly at least once
   - ★★ = 80%
   - ★★★ = 90% of items in box 2 or higher
6. **Exam readiness**
   - exam-date countdown (set in the app)
   - a daily target, calculated as unmastered items ÷ days left
   - a day-streak counter
   - an **Exam Simulation** mode: 50 mixed questions, no lifelines, no feedback until the end, then a score report by unit
7. **Report card**
   - accuracy per unit
   - your weakest 5 focus points, each with a "Practice these" button
   - accuracy by question type (for example "SATA 58%"), which tells you which test-taking skill needs work
   - accuracy on **new vs. guide questions**, shown separately. You may have memorized guide answers, so new-item accuracy is the honest readiness signal.

---

## 3. Game pillars (what makes it fun to keep playing)

| Pillar | Design |
|---|---|
| **Core loop** | Floor → tap room → nurse walks in → patient chart (question) → answer → instant feedback + animation → next patient (10 per shift) → shift report → back to floor |
| **Meta loop** | XP → **ranks**, badges → **locker unlocks** (avatar items), stars per room, daily streak, boss unlock |
| **Stakes** | 3 lives per shift. A wrong answer, or SATA under 50%, costs a life. Running out ends the shift but **keeps the XP and the review data**, so the stakes are tension, not punishment. |
| **Score** | MCQ 100, SATA/priority/order 150, math 200. Streak multiplier ×1 → ×1.5 (3 in a row) → ×2 (6) → ×3 (10+). SATA uses ATI-style +/− partial credit; only a perfect answer extends the streak. |
| **Ranks** | Orientee → Graduate Nurse → Staff Nurse → Charge Nurse → Nurse Educator → Nurse Manager → **Chief Nurse**. Thresholds to be tuned so that playing through every room once ≈ Charge Nurse, and mastery plus the boss ≈ Chief Nurse. |
| **Lifelines** (1 each per shift) | **Ask a Colleague**: 50/50 (removes half the wrong options; on an order question, places the first step). **Coffee Break**: +1 life, disabled at full lives. A streak of 10 earns an extra coffee. |
| **Code Blue mode** | Red alarm lighting, a 60-second clock (+3 s for a right answer, −5 s for a wrong one), quick MCQs only, ECG racing, personal-best board |
| **Boss: "The Superbug"** (original character) | HP bar. A right answer means the nurse "attacks" and the boss takes damage scaled by your streak; a wrong answer heals it. It mutates at 66% and 33% HP: harder SATA and priority items, faster music and ECG. Questions are weighted toward your weak topics. Unlocks when half the rooms have ★. |
| **Badges (~20)** | First Shift, Perfect Shift, Streak 10/25, Code Blue Survivor, Boss Slayer, No-Lifeline Boss, SATA Specialist, Priority Pro, Teaching Star, Math Whiz, Comeback Kid (win on 1 life), 3- and 7-day streaks, Discharged 25, All Rooms ★ and ★★★, Chief Nurse |
| **Juice** | Shake on a wrong answer, floating "+150 ×2", confetti, door-open and walk animations, boss hit flash, rank-up fanfare, synthesized sounds (no audio files). iPad Safari can't vibrate, so all feedback is visual plus sound. |
| **Feedback character** | The nurse's speech bubble reacts to streaks, misses, low lives, comebacks, time of day and the exam countdown. Some lines slip in a memory trick ("Epi is on the outside!"). |
| **Onboarding** | First run: name → avatar creator → 3 short tutorial cards → first shift in Room 107. Later rooms are never locked, so studying is never gated. |

---

## 4. UI plan (iPad-first, screen by screen)

The iPad is the main device. Layout is chosen by the **window's width**, not the device name, because Split View, Slide Over and Stage Manager can make the window almost any size.

| Size class | When | Layout |
|---|---|---|
| **Wide** | iPad landscape, 1000 px and up | Two panes side by side |
| **Regular** | iPad portrait, 700–999 px | One wide column (max about 760 px) with a patient bar on top |
| **Compact** | Split View, Slide Over, phone (under 700 px) | The stacked phone layout |

Rules at every size:
- **no horizontal scroll**, checked automatically
- respects the home indicator and rounded-corner safe areas; uses `100dvh` height
- tap targets at least 48 px; body text 18 px, since an iPad is held farther away than a phone
- primary buttons sit where your thumbs rest: lower right in landscape, bottom center in portrait
- rotating the iPad mid-question keeps your answer and game state

1. **Hospital floor (home)**
   - Top HUD: rank badge, XP bar, day streak, exam countdown.
   - **Landscape:** a top-down floor plan that fits the whole screen with no scrolling.
     - A horizontal corridor runs across the middle, with 6 rooms above it and 6 below.
     - The nurse's station (your avatar and speech bubble) is at the left end and the OR elevator (boss) at the right.
     - The red **Code Blue** alarm hangs on the corridor wall.
   - **Portrait and compact:** the same floor turned into a vertical corridor that scrolls down (never sideways), with doors alternating left and right.
   - Each door has a room-number plate, the unit name, a patient avatar peeking out, a mastery-star ring, and a red dot when missed patients are waiting.
   - Tapping a door: the nurse walks along the corridor to it, the door swings open, and the view zooms into the room.
2. **Patient chart (question)**
   - **Landscape uses two panes.**
     - Left pane (about 40%): the patient at the bedside (avatar, name, age, room-bed, a cute "NKDA" allergy band), the **ECG monitor** with its BPM number, your nurse with the speech bubble, and lives, score and the streak flame.
     - Right pane: the question on a clipboard card, the options, and the lifeline tray.
   - **Portrait and compact:** a slim patient bar with the ECG on top, then the question and options below.
   - Options are big lettered cards. On a wide screen, short options sit in a 2×2 grid; long ones stay one per row.
   - SATA options show checkboxes and a "Submit" button.
   - Order questions: tap the steps in sequence, with numbered chips and an undo.
3. **Feedback panel**
   - **Landscape:** it slides in over the right pane, so the patient and ECG stay visible on the left.
   - **Portrait and compact:** a bottom sheet.
   - ✓ or ✗ (icon *and* color, so it works for color-blind players), the correct answer(s), and your choices marked.
   - "Why" in plain words, then the memory-trick chip and the ATI-tip chip.
   - Expandable sections: "Why the others are wrong" and "Read the guide". A wide screen has room to show them open.
   - The Next button.
4. **Shift report**: patients seen, accuracy, XP, stars change, new badges, confetti for a perfect shift, a "Review misses" button.
5. **Code Blue**: the same chart layout in a red alarm theme, with a big countdown bar.
6. **Boss (OR)**: in landscape, the boss and its HP bar face your nurse in the left pane while questions appear on the right. In portrait, the arena sits above the question. Attack and heal effects, plus a phase banner.
7. **Missed Patients**: a list grouped by room, a "Start re-rounds" button, and progress in discharges.
8. **Locker room**: a large live avatar preview (the left half of the screen in landscape), with tabs for skin (8 tones), hair (8 styles including a hijab and a scrub cap, plus 8 colors), eyes, scrubs (8 colors and patterns), and accessories (stethoscope, badge reel, glasses, penlight, watch, clog color). Locked items show which rank or badge unlocks them.
9. **Report card / stats**, as in pillar 7 above.
10. **Settings**: sound, **reduced motion**, text size, exam date, back up or restore progress (a downloaded file, using no typing), reset.

**Visual system**
- Dark, calm, clinical. Deep navy background, slate cards, mint/teal accent (scrubs), ECG green, amber for warnings, red reserved for Code Blue and errors.
- Colors are defined as tokens, with a light theme available.
- System font stack (San Francisco on iPad, works offline), with one type scale and one spacing scale.
- **All art is inline SVG.** The nurse is built from layers (body, skin, hair back, scrubs, hair front, accessories) so customizing is just swapping layers. Patients are generated from a seed: varied skin, hair, age and gown, plus a mood face.
- "Life-sim cute" means big-head, rounded proportions, in our own original style.

**ECG stress model**
- stress (0–1) comes from lives lost, wrong answers in a row, the Code Blue clock, and the boss phase.
- Heart rate = 60 + 90 × stress BPM. The trace shifts green → amber → red, with an optional beep on each beat.
- Stress decays as you answer correctly.
- With reduced motion on, the strip is static and only the number changes.
- The canvas draws at the screen's pixel density (2× on iPad), so the trace stays sharp, and it redraws after a rotation.

---

## 5. Technical architecture

```
game/
  content/units.json
  content/questions/ch01.json … ch12.json   # new ATI-style items
  src/template.html, src/css/*.css, src/js/*.js
  build.py      # validate → import the guide's 232 Qs → attach tips → inline everything → dist/index.html
  tests/smoke.mjs   # Playwright (already installed) iPad-viewport playthrough
  dist/index.html   # the single self-contained file that gets published
```

- **Vanilla JS, zero dependencies, no CDN.** The page works offline once loaded.
  - The Python build (the same style as the existing `tools/build_index.py`) concatenates the JS files in order into one namespace, inlines the CSS and content JSON, and prints a size report. The target is under 600 KB.
  - The build reuses `study-guide/data/source-content.json` directly. It does not re-scrape the site.
- **Question schema**:

  ```
  {id, unit, section, focus:[idx], type: mcq|sata|priority|teaching|order|math,
   stem, options:[{t, correct, why}], rationale, trick?, tip?, difficulty, origin: new|guide}
  ```

- **Build-time validation** (it fails the build on errors):
  - schema and unique IDs
  - every cited section exists
  - SATA has at least 2 correct options; MCQ has exactly 1
  - correct answer positions are balanced
  - no "all of the above"
  - no duplicate stems
  - **focus-point coverage report** (every one of the 239 focus points is covered)
- **State**: one store holding profile, avatar, XP, badges, settings, per-item review data, per-unit stats and history. It saves with a debounce and has a versioned save schema with migrations.
- **Saving progress**:
  - First choice is the artifact's own per-viewer storage, so progress survives a cleared browser. I'll load the `artifact-capabilities` skill at build time to confirm it's available.
  - This matters more on an iPad: Safari can delete a website's stored data after about 7 days of Safari use without visiting it, which would wipe progress kept only in `localStorage`.
  - Fallbacks are browser `localStorage`, then in-memory. Every storage call is wrapped in try/catch.
  - A downloadable backup file and restore option.
- **Modules**:
  - `store`, `storage`, `router` (screen stack and transitions)
  - `engine/{picker, scoring, srs, lifelines, badges, ranks}`
  - `ui/{floor, chart, feedback, report, codeblue, boss, missed, locker, stats, settings, onboarding}`
  - `art/{nurse, patient, boss}`
  - `fx/{ecg, confetti, particles, sound}`
  - `layout` (watches the window size and orientation, switches the size class, re-measures the canvases)
- **iPad Safari details**
  - `touch-action: manipulation` on controls, so taps fire instantly and double-tapping a button doesn't zoom. Pinch-zoom stays allowed on the page, for accessibility.
  - No accidental text selection or long-press pop-ups on game buttons. The explanation text stays selectable.
  - Optional shortcuts for a Magic Keyboard or Smart Keyboard: A–F or 1–6 picks an option, Enter submits or goes to the next patient. Everything still works by tap alone.
  - Hover styles apply only when a trackpad is attached. Apple Pencil taps work like finger taps.
  - Sound starts after your first tap (a Safari rule). There's no vibration.
  - Animations use only transform and opacity, so they stay smooth on older iPads.
- **Performance and accessibility**
  - Animations use CSS transforms plus one `requestAnimationFrame` loop, which pauses when the tab is hidden.
  - Respects `prefers-reduced-motion`.
  - Buttons have ARIA labels, focus is visible, contrast is at least 4.5:1, and right/wrong never relies on color alone.
  - Audio starts after your first tap (an iOS rule).

---

## 6. Build order (each phase ends with something playable)

1. **Content pipeline**
   - `build.py`: schema, validator, importer for the guide's 232 questions, coverage report.
   - Write new items for **Ch7–9 first** (the most instructor focus), then the other chapters.
   - Fact-check each one against its cited section.
2. **Engine vertical slice**: store, storage, router, all question types, scoring/streak/lives, the feedback sheet, Missed Patients review. A plain-styled shift in Room 107. **→ First preview link sent to you.**
3. **UI shell and visual system**: tokens and components, the floor corridor, the chart screen, the shift report.
4. **Characters and juice**: SVG nurse plus locker, patient generator, walk animation, ECG stress model, shake, floating points, confetti, sound, speech-bubble reactions.
5. **Modes and meta**: Code Blue, boss, XP and ranks, badges, lifelines, daily target and countdown, report card, Exam Simulation, onboarding, settings and backup.
6. **QA and ship**:
   - Automated tests and accessibility pass.
   - Final balance tuning (rank thresholds, boss HP, Code Blue timing).
   - Republish to the **same link**.
   - Commit and push to `claude/dreamy-heisenberg-vtqdyh`.
   - Update `PROJECT_LOG.md` with what was done and the assumptions made.

**Publishing.** At build time:
- Start with an Artifact `quickstart` (intent "other"), which loads the page-design contract.
- Publish `game/dist/index.html` as a private Artifact (title like "Ward Rounds", icon "medical").
- Republish to the same URL after each phase.

---

## 7. Verification

- **`python3 game/build.py`** must pass validation and show **239/239 focus points covered**, the question counts per unit and type, and the size report.
- **`node game/tests/smoke.mjs`** (headless Chromium with Playwright's iPad device profiles: iPad Mini, iPad, iPad Pro 11), in **portrait and landscape**, plus Split View widths of about 320, 500 and 680 px:
  - no horizontal overflow (`scrollWidth <= clientWidth`) on every screen
  - rotates the device mid-question and checks that the selected answers, lives and timer survive
  - zero console errors
  - plays a full shift, answering right and wrong, and checks that lives, score, streak, the Missed queue and saving all update
  - reloads and checks that progress persisted
  - runs Code Blue and the boss to completion
  - renders every one of the 432 questions once
  - takes a screenshot of each screen for visual review
- **Content check**: for each new item, re-read the cited section and confirm the key and the rationale. Spot-check 10% of the imported guide questions after they're converted to the game format.
- **Your iPad check** in Safari after each preview link: tap feel, text size, both orientations, animation smoothness. Chromium emulation can't catch every Safari quirk, so your check on the real iPad is the final word.

## Risks and how they're handled

- **I write the new questions, so errors are possible.** Every item cites its source, the guide excerpt is one tap away, and a dedicated fact-check pass runs before release.
- **Scope is large.** The phases above, with a playable link early.
- **Progress loss on the iPad** (Safari's 7-day storage cleanup). Artifact storage first, localStorage only as a fallback, plus the backup file.
- **iPad Safari quirks** (sound needs a tap first, no vibration, odd Split View sizes, rotation). Handled by the layout rules above, then checked on your real iPad.
