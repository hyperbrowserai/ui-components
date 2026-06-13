# Hyperbrowser UI Components

TypeScript-first React component package scaffold with:

- Dual outputs: ESM and CommonJS
- Generated TypeScript declarations
- Minimal dependency surface
- Browser-based visual test harness for manual component checks
- Browser-based sandbox terminal primitives
- Reusable Hyperbrowser HLS playback hook for native `<video>` consumers

## Project layout

- `src/`: Component source files and public exports.
- `scripts/`: Build/support scripts.
- `tests/visual/`: Manual visual harness and scenarios.

## Commands

- `npm run typecheck`: Validate TypeScript.
- `npm run build`: Build ESM, CJS, and declaration outputs.
- `npm run test:visual`: Start the visual harness server.

## Sandbox terminal usage

The public terminal path is built from three pieces:

- `useSandboxTerminalConnection(...)`: creates a Hyperbrowser-backed terminal connection
- `BaseTerminal`: renders a ready-to-use xterm viewport
- `useTerminal(...)`: lower-level hook when you want to own the surrounding shell chrome

Import the packaged stylesheet once in your app entrypoint:

```tsx
import "@hyperbrowser/ui/styles.css";
```

The package also exposes `@hyperbrowser/ui/terminal-core.css` and
`@hyperbrowser/ui/terminal.css` if you want a narrower stylesheet.

### Backend auth contract

Your frontend should not embed a long-lived Hyperbrowser API key.
Instead, your backend should use its server-side credentials to return a short-lived
runtime auth payload:

```json
{
  "bootstrapUrl": "https://sandbox.region.hyperbrowser.run/_hb/runtime-auth?grant=..."
}
```

The runtime origin is derived from that bootstrap URL.

`useSandboxTerminalConnection(...)` uses that payload to:

- call `bootstrapUrl`
- let the browser store the runtime cookie from `Set-Cookie`
- create the PTY session
- connect the runtime websocket

### Basic `BaseTerminal` example

This is the simplest customer-facing terminal setup.

```tsx
import { useCallback } from "react";
import {
  BaseTerminal,
  type HyperbrowserPtyBrowserAuthParams,
  useSandboxTerminalConnection,
} from "@hyperbrowser/ui";
import "@hyperbrowser/ui/styles.css";

export function SandboxTerminal({
  sandboxId,
}: {
  sandboxId: string;
}) {
  const getRuntimeBrowserAuth = useCallback(
    async ({
      browserAuthEndpoint,
      sandboxId: resolvedSandboxId,
      signal,
    }: HyperbrowserPtyBrowserAuthParams) => {
      if (!browserAuthEndpoint) {
        throw new Error("Sandbox terminal auth endpoint is unavailable.");
      }

      // requires hyperbrowser ai key, recommended as backend call
      const response = await fetch(browserAuthEndpoint, {
        method: "POST",
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to get terminal auth for sandbox ${resolvedSandboxId ?? sandboxId}.`,
        );
      }

      return response.json();
    },
    [sandboxId],
  );

  const connection = useSandboxTerminalConnection({
    getRuntimeBrowserAuth,
    sandboxId,
    command: "bash",
    cwd: "/workspace",
  });

  return (
    <BaseTerminal
      appearance="dark"
      autoFocus
      connection={connection}
      preset="graphite"
      style={{ height: 520 }}
    />
  );
}
```

### Custom shell with `useTerminal`

Use `useTerminal(...)` when you want to control the surrounding card, toolbar,
status text, and actions yourself.

```tsx
import { useCallback } from "react";
import {
  createTerminalTheme,
  type HyperbrowserPtyBrowserAuthParams,
  useSandboxTerminalConnection,
  useTerminal,
} from "@hyperbrowser/ui";
import "@hyperbrowser/ui/styles.css";

