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
