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
├── main.ts        # entry: three.js scene + game loop
├── core/          # fixed-timestep loop and shared primitives
├── physics/       # (planned) custom 2D solver
└── render/        # (planned) table scene, DMD, effects
e2e/               # Playwright visual + interaction tests
```
