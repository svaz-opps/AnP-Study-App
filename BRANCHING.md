# Branches

| Branch | What lives there |
|---|---|
| `main` | The most up-to-date, working version of the app. Always safe to play. |
| `beta` | Testing ground for features that could cause major bugs. |

Goals are tracked as R1, R2, … in [ROADMAP.md](ROADMAP.md). Update it whenever a goal is added or finished.

Workflow
1. Small, safe fixes can go straight to `main`.
2. Anything risky is committed to `beta` first.
3. Run `python3 game/build.py --strict`, `node game/tests/smoke.mjs`, `node game/tests/hot.mjs` and `node game/tests/autosave.mjs` on `beta`.
4. Commit the rebuilt `game/dist/ward-rounds.html` too (that is the file you download).
5. When they pass (and it plays right), merge `beta` into `main`, then bring `beta` back level with `main`.
