# Pinball

Retro 70s/80s arcade pinball in the browser. TypeScript, Vite, three.js, with a custom 2D physics
solver tuned for feel.

## Getting Started

```bash
npm install
npx playwright install chromium
npm run dev
```

## Scripts

| Command                     | Description                      |
| --------------------------- | -------------------------------- |
| `npm run dev`               | Start development server         |
| `npm run build`             | Production build                 |
| `npm run test:run`          | Run unit tests once              |
| `npm run test:e2e`          | Playwright (mobile + desktop)    |
| `npm run lint` / `lint:fix` | ESLint                           |
| `npm run format`            | Prettier                         |
| `npm run typecheck`         | TypeScript check                 |
| `npm run knip`              | Find unused code                 |
| `npm run check`             | typecheck + lint + format + knip |

## Layout

```
src/
├── main.ts        # entry: wiring of scene, physics, rules, input, audio
├── core/          # fixed-timestep loop, lamps, events, attract, high scores
├── physics/       # custom 2D swept-collision solver (headless, deterministic)
├── rules/         # game state machine, scoring, missions, multiball
├── table/         # typed table definition shared by physics and render
├── render/        # three.js scene, artwork, DMD, post-processing
├── input/         # keyboard, touch, gamepad, accelerometer
└── audio/         # procedural WebAudio sfx and music
e2e/               # Playwright visual + interaction tests
```

## Deployment and CI

- `ci.yml` runs typecheck, lint, format, knip, unit tests and Playwright on every push/PR.
- `deploy.yml` builds and publishes `dist/` to GitHub Pages on push to `main`
  (enable Pages with source "GitHub Actions" in repo settings). The build uses a relative base, so it works under any subpath.
- Visual snapshot baselines are per-platform. Committed baselines are `win32`; CI needs `linux` ones. Run the
  **Update Linux snapshots** workflow (Actions tab), download the `linux-snapshots` artifact, copy the PNGs into
  `e2e/visual.spec.ts-snapshots/` and commit them.
