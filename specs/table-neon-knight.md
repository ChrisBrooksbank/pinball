# Table: Neon Knight

## Overview

Replaces the half-scale "Neon Orbit" placeholder with a full-size table whose layout and shot flow follow a proven classic
(Gottlieb _Black Knight_, 1980: two-level playfield, upper flipper, 3 pop bumpers, drop-target banks, spinner, orbit loops,
multiball). Only the geometry and shot flow are borrowed; the name, theme, artwork and text are original ("Neon Knight":
a neon-lit arcade knight). No copied art or trademarks.

## Dimensions (units: ball diameters, D = 2 x ballRadius)

Ball radius stays 0.027 m (D = 0.054 m); the table grows by a uniform factor of ~2 so proportions match a real machine.

| Item                       | Real (D)     | Target (D) | Metres                      |
| -------------------------- | ------------ | ---------- | --------------------------- |
| Playfield width            | ~19          | 19         | 1.03 (`bounds.width`)       |
| Playfield height           | ~40          | 40         | 2.16 (`bounds.height`)      |
| Flipper length (pivot-tip) | ~2.8         | 2.8        | ~0.15 (base 0.03, tip 0.02) |
| Inlane / outlane gap       | ~1.5         | 1.5        | ~0.08                       |
| Lane guide channel width   | 2-3          | 2.5        | ~0.135                      |
| Flipper gap at rest (tips) | ~2.2         | 2.2        | ~0.12                       |
| Plunger lane width         | ~1.6         | 1.6        | ~0.09                       |
| Pop bumper diameter        | ~2.7         | 2.7        | radius ~0.073               |
| Drain opening              | between tips | 2.2        | ~0.12                       |

Simplest implementation: scale existing coordinates by S = 2, then adjust individual parts to the table above. The tilt
angle, materials, flipper angular speeds (rad/s) and plunger speeds stay unchanged (they are scale-free or tuned in m/s);
flipper `swingUpSpeed` should be re-verified so tip speed (= omega x length) still feels right after lengthening.

Coordinate frame is unchanged: x right, y toward the player, origin top-left of the playfield, plunger lane on the right.

## Zones and flow

1. **Plunger lane** (right edge): ball launched up the right side, around the top arch onto the upper playfield.
2. **Upper playfield** (y 0-0.9 of the height, top ~40%): 3 pop bumpers in a triangle cluster, 3 top rollover lanes (A-B-C)
   under the arch, a spinner on the right side lane, and an **upper flipper** on the left feeding the left orbit / bumpers.
3. **Mid playfield**: two drop-target banks (left bank of 3, right bank of 3), a **kickout saucer** (lock/mission hole) at
   the centre-left, standup target pair near the saucer.
4. **Orbits**: left orbit and right orbit loops that go over the top and return down the opposite side lane; a centre ramp
   from the lower playfield to the upper playfield. All are scripted paths (existing `ScriptedPathDef`).
5. **Lower playfield**: two main flippers, two slingshots, two inlanes + two outlanes with return-lane guides, apron, drain.

## Element counts (target)

| Element          | Count | Notes                                                                    |
| ---------------- | ----- | ------------------------------------------------------------------------ |
| Main flippers    | 2     | existing                                                                 |
| Upper flipper    | 1     | NEW; same physics as flipper, own input binding (shares left button)     |
| Pop bumpers      | 3     | triangle cluster upper playfield                                         |
| Slingshots       | 2     | above inlanes                                                            |
| Inlanes/outlanes | 2 + 2 | existing `LaneDef`                                                       |
| Top rollovers    | 3     | `LaneDef` kind `rollover`                                                |
| Drop targets     | 2x3   | NEW: banks; reset when a bank is cleared                                 |
| Standup targets  | 2     | existing `TargetDef`                                                     |
| Spinner          | 1     | existing                                                                 |
| Kickout saucer   | 1     | NEW; captures ball, holds, ejects                                        |
| Orbits           | 2     | scripted paths; left and right                                           |
| Ramp             | 1     | scripted path, centre                                                    |
| Lamps            | ~30   | one per lane/target/bank/saucer/bumper/shot arrow, unique ids `lamp-...` |

## New element types (to add in `src/table` + `src/physics`)

- **Drop-target bank** (`DropTargetBankDef`): ordered segments each with `id`, `a`, `b`, `lampId`. A hit drops the target
  (collider removed, `dropTargetHit` event); when all are down a `dropBankCleared` event fires and the bank resets after a
  short delay (configurable) with a `dropBankReset` event.
- **Kickout saucer** (`SaucerDef`): circular hole (`center`, `radius`). A ball entering slowly enough is captured (collider
  disabled, `saucerCapture` event); `eject(angle, speed)` after a delay releases it with an impulse (`saucerEject`).
  Used for lock / mission start; rules decide when to eject through a `kickBall`-style command.
- **Upper flipper**: a regular `FlipperDef` with `level: 'upper'`; no new physics, only a table field so input and render can
  bind/draw it. Made optional (`level?`) so existing tables validate unchanged.
- **Magna-save substitute**: no magnets. Instead a short-lived "save post" (a movable wall segment between the main flippers
  /outlane that rises for ~2 s on command) used by rules as the ball-save effect. Out of scope for the first iteration of the
  rework; the rules ball-save already covers the gameplay need.

## Rules mapping (consumed by the re-map task)

- Drop bank cleared: bonus advance + qualifies Mission 1 (replaces the current 3-standup qualifier).
- Saucer: lock a ball (multiball lock 1-3) or start the qualified mission; ejects after a short DMD animation.
- Orbit combos, ramp, spinner values: keep existing values; ramp lights the saucer lock.
- Wizard unlock and mission set unchanged.

## Validation requirements

- All existing validation tests pass for the new table (unique ids, in bounds, flippers clear of walls).
- New tests: bounds ~19 x 40 ball diameters (+-5%), flipper length ~2.8 D (+-10%), drop banks and saucer inside bounds,
  scripted paths start inside the entry trigger and stay inside bounds.

## Out of Scope

- Reproducing the original machine's art, sounds, rules text or name.
- Real ball height; ramps remain scripted paths.
- Magnets.
