# Presentation

## Overview

Sound, the dot-matrix display, attract mode, input and persistence make the table feel like a finished arcade machine on every platform.

## User Stories

- As a player, I want punchy sound and a dot-matrix display so that the machine feels alive.
- As a mobile player, I want touch flippers and tilt-to-nudge so that I can play on a phone.
- As a gamepad player, I want trigger flippers so that it feels like a console game.

## Requirements

- [ ] Dot-matrix display rendered to a canvas texture: score, ball number, mode text, and animations (jackpot, multiball, extra ball)
- [ ] Procedural WebAudio sound effects (flipper, bumper, slingshot, target, spinner, drain) and simple chiptune-style music, with an unlock-on-first-gesture flow and mute toggle
- [ ] Attract mode: idle demo play and a high-score screen
- [ ] Local high scores saved in localStorage (top 10, initials entry)
- [ ] Input layer mapping keyboard (shift/arrow keys, space for plunger), touch zones, gamepad triggers (with rumble where available) and device accelerometer for nudge (iOS permission via user gesture) to abstract actions
- [ ] Debug/tuning panel toggled by a key, hidden by default
- [ ] Mobile portrait layout with large touch areas; pause on tab hide

## Acceptance Criteria

- [ ] Unit tests for high-score storage and input mapping (with storage and gamepad mocked)
- [ ] Playwright interaction test: pressing the flipper key and touching the flipper zone both trigger the flipper action
- [ ] No console errors on load on mobile-chrome and chromium
- [ ] `npm run check`, `npm run test:run` and `npm run test:e2e` pass

## Out of Scope

- Sampled audio assets and licensed music
- WebXR
- Accounts or server-side storage
