# Visual Tests

This folder is for manual visual verification of UI components.

## Layout

- `harness/`: Browser runner UI and scenario registry.
- `scenarios/`: One file per visual scenario.
- `scripts/`: Optional helper scripts for visual test setup/fixtures.

## Run

1. Install dependencies for this package.
2. Run `npm run test:visual`.
3. Open the printed local URL in a browser and select the scenario to inspect. The harness runs on Vite and supports JSX in local visual files. The default dev server port is `3000` unless overridden via `PORT`.

## Add a new scenario

1. Create a new scenario file in `scenarios/`.
2. Import and register it in `harness/registry.jsx`.
3. Use exported components from `dist/esm/index.js` inside that scenario.

## Included scenarios

- `smoke.example.jsx`: Validates package exports are discoverable.
- `terminal-primitives.scenario.jsx`: Manual test surface for `BaseTerminal` and `useTerminal` with customer-owned shell chrome.
- `hyperbrowser-terminal.scenario.jsx`: Manual test surface for `HyperbrowserTerminal` plus the custom-shell path using `useSandboxTerminalConnection` and `useTerminal`.
- `hyperbrowser-vnc-viewer.scenario.jsx`: Interactive manual test for `HyperbrowserVncViewer`.
- `hyperbrowser-hls-playback.scenario.jsx`: Interactive manual test for `useHyperbrowserHlsPlayback`.
