# Physics Feel

## Overview

A custom 2D solver on a tilted plane makes the ball and flippers feel as good as a real machine.

## User Stories

- As a player, I want flippers that respond instantly and flick the ball with believable strength so that shots are skill-based.
- As a player, I want to nudge the table so that I can save a ball, with a tilt penalty if I overdo it.
- As a developer, I want live tuning sliders so that I can dial in the feel.

## Requirements

- [ ] Headless simulation in `src/physics` with no three.js imports; fixed timestep (target 1000 Hz) via `FixedStepper`
- [ ] Ball as a circle with gravity along the table tilt angle (configurable, default ~6.5 degrees)
- [ ] Swept (continuous) collision against line segments and arcs so the ball never tunnels at high speed
- [ ] Flippers as rotating capsules; collision response includes flipper angular velocity at the contact point
- [ ] Flipper behaviours: rest/up angles, fast swing up, hold, cradle/trap, flick-pass
- [ ] Plunger with variable pull strength and release
- [ ] Pop bumpers (kick), slingshots, standup targets and a spinner as collision elements emitting events
- [ ] Material constants (restitution, friction, rolling damping) per surface type
- [ ] Nudge (left/right/up) applies a brief table impulse; tilt triggers after repeated nudges
- [ ] Deterministic: identical inputs produce identical ball paths
- [ ] Physics events (hit target, bumper, drain) exposed to consumers via a typed event queue
- [ ] Debug overlay and tuning panel with live sliders (flipper strength, restitution, friction, tilt angle)

## Acceptance Criteria

- [ ] Unit tests: ball bounces off a wall with correct restitution; does not tunnel at 10x normal speed
- [ ] Unit tests: a ball resting on a raised flipper is flicked with greater speed when the flipper swings
- [ ] Unit tests: two runs with the same input sequence give identical positions
- [ ] Ball can be plunged, played with both flippers, and drained in the browser
- [ ] `npm run check` and `npm run test:run` pass

## Out of Scope

- 3D height simulation (ramps are scripted paths, see table-layout)
- Multi-ball collision beyond simple circle-circle
