# Table Layout

## Overview

One original, polished retro 70s/80s arcade table with a three.js scene that reads clearly from a fixed top-down-ish camera.

## User Stories

- As a player, I want a table with interesting shots so that I have goals beyond keeping the ball alive.
- As a viewer, I want a striking retro look so that the table is memorable.

## Requirements

- [ ] Data-driven table definition (typed TS) describing walls, flippers, bumpers, targets, lanes, spinner, plunger lane, drain
- [ ] Playfield with two flippers, inlanes/outlanes, slingshots, three pop bumpers, drop or standup target banks, a spinner, and a plunger lane
- [ ] At least one orbit and one ramp implemented as scripted ball paths (entry trigger, path, exit) rather than height simulation
- [ ] three.js scene built from the table definition: playfield, walls, chrome rails, emissive inserts, backglass
- [ ] Retro look: neon palette on a dark playfield, bloom, environment-map chrome ball
- [ ] Fixed top-down-ish camera, responsive for portrait mobile and landscape desktop
- [ ] Insert lights (lamps) controllable by id so rules can turn them on, off, or flash them
- [ ] Parts reuse geometry/materials; 60 fps on a mid-range phone

## Acceptance Criteria

- [ ] Table definition validates in tests (no overlapping flippers/walls, all ids unique)
- [ ] Playwright visual snapshots exist for mobile and desktop
- [ ] Orbit and ramp paths are exercised by a unit test (ball enters, exits at the expected point)
- [ ] `npm run check`, `npm run test:run` and `npm run test:e2e` pass

## Out of Scope

- Multiple tables
- Real 3D ball height / airborne shots
- Recreating licensed machines
