# Visual Tests

This folder is for manual visual verification of UI components.

## Layout

- `harness/`: Browser runner UI and scenario registry.
- `scenarios/`: One file per visual scenario.
- `scripts/`: Optional helper scripts for visual test setup/fixtures.

## Run

1. Install dependencies for this package.
2. Run `npm run test:visual`.
3. Open the printed local URL in a browser and select the scenario to inspect.

## Add a new scenario

1. Create a new scenario file in `scenarios/`.
2. Import and register it in `harness/registry.js`.
3. Use exported components from `dist/esm/index.js` inside that scenario.

## Included scenarios

- `smoke.example.js`: Validates package exports are discoverable.
- `hyperbrowser-vnc-viewer.scenario.js`: Interactive manual test for `HyperbrowserVncViewer`.
- `hyperbrowser-hls-playback.scenario.js`: Interactive manual test for `useHyperbrowserHlsPlayback`.
