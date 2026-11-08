# Table Layout

## Overview

One polished retro 70s/80s arcade table with a three.js scene that reads clearly from a fixed camera. The layout geometry and shot flow follow a proven classic (Gottlieb Black Knight, 1980: two-level playfield, upper flipper, 3 pop bumpers, drop-target banks, spinner, orbits, multiball); the name ("Neon Knight"), theme and all artwork are original.

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

- [ ] Real proportions: table ~19 ball diameters wide and ~40 tall (20.25" x 42" with a 27 mm ball); flipper ~2.8 ball diameters, inlane/outlane gap ~1.5 balls
- [ ] Upper playfield with its own flipper, plus a kickout saucer and drop-target bank element types
- [ ] Playfield artwork generated procedurally in code (canvas textures, no copied or binary assets): themed illustration, insert graphics, lane/arrow art, backglass

## Acceptance Criteria

- [ ] A table-proportion test asserts width/height in ball diameters and flipper length

- [ ] Table definition validates in tests (no overlapping flippers/walls, all ids unique)
- [ ] Playwright visual snapshots exist for mobile and desktop
- [ ] Orbit and ramp paths are exercised by a unit test (ball enters, exits at the expected point)
- [ ] `npm run check`, `npm run test:run` and `npm run test:e2e` pass

## Out of Scope

- Multiple tables
- Real 3D ball height / airborne shots
- Copying a licensed machine's artwork, name, trademarks or audio (layout geometry and shot flow only are borrowed)
