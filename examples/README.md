# Hyperbrowser UI SDK Smoke App

Simple manual smoke app for `@hyperbrowser/ui`, based on the package visual smoke scenarios.

## What it tests

- `useHyperbrowserHlsPlayback` with session-scoped token auth
- `HyperbrowserVncViewer` connection/rendering and key options

## Run locally

1. Build the local SDK package:

```bash
cd ../hb-ui-components
npm run build
```

2. Install and run this smoke app:

```bash
cd ../hb-ui-sdk-smoke
npm install
npm run dev
```

3. Open the printed local URL (default `http://localhost:5177`).

## Notes

- This app depends on the local SDK via `"@hyperbrowser/ui": "file:../hb-ui-components"`.
- Use real session IDs/tokens and connect URLs from your environment.
