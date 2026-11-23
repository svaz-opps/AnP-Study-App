# Roadmap

One line per goal. Goals keep their number forever (new goals get the next number, nothing is renumbered).
Details live in the linked files: [design plan](game/PLAN.md) · [project log](PROJECT_LOG.md) · [branch workflow](BRANCHING.md).

Status: ✅ done · 🔨 in progress · ⬜ to do · ⏸ on hold

## Open

| ID | Goal | Status | Notes |
|---|---|---|---|
| R13 | Real-device check on iPad and phone | ⏸ | Tests only run in desktop Chromium at iPad sizes and 375 px. Check tap feel, text size, rotation, and whether Safari keeps saved progress for the downloaded file. |
| R14 | Fully tap-only onboarding | ⏸ | The nurse name is the one typed field (it can be skipped). Option: pick a name from a list, or keep typing as optional. |
| R16 | Update the online (claude.ai) game page | ⏸ | On hold at the user's request; the downloadable file on `main` is the current version. |

## Done

| ID | Goal | Status | Notes |
|---|---|---|---|
| R1 | Searchable index of the BIOL 2401 final study guide | ✅ | `study-guide/` (chapters, glossary, key terms, practice exam, figures). |
| R2 | Game design plan and build pipeline | ✅ | `game/PLAN.md`, `game/build.py` (validates content, enforces 239/239 focus points). |
| R3 | First playable game: floor, chart, all modes and screens | ✅ | Shifts, Code Blue, boss, exam simulation, missed-patient review, lifelines, XP/ranks, badges, locker, settings. |
| R4 | Complete question bank | ✅ | 505 questions in 12 rooms; every instructor focus point covered; every item has a "why". |
| R5 | Polish pass and balance tuning | ✅ | Layout/contrast fixes, boss unlock tuning, hot-reload restore test. |
| R6 | `main` + `beta` branch workflow | ✅ | Risky work goes to `beta`, gets tested, then merges into `main`. |
| R7 | Submit button on every question | ✅ | Tapping only selects; nothing is graded until Submit. |
| R8 | Downloadable game file in the repo | ✅ | `game/dist/ward-rounds.html` on `main`, rebuilt with each change. |
| R9 | Autosave rounds in progress | ✅ | Resume / Discard prompt on launch; `game/tests/autosave.mjs`. |
| R10 | "Ask a colleague" is a true 50/50 | ✅ | Single-answer: the right answer + one wrong stay. SATA: half the wrong options go (rounded up). Ordering: first step placed. Greyed out when there is nothing to remove. `game/tests/lifeline.mjs`. |
| R11 | Memory trick + ATI tip on all 232 study-guide questions | ✅ | `game/content/guide-extras/`; `build.py --strict` fails if any guide question lacks one. |
| R12 | More "needs further teaching" and "see first" questions | ✅ | +32 teaching and +29 priority (then 55 and 46 of 575). |
| R15 | More med-math questions | ✅ | +9 (now 16): atoms/ions, pH, rule of nines, tablet dosing, % solution, membrane potential, ATP yield. |
| R17 | "See first" questions up to 10% | ✅ | +14 priority (`x-r17-priority.json`): 60 of 589 = 10.2%. Teaching is 55 (9.3%). |
| R18 | Accuracy review of all learning material | ✅ | Read all 589 questions (stems, every option, wrong-option reasons, explanations, tricks, tips), the 26 guide tips and the game's own teaching text. 15 fixes, no wrong answer keys. Details in the project log. |
| R20 | Silly patient reactions | ✅ | Patients react to each answer: streaks of 3/6/10/15 unlock sillier tiers (thumbs-up → dance → backflip → bed wheelie), and misses in a row escalate the chaos (hair poof → bed rolls away → IV pole topples). Patient card only, ≤1.5 s, "Silly patients" setting (Full/Mild/Off), calm motion shows poses only. `game/tests/whimsy.mjs`. |
| R21 | Room-themed patients + discharge parade | ✅ | Each room's patients carry a prop (goggles, cast in traction, eye patch…) that joins in on hot streaks. The report screen has a parade of the round's patients; it gets sillier with the score (waves → conga → hats → nurse crowd-surf at 100%). |
| R22 | Shift events + daily challenge | ✅ | 1 shift in 4: Rapid Response (2 questions from other rooms, due/fading items first; ×2, no life lost), a visitor's bonus question, or a power outage (×1.5). Cross-room recall % on the report card. Daily challenge: 5 fixed patients a day with its own streak; unlocks party hat (3 days) and rubber-duck scrubs (7). |
| R23 | Thank-you card collection | ✅ | A discharged missed patient leaves a card (pun + the fact behind the question), shown under the explanation and kept in the Get-well cards album. Badges at 10/25/50. |
| R19 | Remove answer-length cues | ✅ | 19 questions reworded so the right answer no longer stands out by length (15 MCQ + 4 priority). `build.py --strict` now fails if a right answer is more than 1.8× the longest wrong one. |
