# Roadmap

One line per goal. Goals keep their number forever (new goals get the next number, nothing is renumbered).
Details live in the linked files: [design plan](game/PLAN.md) · [project log](PROJECT_LOG.md) · [branch workflow](BRANCHING.md).

Status: ✅ done · 🔨 in progress · ⬜ to do · ⏸ on hold

## Open

| ID | Goal | Status | Notes |
|---|---|---|---|
| R10 | "Ask a colleague" becomes a true 50/50 | ⬜ | Today it removes half the *wrong* options rounded down (1 of 3 on a 4-option question). Should leave the right answer + one wrong. Decide what it does on SATA / ordering. |
| R11 | Memory trick + ATI tip on the 232 study-guide questions | ⬜ | Only the 273 new questions have their own trick and tip; guide questions show section tips and a generic tip per question type. Biggest content job left. |
| R12 | More "needs further teaching" and "see first" questions | ⬜ | 23 teaching + 17 priority of 505 (~8% together); the plan aimed for ~10% each. |
| R13 | Real-device check on iPad and phone | ⬜ | Tests only run in desktop Chromium at iPad sizes and 375 px. Check tap feel, text size, rotation, and whether Safari keeps saved progress for the downloaded file. |
| R14 | Fully tap-only onboarding | ⬜ | The nurse name is the one typed field (it can be skipped). Option: pick a name from a list, or keep typing as optional. |
| R15 | More med-math questions | ⬜ | 7 now (A&P-relevant: rule of nines, pH, mg dosing…). Optional. |
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
