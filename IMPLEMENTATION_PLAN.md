# Implementation Plan

## Status

- Planning iterations: 2 (re-verified: codebase still scaffold-only; plan unchanged)
- Build iterations: 2
- Last updated: 2026-11-08

## Gap Analysis (summary)

Only the scaffold exists: `src/core/loop.ts` (`FixedStepper`, tested) and `src/main.ts` (placeholder three.js
plane + sphere, empty physics step). No `src/physics`, `src/rules`, `src/render`, input, audio, or storage code.
Existing e2e: load, canvas fills viewport, no console errors; visual snapshots exist only for win32 (CI needs Linux baselines).
Every spec requirement is unimplemented.

## Architectural Decisions

- Coordinates: table space is 2D, x right, y toward the player (down-screen), units are metres-ish (ball radius ~0.027 scaled
  to table units chosen in the first task). Three.js maps table (x, y) to world (x, z) on a plane tilted for the camera only.
- `src/physics` and `src/rules` import neither three.js nor DOM. Rules never import physics; they share only typed
  event/command types in a small `src/core` module (e.g. `events.ts`).
- Physics `World.step(dt)` is pure given state + input; no `Math.random`/`Date.now` (use a seeded PRNG if needed) for determinism.
- Physics emits events to a typed queue drained by main; main feeds them to rules; rules emit commands
  (lamp/score/display/sound/solenoid like `kickBall`, `lockBall`, `addBall`) that main routes to render/audio/physics.
- Table definition (`src/table`) is typed data consumed by both physics (build colliders) and render (build meshes).
  Add `@table/*` and `@rules/*` aliases to tsconfig, vite, and vitest configs when first needed; update CLAUDE.md alias list.
- Knip flags unused exports: each task must wire what it adds (or export only what tests/consumers use).
- Scripted ramp/orbit: physics detects entry trigger, then ball follows a path (spline of points at set speed) ignoring
  playfield collisions, then is released at exit with velocity; emits entered/exited events.
- Each task = one iteration: includes unit tests and passes `npm run check` + `npm run test:run`.
- After tasks touching rendering, run `npm run test:e2e`; do not hand-edit snapshot baselines.

## Tasks

### Phase 1: physics-feel

- [x] Add `src/physics` skeleton: vec2 helpers, `Ball` state, `World` with `step(dt)`, gravity along tilt angle (default 6.5°, configurable), no collisions yet; test free-fall/incline acceleration (spec: physics-feel.md)
- [x] Typed physics event queue (`PhysicsEvent` union: bumperHit, targetHit, spinnerSpin, slingshot, drain, etc.) with push/drain API; types in shared module (spec: physics-feel.md)
- [x] Material constants per surface type (restitution, friction, rolling damping) in a `materials` module, exposed as mutable tuning params (spec: physics-feel.md)
- [x] Swept circle-vs-segment collision with restitution response; test wall bounce restitution (spec: physics-feel.md)
- [x] Swept circle-vs-arc (and endpoint/corner) collision; test curved guide, no tunnelling at 10x speed against segments and arcs (spec: physics-feel.md)
- [x] Friction and rolling damping applied on contact/surface; sub-stepping/TOI loop for multiple contacts per step (spec: physics-feel.md)
- [x] Determinism test: two `World` runs with identical input sequences give identical positions (spec: physics-feel.md)
- [x] Flipper as rotating capsule: rest/up angles, swing-up speed, hold, angular velocity tracked per step (spec: physics-feel.md)
- [x] Flipper collision response using contact-point velocity from angular velocity; test resting ball flicked faster when flipper swings (spec: physics-feel.md)
- [x] Flipper behaviours: cradle/trap (hold ball while raised, no jitter) and flick-pass (flipper-end release); tests for each (spec: physics-feel.md)
- [x] Plunger: variable pull strength, release impulse onto ball in lane (spec: physics-feel.md)
- [x] Pop bumpers (radial kick + event), slingshots (kick along normal + event), standup targets, spinner (angular velocity + spin events) as collision elements (spec: physics-feel.md) — split into 2 iterations if large
- [x] Nudge (left/right/up) as brief table impulse on ball(s), nudge counter with decay, tilt event after repeated nudges (spec: physics-feel.md)
- [x] Wire physics into `main.ts` step loop with a temporary sandbox playfield (two flippers, plunger, walls, one bumper), keyboard flipper/plunger controls so ball can be plunged, played, drained (spec: physics-feel.md)
- [x] Debug overlay + tuning panel (hidden, toggled by key) with live sliders for flipper strength, restitution, friction, tilt angle (spec: physics-feel.md)
- [x] Simple circle-circle ball-ball collision for multiball (spec: physics-feel.md)

