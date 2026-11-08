# Game Rules

## Overview

A full pinball rule set implemented as a headless state machine that reacts to physics events and drives lamps and scoring.

## User Stories

- As a player, I want clear goals and modes so that each ball feels different and rewarding.
- As a player, I want multiball and a wizard mode so that there is a climactic payoff.

## Requirements

- [ ] Rules engine in `src/rules`, headless, no three.js imports; consumes typed physics events and emits lamp, score, display and sound commands
- [ ] Game flow: attract, start, ball in plunger lane, play, drain, bonus count, next ball or game over (3 balls)
- [ ] Scoring with bumper, target, spinner, ramp and orbit values, a bonus multiplier and an extra ball
- [ ] Ball save (timed after launch) and tilt handling (ball lost, bonus forfeited)
- [ ] Mode system: at least three missions started by completing shot sequences, with timers and progress carried across balls
- [ ] Combo shots for chained orbit/ramp hits
- [ ] Multiball (2 or 3 balls) with jackpot and super-jackpot
- [ ] Wizard mode unlocked by completing all missions
- [ ] Rules are data-plus-code and fully unit-testable by feeding event sequences and asserting score, lamps and mode state

## Acceptance Criteria

- [ ] Unit tests cover: game flow, ball save, tilt, each mission, multiball start/end, wizard unlock
- [ ] Rules engine runs a scripted full game in a test with no browser
- [ ] `npm run check` and `npm run test:run` pass

## Out of Scope

- Online leaderboards
- Multiplayer turns (single player only)
