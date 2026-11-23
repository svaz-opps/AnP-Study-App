# Project log

## 2026-11-23 — Indexed the BIOL 2401 final exam study guide
- Source: https://lsc-nh-biol2401-final-study-guide.netlify.app/ (Dr. Víctor García Martínez, LSC-North Harris).
  Host added to the Default cloud environment's network allowlist at the user's request.
- The site is a single-page app; all content lives in `data/content.js` (`window.SG_CONTENT = {...}`).
  It was parsed as JSON (never executed) and saved as `study-guide/data/source-content.json`.
- `tools/build_index.py` generates the index under `study-guide/`:
  README (master index), one Markdown file per chapter (focus points, full text, tables, callouts,
  figure descriptions, check-yourself Q&A, glossary/practice cross-links), glossary with
  "appears in" back-references, key-term index (all bolded phrases → sections), practice exam (120 Q with
  answers), figure index with credits/licenses, and `data/study-guide-index.json`.
- Verified: every 4+ letter word of each section's text appears in the generated chapter file.
- Assumptions: images are linked to the live site, not downloaded; figure credit lines are kept in
  figures.md/JSON rather than inline; audio narration files were not fetched; the repo is private
  (GitHub returns 404 anonymously), so storing the guide's text is for personal study only.

## 2026-11-23 — Planned "Ward Rounds", a hospital-themed study game
- Plan saved at `game/PLAN.md` (approved by the user).
- Decisions confirmed by the user: content comes from the BIOL 2401 guide in this repo, written ATI-style;
  all 12 chapters become rooms with Ch 7–9 weighted ~2×; bank = 200 new items + the guide's 232 questions;
  **main device is an iPad** (Safari, landscape + portrait), still usable in Split View and on a phone.
- Assumptions: single self-contained HTML published as a private Artifact; vanilla JS, no CDN, works offline once
  loaded; progress saved to artifact storage if available, else localStorage, plus a backup file (Safari can evict
  localStorage after ~7 days without a visit); exam date is set inside the app rather than hard-coded.

## 2026-11-23 — First playable preview of Ward Rounds
- Engine, all screens (floor, chart, report, missed patients, locker, report card, settings, onboarding), Code Blue,
  boss fight, exam simulation, lifelines, ranks, badges, review scheduling.
- Published as a private Artifact: https://claude.ai/artifact/UaFKWV2HJ2jGDdnFTvUXEw (page + data.json beside it;
  capabilities db + user + downloads). `game/dist/ward-rounds.html` is the fully self-contained offline copy.
- `node game/tests/smoke.mjs` plays full shifts, Code Blue, a boss win, reload persistence and a rotation at
  iPad landscape (1180×820), portrait (820×1180), iPad mini landscape and Split View compact (375 wide): all pass.
- Assumptions: single-answer questions submit on tap (fast, matches "tap to answer"); SATA/order use Submit;
  partial SATA credit uses +/− scoring and only a perfect answer keeps the streak; a missed item is "discharged"
  after being answered right on 2 different days; boss unlocks at ★ in 6 rooms (`#debug` in the URL bypasses it);
  the page is dark-only by choice (the user asked for a dark look).

## 2026-11-23 (overnight) — Question bank complete
- 248 new ATI-style questions in `game/content/questions/ch01–ch12.json` + the guide's 232 = 480 patients.
  `python3 game/build.py --strict` confirms all 239 instructor focus points are covered (it fails otherwise).
- Every new item cites its section and focus point(s), has a plain-words "why", a reason for each wrong option,
  a memory trick, and an ATI test tip. Tips copied from the guide are labeled "From your guide".
- Type mix (new): 158 MCQ, 51 SATA, 17 ordering, 8 needs-further-teaching, 7 priority, 7 med math.
- Smoke test now renders all 480 questions and checks each answer key grades as correct.
- Assumptions: where a guide focus point was an "all of the above" item, it became a SATA (the game bans
  "all/none of the above"); med math stays A&P-relevant (rule of nines, pH, membrane potential, mg dosing,
  atomic particles); a few clinical framings (compartment syndrome, dislocation, retinal detachment) use standard
  nursing priority logic on top of the guide's facts.
- Known gaps for the next pass: priority and teaching items are below the plan's ~10% each; a real iPad Safari
  check is still needed (tests run in Chromium); hot-reload restore of an open round is untested.

## 2026-11-23 (6am polish)
- Added 10 priority and 15 needs-further-teaching questions (`game/content/questions/x-priority-teaching.json`):
  505 patients total; type mix now 17 priority / 23 teaching (was 7 / 8).
- Balance: the OR (boss) unlocks at a star in 4 rooms OR 12 finished shifts (was a star in 6 rooms, which would
  take ~25 shifts). Assumption: with the final a few weeks away, the boss should be reachable sooner.