### Phase 2: table-layout

- [x] Typed table definition (`src/table`): walls, flippers, bumpers, targets, lanes, spinner, plunger lane, drain, lamps with unique ids (spec: table-layout.md)
- [x] Table validation tests: unique ids, no flipper/wall overlap, all elements inside bounds (spec: table-layout.md)
- [x] Author the playfield: 2 flippers, inlanes/outlanes, slingshots, 3 pop bumpers, target bank(s), spinner, plunger lane (spec: table-layout.md)
- [x] Physics builds colliders from table definition; replace sandbox playfield in main (spec: table-layout.md)
- [x] Scripted paths: orbit and ramp (entry trigger, path points, exit position/velocity, events); unit test enter/exit points (spec: table-layout.md)
- [x] `src/render` scene builder from table definition: playfield, walls, chrome rails, bumpers, targets, flippers synced to physics state (spec: table-layout.md)
- [x] Shared geometry/material cache for repeated parts (spec: table-layout.md)
- [x] Retro look: neon palette on dark playfield, emissive inserts, environment-map chrome ball, bloom post-processing (spec: table-layout.md)
- [x] Lamp system: lamp ids from table, API on/off/flash (pure state + render binding); unit test for flash timing (spec: table-layout.md)
- [x] Backglass mesh (placeholder texture until DMD exists) (spec: table-layout.md)
- [x] Responsive fixed camera: portrait mobile vs landscape desktop framing (spec: table-layout.md)
- [x] Performance pass: pixel ratio cap, bloom cost on mobile, draw-call check (spec: table-layout.md)
- [x] Update Playwright visual snapshots for mobile and desktop; note Linux baselines must come from CI (spec: table-layout.md)

### Phase 3: game-rules

- [x] `src/rules` skeleton: typed input events and output commands (lamp, score, display, sound, kickBall, addBall), headless engine with `handle(event)` returning commands; alias `@rules/*` (spec: game-rules.md)
- [x] Game flow state machine: attract, start, plunger lane, play, drain, bonus count, next ball / game over (3 balls); test (spec: game-rules.md)
- [x] Scoring: bumper/target/spinner/ramp/orbit values, bonus multiplier, extra ball; tests (spec: game-rules.md)
- [x] Ball save (timed after launch) and tilt handling (ball lost, bonus forfeited); tests (spec: game-rules.md)
- [x] Mode system framework: missions started by shot sequences, timers, progress persisted across balls (spec: game-rules.md)
- [x] Mission 1: Bumper Rush (3 target hits qualify, 10 bumper hits in 30s) with unit test (spec: game-rules.md)
- [x] Mission 2 (add to `src/rules/missions.ts`), with unit test (spec: game-rules.md)
- [x] Mission 3 (add to `src/rules/missions.ts`), with unit test (spec: game-rules.md)
- [x] Combo shots for chained orbit/ramp hits (spec: game-rules.md)
- [x] Multiball (2-3 balls) start/end, jackpot, super-jackpot; tests (spec: game-rules.md)
- [x] Wizard mode unlocked by completing all missions; test (spec: game-rules.md)
- [x] Scripted full-game test with no browser (spec: game-rules.md)
- [x] Wire rules into main: physics events in, commands out to lamps/physics (spec: game-rules.md)

### Phase 2b: table-rework (priority: do BEFORE remaining Phase 4 tasks)

Feedback: physics feel is great, but the table is small and has no artwork. Replace the "Neon Orbit" placeholder with a
full-size table modelled on a proven classic: **Gottlieb _Black Knight_ (1980)** - two-level playfield, upper flipper,
3 pop bumpers, drop-target banks, spinner, outlane/inlane lanes, orbit loops, multiball. Keep the layout geometry and
shot flow of the original (a tried and tested design); make all artwork, name and theme ORIGINAL (portfolio: no copied
Gottlieb art/trademarks). Working title: "Neon Knight". Physics/rules code must stay unchanged unless a task says so.

Sizing rule: real playfield is ~20.25" x 42" (~514 x 1067 mm) with a 27 mm ball, so the table must be ~19 ball
diameters wide and ~40 tall. Today it is ~9.6 wide (0.52 vs ball radius 0.027): roughly half scale. Fix by growing the
table (not shrinking the ball) so flipper length, lane widths and shot gaps match real proportions (flipper ~2.8 ball
diameters, outlane/inlane gap ~1.5 balls, lane guides 2-3 balls wide).

