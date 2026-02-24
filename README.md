# Hyperbrowser UI Components

TypeScript-first React component package scaffold with:

- Dual outputs: ESM and CommonJS
- Generated TypeScript declarations
- Minimal dependency surface
- Browser-based visual test harness for manual component checks

## Project layout

- `src/`: Component source files and public exports.
- `scripts/`: Build/support scripts.
- `tests/visual/`: Manual visual harness and scenarios.

## Commands

- `npm run typecheck`: Validate TypeScript.
- `npm run build`: Build ESM, CJS, and declaration outputs.
- `npm run test:visual`: Build package and start visual harness server.

## Publishing behavior

`package.json` exports map supports both import styles:

- ESM: `import { ... } from '@hyperbrowser/ui-components'`
- CJS: `const ui = require('@hyperbrowser/ui-components')`