export function SandboxTerminalPanel({
  sandboxId,
}: {
  sandboxId: string;
}) {
  const getRuntimeBrowserAuth = useCallback(
    async ({
      browserAuthEndpoint,
      sandboxId: resolvedSandboxId,
      signal,
    }: HyperbrowserPtyBrowserAuthParams) => {
      if (!browserAuthEndpoint) {
        throw new Error("Sandbox terminal auth endpoint is unavailable.");
      }

      // requires hyperbrowser ai key, recommended as backend call
      const response = await fetch(browserAuthEndpoint, {
        method: "POST",
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to get terminal auth for sandbox ${resolvedSandboxId ?? sandboxId}.`,
        );
      }

      return response.json();
    },
    [sandboxId],
  );

  const connection = useSandboxTerminalConnection({
    getRuntimeBrowserAuth,
    sandboxId,
    command: "bash",
    cwd: "/workspace",
  });

  const terminalConfig = createTerminalTheme("breeze", {
    appearance: "dark",
    terminalTheme: {
      cursor: "#f8b84e",
      selectionBackground: "rgba(248, 184, 78, 0.18)",
    },
    terminalOptions: {
      fontSize: 13,
    },
  });

  const { errorMessage, status, terminal, viewportRef } = useTerminal({
    autoFocus: false,
    connection,
    ...terminalConfig,
  });

  return (
    <section className="terminal-panel">
      <header className="terminal-toolbar">
        <strong>Build Sandbox</strong>
        <div>
          <span>{status}</span>
          <button type="button" onClick={() => terminal?.focus()}>
            Focus
          </button>
        </div>
      </header>

      <div
        ref={viewportRef}
        className="hb-terminal-base"
        style={{ height: 520 }}
      />

      <footer>{errorMessage ?? "Connected terminal session."}</footer>
    </section>
  );
}
```

Notes:

- `BaseTerminal` already renders the terminal mount node for you.
- `useSandboxTerminalConnection(...)` should be given `sandboxId` for the standard customer path.
- `getRuntimeBrowserAuth(...)` receives `{ signal, sandboxId, browserAuthEndpoint }`.
- When `sandboxId` is provided to `useSandboxTerminalConnection(...)`, the hook passes the library-defined Hyperbrowser browser-auth endpoint for that sandbox.
- `apiBaseUrl` is an optional override for local development or staging. It only changes the base server URL; the browser-auth path suffix is still owned by the library.
- With `useTerminal(...)`, the element using `viewportRef` should include
`className="hb-terminal-base"` if you want the packaged base terminal layout styles.
- `status` is one of `idle`, `connecting`, `ready`, `closed`, or `error`.
- The hook returns the raw `xterm` instance as `terminal` for optional imperative
actions like `focus()`.

### Terminal theming

Terminal primitives support:

- `preset`: one of `basic`, `atlas`, `paper`, `ember`, `graphite`, `skyline`, `breeze`
- `appearance`: `"dark"` or `"light"`
- `terminalTheme`: partial `xterm` `ITheme` overrides
- `terminalOptions`: font and cursor options such as `fontFamily`, `fontSize`,
`cursorBlink`, and `cursorStyle`

You can also create a reusable spreadable config with `createTerminalTheme(...)`.

## Filesystem workspace usage

The public filesystem path is built from two layers:

- `HyperbrowserFileWorkspace`: ready-to-use Hyperbrowser-backed filesystem browser
- `FileWorkspace`: lower-level browser shell when you want to bring your own adapter

Import the packaged stylesheet once in your app entrypoint:

```tsx
import "@hyperbrowser/ui/styles.css";
```

### Basic `HyperbrowserFileWorkspace` example

```tsx
import { useCallback } from "react";
import {
  createFileWorkspaceTheme,
  HyperbrowserFileWorkspace,
  type HyperbrowserFilesystemBrowserAuthParams,
} from "@hyperbrowser/ui";
import "@hyperbrowser/ui/styles.css";

export function SandboxFiles({
  sandboxId,
}: {
  sandboxId: string;
}) {
  const getRuntimeBrowserAuth = useCallback(
    async ({
      browserAuthEndpoint,
      sandboxId: resolvedSandboxId,
      signal,
    }: HyperbrowserFilesystemBrowserAuthParams) => {
      if (!browserAuthEndpoint) {
        throw new Error("Sandbox filesystem auth endpoint is unavailable.");
      }

      const response = await fetch(browserAuthEndpoint, {
        method: "POST",
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to get filesystem auth for sandbox ${resolvedSandboxId ?? sandboxId}.`,
        );
      }

      return response.json();
    },
    [sandboxId],
  );

  const filesystemTheme = createFileWorkspaceTheme("basic", {
    appearance: "dark",
  });

  return (
    <HyperbrowserFileWorkspace
      {...filesystemTheme}
      getRuntimeBrowserAuth={getRuntimeBrowserAuth}
      sandboxId={sandboxId}
      style={{ minHeight: 720 }}
      title="Sandbox Files"
      workspacePath="/workspace"
    />
  );
}
```

Notes:

- `getRuntimeBrowserAuth(...)` receives `{ signal, sandboxId, browserAuthEndpoint }`.
- `sandboxId` is the standard customer path.
- `runtimeBaseUrl + bootstrapUrl` is also supported for already-bootstrapped runtime sessions.
- `apiBaseUrl` is only needed when you want the library to call the control-plane endpoint directly or when you need a non-default control-plane base.

### Filesystem theming

Filesystem theming supports:

- `preset`: one of `basic`, `atlas`, `ledger`
- `appearance`: `"dark"` or `"light"`
- `chromeTheme`: partial chrome overrides
- `editorTheme`: partial editor typography overrides

You can create a reusable spreadable config with `createFileWorkspaceTheme(...)`.

## VNC component usage

`HyperbrowserVncViewer` renders a noVNC viewer using a Hyperbrowser browser
token plus the live transport base URL.

```tsx
import { HyperbrowserVncViewer } from "@hyperbrowser/ui";

