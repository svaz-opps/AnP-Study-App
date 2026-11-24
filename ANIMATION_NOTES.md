# Animation notes (overnight pass, 2026-11-24)

Principles gathered from Disney's 12 principles (as applied to UI by IxDF / IBM), Material motion, Apple HIG
Motion + Reduce Motion guidance, NN/g on duration, and design-system motion pages (Atlassian, Carbon, Fluent).
These are what the pass checks every animation against.

## The rules this app follows
1. **Every animation has a job**: show where something came from / went (continuity), confirm an action (feedback),
   or draw the eye to what changed (attention). Decoration is fine in the whimsy layer, never in the way of a tap.
2. **Nothing teleports.** If an object changes place, it moves there (or crossfades when motion is reduced).
   An object that disappears goes *somewhere* (into the thing that caused it, or off the way it came).
3. **Easing**: nothing linear except constant loops (spinners, marching). Entrances decelerate (ease-out),
   exits accelerate (ease-in), moves on screen use ease-in-out. Overshoot ("spring") only for small playful pops.
   Tokens live in `00-tokens.css` (`--ease-out`, `--ease-in`, `--ease-move`, `--ease-spring`).
4. **Duration**: taps/micro feedback 80–150 ms; small UI (bubbles, toasts, buttons) 150–250 ms; panels and
   screens 250–400 ms; travel scales with distance; big celebrations may run longer but never block input.
   Exits ~20–30% faster than entrances. Nothing a player waits on runs over ~500 ms.
5. **Physical believability for characters**: feet shouldn't slide (step rate matches travel speed),
   anticipation before a move, follow-through/settle after it, arcs not straight lines for hops.
6. **One thing at a time / staging**: stagger groups (30–60 ms per item) instead of popping all at once;
   don't let two big motions compete.
7. **Performance**: animate only `transform` and `opacity` (no width/top/left/box-shadow per frame), so iPad
   Safari stays at 60 fps.
8. **Reduced motion means *different*, not *none*** (Apple): with the device's Reduce Motion on and the game on
   Motion "Auto", keep feedback and character animation, but swap big travel/zoom/shake for crossfades.
   The game's own "Calm" setting is the one that stills things. "Full" ignores the device setting entirely.
9. **Interruptible**: a new animation on the same element replaces the old one cleanly; nothing leaves an
   element stuck half-way (always end on the real state).

## Audit checklist (status in PROJECT_LOG.md, "Overnight animation pass")
- [x] A. Motion levels: full / soft (device Reduce Motion on Auto) / calm. Replace every `@media (prefers-reduced-motion)` rule with the game's own level so "Full" really is full.
- [x] B. Easing + duration tokens; move every animation onto them; exits faster than entrances.
- [ ] C. Floor: walk cycle matches speed (no foot sliding), anticipation + settle, nurse goes *into* the room.
- [ ] D. Screen changes: continuity (floor → room zoom from the tapped room, back out to the floor).
- [ ] E. Chart: option press, submit, right/wrong feedback, lives lost, streak, score float, Next patient.
- [ ] F. Progress bars: animate with transform, not width.
- [ ] G. Modals, toasts, banners: entrance/exit pairs, exit faster.
- [ ] H. Report card / rank-up / confetti: staging and stagger.
- [ ] I. Boss arena: hit/heal anticipation and follow-through.
- [ ] J. Whimsy layer: check each patient gag for linear/odd timing.
- [ ] K. Check every flow frame by frame at landscape + portrait, with and without reduce-motion.
