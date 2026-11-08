# CLAUDE.md

## Project Overview

Retro 70s/80s arcade pinball in the browser (portfolio showpiece). One polished original table.
Differentiator: physics feel. Targets: desktop keyboard, mobile touch + tilt nudge, gamepad.

## Development Commands

```bash
npm run dev            # Vite dev server (http://localhost:5173)
npm run build          # Typecheck + production build
npm run test:run       # Vitest once
npm run test:e2e       # Playwright (mobile-chrome, chromium)
npm run check          # typecheck + lint + format:check + knip
```

## Architecture

- Path aliases: `@/*`, `@core/*`, `@physics/*`, `@render/*`, `@rules/*`.
- Simulation is a fixed timestep (1000 Hz target), independent of rendering, and must not import
  three.js, so it can be unit tested headless and stays deterministic.
- Custom 2D solver on a tilted plane: swept (continuous) ball collision, flippers as rotating
  capsules whose angular velocity feeds the collision response.
- Rules engine is a state machine that consumes physics events; it never touches physics directly.
- Input layer maps keyboard, touch, gamepad, accelerometer to abstract actions.

## Phases

1. Feel sandbox (solver, flippers, plunger, bumpers, tuning panel)
2. Table layout + three.js scene
3. Rules and scoring
4. Presentation (DMD, procedural WebAudio, attract mode)
5. Platform polish (mobile, gamepad, high scores, deploy)

## Notes

- Use `console` sparingly (ESLint warns); prefer a tuning panel/overlay for runtime inspection.
- Playwright snapshot baselines are per-platform; commit them from the platform CI uses (Linux).