type BrowserSession = {
  token: string;
  liveDomain: string;
  computerActionEndpoint?: string;
};

export function SessionLiveView({ session }: { session: BrowserSession }) {
  return (
    <HyperbrowserVncViewer
      token={session.token}
      connectUrl={session.liveDomain}
      computerActionEndpoint={session.computerActionEndpoint}
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

- Required connection props: `token` and `connectUrl`.
- For session creation responses, pass `session.token` as `token` and
  `session.liveDomain` as `connectUrl`.
- Do not pass `session.liveUrl` as `connectUrl` for standard browser sessions.
  Standard `liveUrl` values point at the frontend `/live` page, not the
  session-proxy transport. The component rejects that `/live` route to avoid
  constructing websocket URLs on the frontend origin.
- `connectUrl` should be the live transport base, including any proxy path
  prefix. For example, pass
  `https://dp-...hxproxy.io/browser/<sessionId>/live/` when a regional live
  transport lives under that prefix. A full regional noVNC URL such as
  `.../vnc.html?path=/browser/<sessionId>/live/` is also accepted; the `path`
  query value is used as the live prefix.
- For regional-proxy origins without a path prefix, the component derives
  `/browser/<sessionId>/live/` from the JWT `sessionId` claim. Older
  session-proxy URLs keep the legacy root paths, such as `/websockify` and
  `/computer-action`.
- Regional-proxy VNC websockets connect to the live prefix itself, for example
  `wss://dp-...hxproxy.io/browser/<sessionId>/live/?token=...`; the component
  does not append `/websockify` for regional-proxy tokens.
- Regional-proxy websocket query parameters are treated as routing and auth
  only. VNC behavior such as autoconnect, view-only, scaling, clipping, and
  remote resize is applied through the wrapped VNC client props.
- `computerActionEndpoint` is optional. If provided, it is used for clipboard
  computer actions. If it includes its own `token` query parameter, that token
  must be scoped for computer actions. If it does not include a token, the live
  token is appended and must also be scoped for computer actions.
- Token checks are explicit. `aud: "regional-proxy"` requires `browser-live`
  for VNC and `browser-computer-action` for computer-action clipboard. `aud:
  "session-proxy"` requires `view` for VNC and `computer-action` for
  computer-action clipboard.
- `rewriteCmdAsCtrl` remaps macOS command shortcuts to control for the remote session.
- `useComputerActionClipboard` routes copy/paste through computer actions.
- `disableFocusOnConnect` can be used to prevent automatic VNC keyboard focus.

## HLS hook usage

`useHyperbrowserHlsPlayback` is designed as an MP4-compatible integration path:
you still render your own `<video>` element and the hook wires source loading.

```tsx
import { useRef } from "react";
import { useHyperbrowserHlsPlayback } from "@hyperbrowser/ui";

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

- HLS mode requires a session id plus a bearer token. You can pass those as
  `sessionId` and `sessionToken`. For session creation responses, use
  `session.id` and `session.token`.
- HLS mode does not require an explicit playlist URL.
- The hook rewrites requests to:
`https://api.hyperbrowser.ai/api/session/{sessionId}/video-playlist.m3u8`
and
`https://api.hyperbrowser.ai/api/session/{sessionId}/video-segment/{assetName}`.
- Requests made by the hook use `Authorization: Bearer <sessionToken>` and omit
  credential cookies. The server playback routes also accept the same token as
  a `token` query parameter for direct/manual playlist or segment requests.
- Standard browser playback tokens use `aud: "session-proxy"` with the `view`
  scope. Firecracker browser playback tokens use `aud: "regional-proxy"` with
  the `browser-live` scope. No additional Firecracker-specific permission is
  required.
- For manual Firecracker playlist checks, use either:
  `GET /api/session/{sessionId}/video-playlist.m3u8` with
  `Authorization: Bearer <session token>` or
  `GET /api/session/{sessionId}/video-playlist.m3u8?token=<session token>`.
- `source` is optional and only needed for non-HLS (for example MP4 playback).

## Publishing behavior

`package.json` exports map supports both import styles:

- ESM: `import { ... } from '@hyperbrowser/ui'`
- CJS: `const ui = require('@hyperbrowser/ui')`