- [x] Write `specs/table-neon-knight.md`: reference-layout analysis (zones, shot list, lane/target/bumper counts, upper-playfield flow, plunger lane, dimensions in ball diameters), mapped onto our element types; list any new element types needed (upper flipper, magnet-less magna-save substitute, drop-target bank, kickout saucer) (spec: table-layout.md)
- [x] Rescale: set real-proportion bounds and ball radius ratio, scale all existing elements, retune flipper dimensions, plunger travel and camera framing; physics tests still pass, add a table-proportion test (ball diameters across, flipper length) (spec: table-layout.md)
- [x] New element types in `src/table` + physics: drop-target bank (reset on clear), kickout saucer/hole with eject, second-level (upper) playfield flipper; validation + unit tests (spec: table-layout.md)
- [x] Author the full-size lower playfield: flippers, inlanes/outlanes, slingshots, return lanes, side-lane guides, target banks (spec: table-layout.md)
- [x] Author the upper playfield and orbits: 3 pop bumpers cluster, top lanes/rollovers, upper flipper, spinner, loop/ramp paths updated to new coordinates (spec: table-layout.md)
- [x] Re-map rules to the new layout: shot values, mission qualifiers, multiball lock (saucer), wizard unlock; rules tests and scripted full-game test updated (spec: game-rules.md)
- [x] Playfield artwork: procedural/canvas texture generated in code (no binary assets): themed illustration zones, inserts/arrows/lane graphics, rubber and plastic ramps; lamp inserts aligned to artwork (spec: table-layout.md)
- [x] 3D dressing: raised posts, plastic guides, ramp meshes with chrome rails, apron and lane-guide art, cabinet/side rails, backglass artwork for the new theme (spec: table-layout.md)
- [x] Camera and mobile framing for the taller table (portrait fills screen, landscape scrolls/zooms vertically with ball follow), perf recheck of draw calls and bloom; 3D dressing raised the mesh count to ~114 (budget test now 130): merge static dressing/wall bars by material to bring it back down (spec: table-layout.md)
- [x] Refresh Playwright visual snapshots and tuning-panel defaults for the new table; playtest notes in the plan (spec: table-layout.md)
    - Playtest notes: win32 baselines regenerated (chromium + mobile-chrome); Linux baselines still must come from CI.
      Tuning defaults (flipper ~55 rad/s, restitution/friction scale 1, tilt 6.5°) sit mid-range on the sliders; a test now
      guards this. No hands-on playtest was possible in this headless loop, so feel on the full-size table is unverified by a human.

### Phase 4: presentation

- [x] Dot-matrix display renderer to canvas texture (score, ball, mode text), applied to backglass (spec: presentation.md)
- [x] DMD animations: jackpot, multiball, extra ball (spec: presentation.md)
- [x] Input layer: abstract actions + keyboard mapping (shift/arrows, space plunger); unit tests (spec: presentation.md)
- [x] Touch zones mapping + mobile portrait large touch areas (spec: presentation.md)
- [x] Gamepad mapping with rumble where available; unit test with mocked gamepad (spec: presentation.md)
- [x] Accelerometer nudge with iOS permission via user gesture (spec: presentation.md)
- [x] Playwright interaction test: flipper key and touch zone both trigger flipper action (spec: presentation.md)
- [x] Procedural WebAudio sfx (flipper, bumper, slingshot, target, spinner, drain), unlock-on-first-gesture, mute toggle (spec: presentation.md)
- [x] Chiptune-style music (spec: presentation.md)
- [x] High-score storage (localStorage top 10, injectable storage) with unit tests (spec: presentation.md)
- [x] Initials entry UI on game over (spec: presentation.md)
- [ ] Attract mode: idle demo play and high-score screen (spec: presentation.md)
- [ ] Pause on tab hide; verify no console errors on mobile-chrome and chromium (spec: presentation.md)
- [ ] Deploy/CI check: Linux Playwright baselines, README update (spec: presentation.md)

## Completed

- [x] Project scaffold: Vite, TypeScript, three.js, lint/test/e2e tooling, fixed-step loop (`src/core/loop.ts`)

## Notes

- Phase order: physics-feel, table-layout, game-rules, table-rework (2b), presentation (remaining tasks).
- The Phase 2 "Author the playfield" task produced a small placeholder; Phase 2b supersedes it.
- Existing `main.ts` placeholder scene (plane + sphere) should be replaced, not extended, by task "Physics builds colliders".
- Tuning panel (physics-feel) is the first debug UI; keep it dependency-free DOM, not a library, unless a build iteration decides otherwise.