- Fixes: Code Blue clock pauses while a dialog is open; cloud save flushes when the app goes to the background;
  Locker/onboarding screens no longer inherit their inner layout class (squeezed layout); button icons sized;
  head-only avatar crop shows buns; faint text contrast raised.
- QA: automated overlap check of every new correct answer against its cited guide section (lowest overlap items were
  hand-checked paraphrases); `tests/hot.mjs` confirms an open round survives a live page update; full smoke suite
  passes at 4 sizes and renders all 505 questions.

## 2026-11-23 — Branch workflow + Submit button on every question
- Branches: `main` holds the newest stable app; risky features go to `beta` first, get tested, then are merged into
  `main`. Both were started from `claude/dreamy-heisenberg-vtqdyh` (the newest work). See `BRANCHING.md`.
- Every question type now waits for Submit: tapping an option only selects it (tap another to change your mind);
  Enter also submits. Applies to all modes, including Code Blue and the exam. Smoke + hot-restore tests updated
  to assert a single-answer tap does not grade, and pass at all 4 sizes.
- `game/dist/ward-rounds.html` (self-contained, works offline) is now committed so it can be downloaded straight
  from GitHub. Rebuild it with `python3 game/build.py` and commit it whenever the game changes. The artifact page
  was left as it was, at the user's request.

## 2026-11-23 — Autosave for rounds in progress
- Overall progress already saved after every answer; now the open round does too (`state.openRun`), after every
  tap, screen change, next patient, and when the app is backgrounded or closed. It rides along in the normal save,
  so it reaches the Claude-account save and backup files as well.
- On launch, a saved round brings up "Pick up where you left off?" (Resume / Discard). Dismissing the prompt keeps
  the save until a new round starts. Discarding a Code Blue/boss round still counts it, same as Leave.
- Resume restores the patient, unsubmitted selections, lives, lifelines, score, streak and the Code Blue clock.
  Code Blue/exam questions that were already answered move on to the next patient (those modes have no feedback
  screen to return to). A saved round whose questions no longer exist in the bank is dropped quietly.
- Assumptions: the Code Blue clock is paused while the game is closed (resumes with the time it had); Resume
  has default keyboard focus so Enter doesn't discard by accident.
- New `game/tests/autosave.mjs` (12 checks) passes, along with the smoke and hot-restore suites.

## 2026-11-23 — Roadmap
- Added `ROADMAP.md`: every goal has a permanent ID (R1, R2, …). R1–R9 are the work done so far; R10–R15 are the
  gaps found when checking the game against the original prompt; R16 (online page) is on hold at the user's request.
- Assumption: IDs are never renumbered; the order of the Open table is the suggested order of work.

## 2026-11-23 — R10, R11, R12, R15 (R13, R14, R16 on hold per the user)
- R10: "Ask a colleague" is a true 50/50 on single-answer questions (right answer + one wrong stay). On SATA it
  removes half the wrong options, rounded up (a true 50/50 isn't defined when several answers are right); on
  ordering it still places the first step. The button is greyed out when nothing can be removed (one guide
  question has only 2 options), and the lifeline isn't spent. New `tests/lifeline.mjs` checks every question.
- R11: wrote a question-specific memory trick + ATI tip for all 232 study-guide questions
  (`content/guide-extras/chNN.json`, keyed by question id). `build.py --strict` now fails if any is missing or if
  an extras id doesn't match a guide question. Tricks are built from each question's own "why" and the guide's
  section content; one proofreading fix (epidermis strata order label).
- R12: +32 "needs further teaching" (`x-r12-teaching.json`) and +29 "see first" (`x-r12-priority.json`), spread
  over sections that had none and avoiding scenarios already used (stroke, meningitis, compartment syndrome…).
  Totals: teaching 55 (9.6%), priority 46 (8.0%) of 575. Assumption: ~8–10% each is close enough to the plan's
  ~10%; going higher would mean stretching thin A&P sections into clinical topics the guide doesn't cover.
- R15: +9 med-math (`x-r15-math.json`), all A&P-relevant; 16 total.
- Clinical framings on top of guide facts (standard nursing priority logic): hypothermia, oliguria, appendicitis,
  pneumothorax, hypoglycemia, dehydration, CO poisoning, DKA, deep-tissue pressure injury, early newborn jaundice,
  thrombocytopenia bleeding, post-thyroidectomy hypocalcemia, cauda equina, infant hydrocephalus, referred cardiac
  pain, chemical eye splash, acute glaucoma, worsening head injury, hyperkalemia, hip-replacement dislocation,
  botulism, Guillain-Barré, autonomic dysreflexia, sudden hearing loss, diabetic foot, choking, neck injury,
  heart-failure fluid overload.
- All suites pass (smoke at 4 sizes rendering all 575, hot restore, autosave, lifeline).
