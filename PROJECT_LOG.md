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

## 2026-11-23 — R17 priority to 10%, R18 accuracy review
- R17: +14 "see first" questions (`game/content/questions/x-r17-priority.json`), new scenarios only: cardiac
  tamponade, water intoxication (hypotonic), opioid respiratory depression, airway burn, fat embolism,
  rhabdomyolysis, status epilepticus, septic shock with rising lactate, malignant hyperthermia, upper GI bleed,
  anaphylaxis, severe anemia, metastatic cord compression, epidural hematoma. Priority = 60 / 589 (10.2%).
- R18: read every question in full (all 589: stems, all options incl. the instructor's distractors, wrong-option
  reasons, explanations, tricks, tips), the 26 study-guide tips the game shows, and the game's own teaching text
  (type tips, nurse lines, onboarding, badges). Automated checks too: duplicate options, answer-length cues.
  No answer key was wrong. 15 text fixes:
  - P2-01: a hypothermic client who has stopped shivering is now 31 °C, not 35 °C (shivering usually stops
    below ~32 °C); explanation updated.
  - P2-19: an epidural bleed is between the skull and the dura mater (was "the meninges").
  - N7-10: occipital/temporal bones are only partly intramembranous (explanation said fully).
  - N7-28: "light-skinned (white or Asian)" reworded to "White or Asian ancestry".
  - T2-08: stem said "a nurse explains" but asked about "the student".
  - G-F070 tip: skeleton functions now include fat storage (matched other questions).
  - Tricks with wrong or nonsense word origins fixed: C-ch1-life (metabolism), C-ch1-regions (epigastric = over,
    not above, the stomach), C-ch1-organization (anatomy), C-ch5-stratified (keratin), G-F082 (sarcomere),
    G-F017, C-ch3-osmosis (water follows solute, not just salt), T2-31 (rods).
  - The study-guide tip in ch9-head about "muscles marked (*)" refers to the printed outline, so the game no longer
    shows it (filtered in build.py). The guide's own text was not edited.
  - Noted, not changed: 15 questions (mostly from the earlier bank) have a correct option noticeably longer than
    the distractors, a test-taking cue; the content is accurate.
- Assumption: the instructor's guide is the authority for course facts (e.g., "a muscle cramp is most likely due to
  lack of ATP", "loss of synovial joint function begins in the third decade"); questions follow it even where
  textbooks phrase things with more nuance.
- All suites pass.

## 2026-11-23 — R19 answer-length cues removed
- Reworded the 15 flagged MCQs (N1-05, N3-06, N5-05, N6-08, N7-23, N7-29, N8-23, N9-04, N9-16, N11-03, N11-07,
  N11-17, N12-05, G-F118, C-ch9-disorders): shortened the right answer to its core idea and made the wrong options
  equally specific. The detail that was cut from right answers is still in each explanation. Answer keys unchanged.
- The same check run on all single-answer types also caught 4 priority questions (P-09, P2-16, P2-22, P2-23);
  fixed the same way.
- G-F118 and C-ch9-disorders come from the study guide's own bank, so they're reworded through a new optional
  `"opts"` override in `content/guide-extras/` (option index → text); the guide file is untouched.
- `build.py --strict` now fails when a single-answer question's right answer is >40 characters and more than
  1.8× its longest wrong option (0 now). At a stricter 1.6×, 22 milder cases remain; left as is (assumption:
  1.8× is the line for an obvious cue, matching the original check).

## 2026-11-23 — GitHub Pages hosting
- Added `.github/workflows/pages.yml`: on push to `main` (when the built game or the workflow changes, or run by
  hand), it publishes `game/dist/ward-rounds.html` as the site's `index.html` (also kept at `/ward-rounds.html`).
- Assumption: deploy the committed build rather than rebuilding in CI, since the committed file is what the
  branching workflow already tests and treats as the release.
- The repo is private: Pages on a private personal repo needs GitHub Pro (free with the Student Developer Pack),
  or the repo must be made public. The published site itself is public either way. Pages must be switched on once
  in Settings → Pages → Source: "GitHub Actions".
