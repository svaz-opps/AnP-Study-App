# Branches

| Branch | What lives there |
|---|---|
| `main` | The most up-to-date, working version of the app. Always safe to play. |
| `beta` | Testing ground for features that could cause major bugs. |

Goals are tracked as R1, R2, … in [ROADMAP.md](ROADMAP.md). Update it whenever a goal is added or finished.

Workflow
1. Small, safe fixes can go straight to `main`.
2. Anything risky is committed to `beta` first.
3. Run `python3 game/build.py --strict`, `node game/tests/smoke.mjs`, `node game/tests/hot.mjs`, `node game/tests/autosave.mjs`, `node game/tests/lifeline.mjs`, `node game/tests/backup.mjs`, `node game/tests/whimsy.mjs`, `node game/tests/smooth.mjs` `node game/tests/motion.mjs` and `node game/tests/learning.mjs` on `beta`.
4. Commit the rebuilt `game/dist/ward-rounds.html` too (that is the file you download).
5. When they pass (and it plays right), merge `beta` into `main`, then bring `beta` back level with `main`.

Hosting
- Every push to `main` that changes `game/dist/ward-rounds.html` republishes the game to GitHub Pages
  (`.github/workflows/pages.yml`). Link: https://svaz-opps.github.io/AnP-Study-App/
- `beta` is not published, so test there freely.
- The Home Screen icon and manifest are in `game/web/` (icons drawn by `tools/make_app_icons.py`).

Tuning
- Every number you might want to change (lives, points, XP, ranks, star thresholds, boss, Code Blue, picking weights,
  badge thresholds, timings) is in `game/src/js/01-config.js`. Change it there, then rebuild with `python3 game/build.py --strict`.
