# Implementation Plan

## Status

- Planning iterations: 2 (re-verified: codebase still scaffold-only; plan unchanged)
- Build iterations: 1
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
- [ ] Game flow state machine: attract, start, plunger lane, play, drain, bonus count, next ball / game over (3 balls); test (spec: game-rules.md)
- [ ] Scoring: bumper/target/spinner/ramp/orbit values, bonus multiplier, extra ball; tests (spec: game-rules.md)
- [ ] Ball save (timed after launch) and tilt handling (ball lost, bonus forfeited); tests (spec: game-rules.md)
- [ ] Mode system framework: missions started by shot sequences, timers, progress persisted across balls (spec: game-rules.md)
- [ ] Mission 1, 2, 3 (one iteration each), each with unit test (spec: game-rules.md)
- [ ] Combo shots for chained orbit/ramp hits (spec: game-rules.md)
- [ ] Multiball (2-3 balls) start/end, jackpot, super-jackpot; tests (spec: game-rules.md)
- [ ] Wizard mode unlocked by completing all missions; test (spec: game-rules.md)
- [ ] Scripted full-game test with no browser (spec: game-rules.md)
- [ ] Wire rules into main: physics events in, commands out to lamps/physics (spec: game-rules.md)

### Phase 4: presentation

- [ ] Dot-matrix display renderer to canvas texture (score, ball, mode text), applied to backglass (spec: presentation.md)
- [ ] DMD animations: jackpot, multiball, extra ball (spec: presentation.md)
- [ ] Input layer: abstract actions + keyboard mapping (shift/arrows, space plunger); unit tests (spec: presentation.md)
- [ ] Touch zones mapping + mobile portrait large touch areas (spec: presentation.md)
- [ ] Gamepad mapping with rumble where available; unit test with mocked gamepad (spec: presentation.md)
- [ ] Accelerometer nudge with iOS permission via user gesture (spec: presentation.md)
- [ ] Playwright interaction test: flipper key and touch zone both trigger flipper action (spec: presentation.md)
- [ ] Procedural WebAudio sfx (flipper, bumper, slingshot, target, spinner, drain), unlock-on-first-gesture, mute toggle (spec: presentation.md)
- [ ] Chiptune-style music (spec: presentation.md)
- [ ] High-score storage (localStorage top 10, injectable storage) with unit tests (spec: presentation.md)
- [ ] Initials entry UI on game over (spec: presentation.md)
- [ ] Attract mode: idle demo play and high-score screen (spec: presentation.md)
- [ ] Pause on tab hide; verify no console errors on mobile-chrome and chromium (spec: presentation.md)
- [ ] Deploy/CI check: Linux Playwright baselines, README update (spec: presentation.md)

## Completed

- [x] Project scaffold: Vite, TypeScript, three.js, lint/test/e2e tooling, fixed-step loop (`src/core/loop.ts`)

## Notes

- Phase order: physics-feel, table-layout, game-rules, presentation.
- Existing `main.ts` placeholder scene (plane + sphere) should be replaced, not extended, by task "Physics builds colliders".
- Tuning panel (physics-feel) is the first debug UI; keep it dependency-free DOM, not a library, unless a build iteration decides otherwise.