- Removed the merged leftover branches (ccr-dd43cba2-3w86f7, claude/dreamy-heisenberg-vtqdyh,
  claude/friendly-meitner-j5l8qj); the user deleted them on GitHub.
- First deploy (a re-run of the original run) uploaded the site but deploy-pages found 0 artifacts. Bumped
  checkout to v5 and upload-pages-artifact to v4 and pushed so a fresh run starts.

## 2026-11-23 — Saving on the hosted (GitHub Pages) version
- Outside claude.ai there is no account save, only browser storage, so three changes:
  1. Backup now saves a real file. On iPad/iPhone it opens the share sheet with the .json file ("Save to Files"),
     which works in Safari and from the Home Screen app; elsewhere it is an ordinary download. Clipboard is the
     last fallback. Inside claude.ai the downloads capability is still used first.
  2. Home Screen support: build.py adds Apple web-app meta tags, theme colour, an apple-touch-icon and a web app
     manifest to the standalone build. Icons + manifest live in `game/web/` (drawn by `tools/make_app_icons.py`)
     and the Pages workflow publishes them next to the page. Status bar style "black" (not translucent) so the
     top bar never sits under the status bar.
  3. The game calls `navigator.storage.persist()` at start (best effort; Safari may ignore it).
- Settings text (non-cloud) now says progress is device-only and tells iPad users to use the Home Screen icon.
- New test `game/tests/backup.mjs` (desktop download + restore, iPad share sheet, Home Screen tags); added to
  the BRANCHING checklist. All six suites pass.
