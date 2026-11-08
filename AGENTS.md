# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Build Commands

```bash
npm run build          # Typecheck + production build
npm run dev            # Vite dev server (http://localhost:5173)
```

## Test Commands

```bash
npm run test:run       # Vitest once (unit tests, headless)
npm run test:e2e       # Playwright: mobile-chrome + chromium
```

## Validation (run before finishing a task)

```bash
npm run check          # typecheck + lint + format:check + knip
npm run test:run       # unit tests
```

Run `npm run format` if format:check fails. Run `npm run test:e2e` when the task changes rendering or input.

## Project Notes

- Goal: polished original retro-arcade pinball table; physics feel is the differentiator.
- Path aliases: `@/*`, `@core/*`, `@physics/*`, `@render/*`.
- Simulation (src/physics, src/rules) is fixed-timestep, deterministic, and must not import three.js.
- Rules engine consumes physics events; it never touches physics directly.
- Input layer maps keyboard, touch, gamepad, accelerometer to abstract actions.
- ESLint warns on `console`; avoid it. Knip flags unused exports/files, so only add what is used.
- Playwright snapshots are per-platform; do not hand-edit baselines.
- Commits: loop.sh auto-commits each iteration; do not commit yourself.
