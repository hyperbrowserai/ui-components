# Hyperbrowser UI Components

TypeScript-first React component package scaffold with:

- Dual outputs: ESM and CommonJS
- Generated TypeScript declarations
- Minimal dependency surface
- Browser-based visual test harness for manual component checks
- Reusable Hyperbrowser HLS playback hook for native `<video>` consumers

## Project layout

- `src/`: Component source files and public exports.
- `scripts/`: Build/support scripts.
- `tests/visual/`: Manual visual harness and scenarios.

## Commands

- `npm run typecheck`: Validate TypeScript.
- `npm run build`: Build ESM, CJS, and declaration outputs.
- `npm run test:visual`: Build package and start visual harness server.

## VNC component usage

`HyperbrowserVncViewer` renders a noVNC viewer using a Hyperbrowser session token and
connect base URL.

```tsx
import { HyperbrowserVncViewer } from "@hyperbrowser/ui-components";

export function SessionLiveView({
  token,
  connectUrl,
}: {
  token: string;
  connectUrl: string;
}) {
  return (
    <HyperbrowserVncViewer
      token={token}
      connectUrl={connectUrl}
      height={560}
      rewriteCmdAsCtrl
      useComputerActionClipboard
      onConnectionError={(message) => {
        console.error("VNC connection error:", message);
      }}
    />
  );
}
```

Notes:

- Required props: `token`, `connectUrl`.
- `rewriteCmdAsCtrl` remaps macOS command shortcuts to control for the remote session.
- `useComputerActionClipboard` routes copy/paste through computer actions.
- `disableFocusOnConnect` can be used to prevent automatic VNC keyboard focus.

## HLS hook usage

`useHyperbrowserHlsPlayback` is designed as an MP4-compatible integration path:
you still render your own `<video>` element and the hook wires source loading.

```tsx
import { useRef } from "react";
import { useHyperbrowserHlsPlayback } from "@hyperbrowser/ui-components";

export function SessionVideo({
  sessionId,
  sessionToken,
}: {
  sessionId: string;
  sessionToken: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { reloadSource, sourceError, isHlsSource } = useHyperbrowserHlsPlayback({
    videoRef,
    sourceType: "hls",
    sessionId,
    sessionToken,
    apiBaseUrl: "https://api.hyperbrowser.ai",
  });

  return (
    <>
      <video ref={videoRef} controls playsInline preload="auto" />
      {sourceError ? <p>{sourceError}</p> : null}
      <button type="button" onClick={reloadSource}>
        Reload
      </button>
      <p>{isHlsSource ? "HLS" : "Non-HLS"}</p>
    </>
  );
}
```

Notes:

- HLS mode requires both `sessionId` and `sessionToken`.
- HLS mode does not require an explicit playlist URL.
- The hook rewrites requests to:
  `https://api.hyperbrowser.ai/api/session/{sessionId}/video-playlist.m3u8`
  and
  `https://api.hyperbrowser.ai/api/session/{sessionId}/video-segment/{assetName}`.
- Requests use `Authorization: <sessionToken>` and omit credential cookies.
- `source` is optional and only needed for non-HLS (for example MP4 playback).

## Publishing behavior

`package.json` exports map supports both import styles:

- ESM: `import { ... } from '@hyperbrowser/ui-components'`
- CJS: `const ui = require('@hyperbrowser/ui-components')`