- Assumption: a Home Screen web app keeps its own storage, separate from Safari, and is exempt from Safari's 7-day
  storage cap (Apple's documented behaviour as far as known); not verifiable from here.

## 2026-11-23 — In-game "how to save on iPad" instructions
- Settings has a new card, shown only outside claude.ai (where there is no account save): "How to save your game on
  iPad". It says where you are playing (Safari vs the Home Screen icon) and gives the steps: add to Home Screen,
  move existing Safari progress with backup/restore, back up to Files now and then, and what erases progress.
  Desktop browsers get a short generic version. Already in the Home Screen app, the Home Screen steps are hidden.
- A one-time popup "Keep your progress safe" with the same steps appears at start in Safari on an iPad (hosted
  version only, not in the Home Screen app, not when a resume prompt is showing). Buttons: Remind me later (shows
  again next launch), Back up now, Got it (stored in the new `state.tips.iosSave`).
- Assumption: iPad detection uses the user agent plus the "MacIntel with touch" check, since iPadOS Safari
  reports itself as a Mac. The Share button may sit in the ••• menu on newer iPadOS, so the text mentions both.
- backup.mjs extended (guide shown, reminder shown/re-shown/retired, none on desktop). All suites pass.
## 2026-11-23 — R20–R23 whimsy and gameplay
- Plan agreed with the user: whimsy driven by both the in-round streak and the end-of-shift score; wrong answers get
  escalating chaos; all four gameplay additions (room themes, thank-you cards, shift events, daily challenge). The user
  asked that Rapid Response be a learning tool: questions from other rooms to force recall and give a "shock".
- R20 `src/js/22-whimsy.js` + `src/css/35-whimsy.css`: the bed patient is split into movable groups (bed, IV, person,
  head, hair, body, arms, legs, props). 11 right-answer reactions in 4 streak tiers (same steps as the ×1.5/×2/×3
  multiplier, plus 15+) and 9 chaos reactions in 3 miss levels. New face moods (dizzy, starry, shock, cool, silly),
  synthesized gag sounds, and a "Silly patients" setting. Partly-right answers get no gag (assumption: stay calm so
  the student reads which options they missed). Exam and boss modes have none; Code Blue is capped at level 1.
- Assumption: reactions run only inside the patient card (clipped), never over the question or the explanation, and
  the explanation is never delayed. The phone-width bed stays 54×40 px because a bigger one wrapped the patient info.
- R21 room themes (`UNIT_THEME` in `20-art.js`) and the discharge parade on the report (`55-report.js`); no parade
  for exam simulations.
- R22 events (`EVENTS` in `35-run.js`): 25% of shifts. Rapid Response picks via `Engine.rapidPicks`: due or fading
  items from other rooms first (missed and not seen today, or right once and 3+ days old), then rooms already played
  but not seen today, then easier items anywhere; never two from one room. Rapid and visitor questions cost no life
  (assumption: a surprise question shouldn't end a shift), but misses still go to Missed Patients. Their answers count
  toward the other room's items normally; the current room's stars are unaffected. Shifts with Rapid Response or a
  visitor are 12 or 11 questions long.
- Daily challenge: the 5 questions are stored in `state.daily` the first time they're picked that day, so they stay
  the same all day even as the missed list changes. Replays are allowed but don't add to the daily streak or bonus.
- R23 `src/js/65-cards.js`: cards are awarded on discharge (`Engine.record` → `Cards.give`). The album shows earned
  cards plus locked tiles for patients still in Missed Patients (assumption: showing a silhouette for every
  question in the bank would be ~590 tiles and not meaningful). The card is placed under the explanation and tips.
- Tests: new `game/tests/whimsy.mjs` (tiers, chaos, settings, calm motion, events, daily, cards); `smoke.mjs` also
  visits the album. Fixed a flaky check in `lifeline.mjs` that failed when the first question was an ordering one.
  All suites pass.

## 2026-11-23 — Safari fixes: intro overlap/slowness, clipped room-card patients
- Intro: stepping through the onboarding tabs used `App.show()`, which keeps the old screen fading out for 220 ms
  on top of the new one, so both steps' words overlapped, and two animated full-screen layers were heavy in Safari.
  Steps now swap in place (`App.rerender()`) with a short opacity-only fade (`.ob-step`).
- Floor: room cards were flex columns inside a `<button>`; when content was taller than the row, Safari clipped
  the patient avatar and door strip. Cards are now grids: the door is pinned absolutely on the corridor side, the
  blurb is the only part that gives way (row `minmax(0, 1fr)`, `contain: size` in landscape), and landscape rows
  never shrink below header + name + patient (`minmax(auto, 1fr)`). On very short windows the floor scrolls a
  little instead of clipping.
- Assumption: Safari's exact flex-in-button behaviour could not be reproduced here (Chromium only); the new
  layout avoids depending on it. Edits kept small and in place to merge cleanly with the parallel overhaul;
  `game/dist/ward-rounds.html` will conflict and should just be rebuilt after merging.

## 2026-11-23 — Flaky test fixes (autosave, whimsy)
- `autosave.mjs`: random shift events (R22 Rapid Response / visitor) made shifts 11–12 patients long, so
  `Patient 3 of 10` failed about 1 run in 3. The test now switches events off (wraps `Run.prototype.rollEvent` to
  force `'none'`, re-applied after every page load), so every run is the same 10-patient shift; the check is unchanged.
- `autosave.mjs`, second flake found while looping: step 4 answered on top of the selection restored by resume.
  On an ordering question at patient 3, tapping the already-placed step takes it back, leaving the answer short and
  Submit disabled (timeout waiting for Next). `answer()` now clears any existing selection first. Proven by forcing
  an ordering question into slot 3: the old test timed out, the new one passes.
- `whimsy.mjs`: "miss 1 in a row → chaos 1" failed when the shift's first question was an ordering one with an
  odd number of steps: the reversed "wrong" answer leaves the middle step right (partial credit, e.g. frac 0.2),
  and partly-right answers get no chaos reaction by design. Wrong ordering answers are now the steps rotated by one
  (no step in place). `startShift()` in that test also passes `event: 'none'`; events keep their own checks.
- No app code changed, no checks removed. Each suite passed 10 consecutive runs; all `BRANCHING.md` suites pass.

## 2026-11-24 — Smooth play, one config file, readable code (R26, R27)
- Measured first (Playwright, Chromium, 1180×820 at 2×, CPU slowed 4–6× to stand in for an older iPad): frame times,
  long tasks, tap handler time and tap-to-next-paint (Event Timing API). Scripts were kept in the session scratchpad,
  not the repo; `game/tests/smooth.mjs` keeps the fixes from regressing.
- Stutters found and fixed:
  - Dialogs: the blurred backdrop was re-rendered every frame over the running heart monitor (~20–30 fps). The
    monitor now pauses while a dialog is open (as the Code Blue clock already did): 60 fps.
  - Answer tap: three forced synchronous layouts (`void el.offsetWidth` animation restarts, `scrollTop = 0` on a panel
    that is always new). Replaced with `replayClass()` (class back on two frames later) or a fresh element. The
    explanation panel now renders one frame after the answer marks/sound/reaction (`afterNextPaint`). The patient was
    drawn twice per answer when a whimsy reaction played; now once. Handler 36–50 ms → ~12 ms at 6×.
  - Next patient: the monitor canvas was rebuilt and measured (`getBoundingClientRect`) for every patient; the same
    canvas now carries on (sized by ResizeObserver, so the trace no longer restarts). `rerender` reads `scrollTop`
    before changing the page. Handler ~34 → ~27 ms at 6×; tap-to-paint did not change measurably (redrawing the
    whole screen is the cost; left as is).
  - Monitor drawing: grid drawn once per size instead of 60+ strokes a frame; canvas `shadowBlur` glow (slow in
    Safari) replaced by two wide faint strokes (checked side by side); resolution capped at 2×.
  - Code Blue timer and boss HP bar slide with `transform` instead of `width` (no layout per frame); the timer number
    is only rewritten when it changes. Floor alarm light no longer animates `box-shadow`.
  - Saving: the localStorage write waits 1 s after the last change and runs in idle time; it is still flushed on
    page hide/close (unchanged) and immediately for `save({ now: true })` (end of round, restore, reset). Assumption:
    1 s is safe because iOS fires `visibilitychange` when the app is backgrounded.
  - Picking: each room's mastery is computed once per pick instead of once per question.
- Bug found while checking screenshots: the Code Blue timer's alarm icon had no size rule and filled the whole
  right pane on wide screens (visible in the committed smoke screenshots), hiding the countdown bar and pushing the
  question down. Added `.timer > svg` sizing.
- Config (`game/src/js/01-config.js`): every rule, reward, threshold and timing. Badge descriptions, tutorial, floor
  dialogs, nurse lines and feedback notes are built from the values, so text can't drift from the rules. Badge ids
  (`streak10`, `cards25`…) are save keys and stay as they are even if a threshold changes. Left inline on purpose:
  colours (CSS tokens), content (units.json, questions), avatar options, and purely cosmetic cut-offs (which face the
  nurse makes on the report). Small text change: the Rapid Response badge says "every" instead of "both" questions,
  and nurse lines say "×2 points" instead of "Double points", because those numbers are now configurable.
- Readability: longest line 519 → 156 characters (JS), CSS rules split one declaration per line. Long SVG/HTML
  strings were split at tag/attribute boundaries; big templates were broken into named pieces and helpers
  (`ReportSummary` per mode, `feedbackNotes`/`feedbackTips`, locker `swatch`, settings `row`/`seg`, `Screens.missed.roomHTML`).
  Proof of no visual change: a snapshot of 997 rendered pieces (every screen at 3 viewport sizes, every question type
  in every mode before/after answering, events, reports, all locker tabs and faces, every whimsy reaction) was
  identical before and after, byte for byte for the scripted split and with whitespace runs collapsed for the hand
  rewrite. CSS compared identical with whitespace removed. The snapshot caught one regression during the work
  (`map(roomHTML)` passing the index into a new parameter), fixed before commit.

## 2026-11-24 — iPad screenshot check
- Re-ran the smoke playthrough at iPad landscape (1180×820), iPad portrait (820×1180), iPad mini landscape
  (1133×744) and Split View (375×760) and looked at every screenshot.
- Fixed: in portrait (one-column layout) the chart grid stretched to the full screen height and handed the spare
  space to the top row, leaving ~120 px of empty space between the nurse's speech bubble and the question card.
  `.chart-grid` now has `align-content: start`. Landscape is unchanged (one row there).
- Test fix, not a game bug: the shift-report and boss-report screenshots were taken mid-animation (screen
  cross-fade, patients walking out), so they looked overlapped/clipped. `smoke.mjs` now waits 1.8 s before both.
- Toasts ("Badge earned", "Promoted to…", backup messages) moved from top-centre, where they covered the header (XP
  bar on the floor, hearts in the OR), to the lower right, as asked. They sit 76 px above the bottom edge (plus the
  safe area) so they clear the bottom row of buttons: mid-round badges fire while the feedback panel is open, and its
  Next patient button is in the bottom-right corner (also the floor's nav bar and Settings). Checked by measurement at
  landscape, portrait and 375 px: no overlap with Next patient. Taps pass through toasts (`pointer-events: none`).
  Several toasts now stack in a column (they used to land on the same spot and hide each other, e.g. three badges at
  the end of the boss fight), slide in/out from the right, and only fade under Calm motion or reduced motion.
  Trade-off: a toast can briefly cover a line of text above those buttons; it is gone after 2.6 s (3.2 s for rank-ups).
- Committed screenshots in `game/dist/shots/` refreshed.
- Speech-bubble tail: it was pinned 16 px from the bubble's bottom, which is only centred for one bubble height; on
  the usual one-line bubble it sat near the top-left corner. Now centred on the bubble's height (`top: calc(50% - 8px)`),
  and the nurse row centres the bubble on the nurse (`align-items: center`, was `flex-end`, which put the bubble at
  the nurse's feet). In the boss arena the bubble sits under the nurse, so its tail now points up at the nurse instead
  of out to the side. Checked close up at landscape, portrait and 375 px with one-line and three-line bubbles, on the
  chart, the floor and the boss arena.
- Heart monitor looked frozen on the user's iPad. Cause: on Motion "Auto" the game follows the iPad's Reduce Motion
  setting, and the monitor drew one still trace under it (confirmed on the live site with emulated reduce-motion).
  At the user's request it now keeps sweeping on "Auto" even with Reduce Motion on; only the game's own "Calm"
  setting stills it (`calmChosen()` in 00-util.js). Walking, shaking, confetti etc. still follow Reduce Motion on
  "Auto", unchanged. Settings text now says Calm also stops the moving heart monitor. Checked: moving with reduce
  off/Auto, reduce on/Auto, reduce on/Full; still (but drawn) on Calm. All 7 test scripts pass.
- Screens overlapping during a change (user's iPad screenshots: the chart drawn over the floor). Cause: `App.show`
  kept the old screen for 220 ms with a fade-out while the new one faded in, so mid-way both were visible; with the
  iPad's Reduce Motion on, the CSS turns off the fade-out, so both were fully opaque on top of each other. Now the
  old screen is removed at once and only the new one fades in over the plain background (Reduce Motion: it just
  appears). Removed `.screen.leaving`, `screen-out` and `CONFIG.timing.screenLeaveMs`. Checked frame by frame with
  reduce-motion on and off: never more than one screen on the page. All 7 test scripts pass.
- Floor: the nurse used to walk straight over her own speech bubble when you tapped a room (landscape: the bubble
  sits right of her in the corridor). Now `Screens.floor.tuckBubble()` first shrinks the bubble into her (scale to 5%
  and fade, origin at her head, `CONFIG.timing.bubbleTuckMs` = 260 ms), then she walks. With Reduce Motion/Calm the
  bubble just disappears (she doesn't walk then either). The new floor screen after a shift brings a fresh bubble.
  Checked frame by frame at 1180x820. Not changed: she still passes in front of the Code Blue and OR buttons on the way to far rooms.
- Floor: the nurse now walks behind the Code Blue and OR buttons (z-index 4, above `.walker` at 3), at the user's
  request. The locked OR button used `opacity: .6` on the whole button, so she'd have shown through it; now its
  background and border are dimmed with opaque colours and only its contents are at .6. Checked frame by frame at
  1180x820 walking to room 106 (she ends partly hidden behind the OR button just before the door opens).
- Floor, at the user's request: instead of her ending up half-hidden behind the OR button, the Code Blue and OR
  buttons in the corridor now shrink away (scale to 5% and fade, `CONFIG.timing.buttonTuckMs` = 200 ms, clicks off)
  the moment she starts walking, so she is always in view. They come back with the floor after the shift. The
  layering change from before stays (harmless: for the first frames she is still behind them as they shrink).
  Portrait is unaffected (those buttons sit below the floor plan there, out of her path). Checked frame by frame at 1180x820.
- Portrait floor: doors now face the hallway. They used to be a horizontal strip across the top of every room; now
  each is an upright strip on the corridor side (right edge for the left column, left edge for the right column,
  picked by `:nth-child(odd/even)`, since rooms alternate left/right in source order). The door panel hangs from its
  top and opens with `rotateX(75deg)` (landscape keeps `rotateY(-75deg)`). Room padding moves off the door. Checked opening rooms 103 (left) and 104 (right) at 820x1180.

## 2026-11-24 (floor layout fixes)
- Missed-patient badges on room cards now sit in the card's top row beside the stars instead of being absolutely
  positioned, so they no longer overlap the door strip / card border on the bottom row of rooms.
- Nurses' station desk label is centered in its box (vertical text was top-aligned because text-align defaulted to start).
- Checked with screenshots at iPad landscape and portrait; smoke suite passes at 4 sizes.
- Merged main (badges in the top row, centred station label) into the session branch; dropped my portrait
  `.room-dot` offset since the dot is no longer absolutely positioned.
- Pushed to main (196d8d8) at the user's request; Pages run #12 succeeded. The run before it (#11, from the other
  session's merge) had failed at deploy-pages after a successful upload; #12 deployed the same plus these changes.
- "Nurse teleports to the door" (user's iPad). Cause: the walk only ran when reduced motion was off, and on Motion
  "Auto" the game follows the iPad's Reduce Motion setting, which the user has on; a CSS rule under
  `prefers-reduced-motion` also killed the walker's transition, so even Motion "Full" couldn't bring it back.
  Now the walk, the bubble/button tuck and the door swing follow the game's own Calm setting only (`calmChosen()`,
  same as the heart monitor); the CSS rule is gone. Checked frame by frame with emulated reduce-motion: she walks
  the whole corridor with stepping legs. Calm still skips the walk (as the Settings text says).

## 2026-11-24 — Overnight animation pass (unattended)
User asked for an overnight pass: research what makes good animation, apply it across the app, log progress so
the work can resume (scheduled message at 2:20 am Central). Work stays on the session branch
`ccr-dd43cba2-3w86f7`; nothing is pushed to main without the user. Principles + checklist: `ANIMATION_NOTES.md`.
After animation work runs out: ideas to make the game more engaging; after that, anything useful.
- Pending from before: the "nurse walks with device Reduce Motion on" commit is on the branch, not main.
- A (done) Motion levels. `motionLevel()` in 00-util.js returns full / soft / calm; `<html data-motion>` carries it.
  soft = "Auto" + device Reduce Motion: screens, feedback panel, dialogs, banners, toasts and the thank-you card
  crossfade instead of sliding/zooming/flipping; no shake, no outage flicker, the parade fades in, confetti is a
  lighter sprinkle; the walk, patient gags, boss projectile, screen flash and heart monitor all still play.
  calm = the game's "Calm": still. Every `@media (prefers-reduced-motion)` rule in the CSS is gone, so "Full" is
  really full on a Reduce-Motion device. The level follows the device switch live. Settings text explains Auto vs
  Calm. New test `game/tests/motion.mjs` (4 cases) added to BRANCHING.md's list. All 8 test scripts pass.
- B (done) Motion tokens in 00-tokens.css: `--ease-out` (entrances), `--ease-in` (exits), `--ease-move` (on-screen
  travel), `--ease-spring` (small pops), `--dur-tap` 110 ms, `--dur-small` 200, `--dur-panel` 300, `--dur-exit` 160.
  Core UI moved onto them: screens, buttons, room cards, options, modal + backdrop, toasts (exit now 160 ms ease-in,
  faster than the 260 ms entrance), feedback panel/sheet, walker, bubble, HP bar, details arrow. Whimsy gags keep
  their own hand-tuned curves.
- C (done) Floor walk. Her step rate now follows her speed (`--step` = stride 58 px / speed, 0.10–0.22 s), so her
  feet no longer slide (before: one step per 224 px). Walk 600 px/s, 0.4–1.4 s. A 150 ms crouch before she sets off
  (anticipation), the door starts opening 160 ms before she arrives (overlap), a small spring settle when she stops,
  then she steps through the doorway (34 px towards the room, shrink + fade, 240 ms) before the screen changes.
  New timings in CONFIG.timing (walkStridePx, walkCrouchMs, doorLeadMs, doorSettleMs, stepInMs); doorOpenMs removed.
- D (done) Screen continuity. Tapping a room: the bedside screen grows out of that room (`App.zoomFrom` sets the
  transform-origin, `.from-point` / `zoom-from` 0.55 → 1, 420 ms ease-out; a fade on soft, nothing on calm).
  Coming back to the floor from that shift (report → home, or Leave): the door opens, she steps out, the door closes
  behind her, she walks back to the station, then her bubble and the corridor buttons pop back in one after another.
  A room tap during that walk takes over cleanly (`walkId`). Checked frame by frame at 1180x820. All 8 tests pass.
- E (done) Chart. After Submit: the check/cross marks pop in down the list (45 ms apart, spring), the right answer
  gives a small nod, and the explanation panel follows 240 ms later (`CONFIG.timing.feedbackDelayMs`; right after
  the first paint on Calm) instead of arriving together with the marks and the scroll. The wide-layout panel now
  rises from below (it sits under the options) instead of sliding in from the side. The score rolls up to its new
  value (`FX.countUp`, 450 ms ease-out). A lost heart swells, tips and drains to grey (it went grey at once before).
  Next patient: a copy of the old chart slides off to the left while the new one slides in (`FX.ghostOut`; a
  crossfade on soft; nothing waits for it, and it is placed where the chart sits after the scroll back to the top).
  Bug fixed on the way: `App.rerender` reset the screen's classes, which swapped the animation name and replayed an
  entrance on the whole screen at the first "Next patient" after zooming into a room. All 8 tests pass.
- F (done) Progress bars. The old `transition: width` never ran (bars are drawn fresh with their final width), so
  bars just appeared full. Now every `.bar > i` fills on appearing with `scaleX` (no layout per frame), 0.8 s
  ease-out after 0.2 s; the HP and Code Blue timer bars (moved by script) are excluded; nothing on Calm. The floor's
  XP bar starts from where it was last shown (`--from`), so XP earned on a shift flows in when you return, and the
  XP number rolls up alongside it. All 8 tests pass.
- G (done) Dialogs now leave instead of vanishing: on close the backdrop is moved out of #modal-root at once (so
  the dialog counts as closed and a following dialog can open), then fades while the card sinks slightly, 160 ms
  ease-in (entrance 260 ms spring). Toast removal timed to its 160 ms exit. The Rapid Response card glow animated
  box-shadow every frame; it is now a ready-drawn inset ring on `::after` pulsing with opacity. All 8 tests pass.
- H (done) Report staging. The report builds top to bottom: the nurse pops up (spring), the headline and parade
  rise in, the six stat tiles follow 45 ms apart, then the room card, badges and buttons; earned stars stamp in
  after the room card (scale 2 → 1 with a twist, 120 ms apart). Score and XP tiles roll up from 0 (`FX.countUp`
  gained a formatter and a delay). Fade on soft, nothing on Calm. Floating "+100" texts are cleared when the screen
  changes (the last answer's float used to drift over the report). All 8 tests pass.
- I (done) Boss arena. The nurse winds up (leans back, then forward) before the throw; the projectile follows a
  smooth arc sampled from a curve (three keyframes made a kinked path) and spins; on impact the Superbug flashes,
  squashes and is knocked back, then wobbles back into shape. The HP bar and number now change when the blow lands
  (they changed at Submit, before the throw). The explanation panel (and its scroll) waits 640 ms in the arena when
  you hit (`bossFeedbackDelayMs`), because the scroll moved the page under the flying projectile so it hit empty
  space. The Superbug breathes while idle (secondary action). All 8 tests pass.
- J (done) Patient gags. Several swings were "alternate" between two extremes, so they snapped to the first pose
  when they started, and those with an odd count ended mid-swing and snapped back to rest. wh-bob, wh-wave,
  wh-wobble, pp-wave and wh-blow now start and end at rest and swing out in the middle (one cycle replaces two
  alternate iterations, same total time). Dance, party, dizzy, the theme-room hand wave, the blower and the
  low-score parade wave use them. Other gags already started and ended at rest (checked every keyframe).
- K (done) Flow check: walk in / step in / grow-from-room / walk back checked frame by frame at landscape 1180x820,
  portrait 820x1180 (both door sides) and phone 390x844; reduce-motion levels covered by tests/motion.mjs.
  Not changed (noted): at phone width the corridor is narrower than the nurse, so she overlaps the room cards'
  edges while walking (as before).
- Animation checklist A–K complete. Next: ways to make the game more engaging (see ROADMAP.md / this log).
- Engagement 1 (R29): goal-gradient nudges. Streak band shows pips toward the next multiplier (3/6/10 from
  CONFIG.scoring) and says "N more for ×M" to screen readers; the newly earned pip pops, and reaching a new
  multiplier makes the band jump with a floating "×2!". Room cards on the floor show "N to ★/★★/★★★" (right-once
  counts for stars 1–2, mastered for star 3, from CONFIG.mastery). The patient that reaches today's goal gets a
  toast + a small confetti burst (once a day: answered === target). Report: "New personal best!" tag on Best streak
  when the round beat the all-time best (≥3). Checked at 1180x820 and 390x844; all 8 tests pass.
- ROADMAP: R28 (animation pass) and R29 (engagement) added as in progress (on the session branch, waiting for the
  user before main).
- Engagement 2 (R29): the floor nurse suggests a room. `Engine.suggestRoom()`: the room with the most missed
  patients who can be discharged today (right on an earlier day, so one right answer today sends them home), else
  the started room furthest behind on stars; none for a brand-new player. Ready discharges are always mentioned;
  otherwise she points at the weak room 60% of the time (`CONFIG.talk.suggestChance`) and shares a tip the rest.
  The suggested room glows (ready-drawn inset ring, opacity pulse; still on Calm). `Engine.nextStarNeed()` is shared
  with the room cards' "N to ★". Missed patients from earlier days already get the highest pick weight (4.5) in a
  shift. All 8 tests pass.
- Engagement 3 (R29): room stars are celebrated when earned. `Run.submit` compares the room's stars before and after
  recording the answer (`c.starUp`); the chart plays the badge sound and toasts "Room 107 Ortho: ★ earned!". Back on
  the floor, stars earned since it was last shown stamp onto the room card (scale 2.6 → 1 with a twist, after the
  walk back starts). Checked by seeding a room one answer short of ★. All 8 tests pass.
- Engagement 4 (R29): sound and urgency. The right-answer chime climbs a major scale with the streak (`Sound.right`,
  8 steps, resets on a miss). Code Blue's last 5 seconds tick: the number turns red, jumps and beeps once a second
  (`CONFIG.codeBlue.urgentSeconds`). All 8 tests pass.
- Locker room: changing an item makes the nurse do a quick squash-and-stretch "ta-da" in the new look (feedback for
  the change; she used to just swap); tapping a locked item shakes it "no" before the toast (skipped on soft/calm).
  All 8 tests pass.
- Fix: during the walk back from a room the hidden Code Blue / OR buttons could still be tapped; they are now
  untappable until they pop back in. tests/motion.mjs gained a "walk back" case (she starts at the room's door, ends
  at the station, the button is blocked during and works after). All 8 tests pass.
- Portrait/phone floor: the nurse is drawn 64x79 (was 84x104) so she fits the 64 px corridor instead of spilling
  over the room cards while she walks. Checked at 390x844. All 8 tests pass.
- Room buttons' screen-reader labels now include "N more right/mastered for the next star" and "Suggested by your
  nurse" on the suggested room. All 8 tests pass.
- tests/motion.mjs: added a Code Blue play-through in soft, calm and full (answer marks, feedback, auto-advance,
  the last-seconds tick, report fully shown at the end, no page errors). Passed 3 runs in a row.
- Settings: the highlight in each segmented control (Sound, Motion, Silly patients, Text size, Daily target) now
  slides to the new choice (FLIP: `slidePill` in 60-screens.js puts a pill where the old choice was, animates it to
  the new one in 240 ms, then the new button takes over; skipped on soft/calm). It used to jump. All 8 tests pass.
