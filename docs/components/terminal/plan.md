# Terminal Component Plan

## Goal

Build a React terminal component in this repo that works with the Hyperbrowser sandbox PTY protocol, while keeping the terminal UI layer reusable and decoupled from Hyperbrowser-specific transport and auth details.

## Summary

The terminal should be built in two layers:

1. A generic xterm.js-based terminal UI layer.
2. A Hyperbrowser-specific PTY wrapper that implements the generic connection interface using the existing sandbox PTY endpoints.

This split keeps the terminal rendering reusable and isolates all protocol, runtime auth, and regional-proxy behavior in one adapter layer.

## Why xterm.js

xterm.js is still the best fit for this project.

Reasons:

- It is built for real PTY-driven terminals, not just log viewers.
- It already handles terminal semantics that a custom UI should not reimplement.
- It supports theming, font control, cursor styling, selection colors, transparency options, and addon-based resizing.
- It lets us keep the UI layer focused on React lifecycle and styling while the transport wrapper handles the sandbox protocol.

Implementation note:

- Use `@xterm/xterm` directly.
- Use `@xterm/addon-fit` for layout and resize support.
- Do not make the generic terminal layer depend on Hyperbrowser runtime URLs, tokens, or PTY endpoint knowledge.

## Existing PTY API Coverage

The current sandbox PTY endpoints are sufficient for the terminal itself. We do not need more PTY primitives for v1.

Existing endpoints:

- `POST /sandbox/pty`
- `GET /sandbox/pty/{id}`
- `POST /sandbox/pty/{id}/wait`
- `POST /sandbox/pty/{id}/kill`
- `POST /sandbox/pty/{id}/resize`
- `GET /sandbox/pty/{id}/ws`

Current websocket message model:

- client sends `input`
- client sends `resize`
- server emits `output`
- server emits `exit`

Important wire details:

- PTY output chunks are base64 encoded.
- PTY output carries sequence numbers.
- The websocket attach path supports `cursor` replay on reconnect.

Conclusion:

- The terminal blocker is not missing PTY runtime functionality.
- The blocker is browser-safe auth and cross-origin access through `regional-proxy`.

## Proposed Architecture

### Layer 1: Generic Terminal UI

Responsibility:

- Own xterm.js lifecycle.
- Render the terminal surface.
- Apply themes and styling.
- Handle fit and resize observation.
- Forward keyboard input to an abstract session object.
- Display output and exit state.

This layer should not know about:

- Hyperbrowser session tokens
- regional-proxy
- runtime bootstrap flows
- `/sandbox/pty` routes
- cookie/bootstrap auth

Suggested exports:

- `TerminalSurface`
- `useTerminalEmulator`
- `TerminalConnection` types
- `TerminalTheme`

Suggested interface:

```ts
export type TerminalConnection = {
  connect(params: { cols: number; rows: number }): Promise<TerminalSession>;
};

export type TerminalSession = {
  writeInput(data: string | Uint8Array): void | Promise<void>;
  resize(params: { cols: number; rows: number }): void | Promise<void>;
  close(): void | Promise<void>;
  onOutput(listener: (data: Uint8Array) => void): () => void;
  onExit(
    listener: (event: { exitCode?: number; error?: string }) => void,
  ): () => void;
  onStatus?(listener: (status: unknown) => void): () => void;
};
```

Suggested component props:

- `connection`
- `theme`
- `className`
- `style`
- `fontFamily`
- `fontSize`
- `autoFocus`
- `readOnly`
- `onReady`
- `onExit`
- `onConnectionError`

### Layer 2: Hyperbrowser PTY Wrapper

Responsibility:

- Implement `TerminalConnection`.
- Create PTYs using `/sandbox/pty`.
- Attach to `/sandbox/pty/{id}/ws`.
- Send `input` and `resize` messages.
- Decode base64 output.
- Handle reconnect and replay using `cursor`.
- Handle browser auth bootstrap against `regional-proxy`.

Suggested exports:

- `createHyperbrowserPtyConnection`
- `HyperbrowserTerminal`
- `useSandboxTerminalConnection`

Suggested wrapper props:

```ts
export type HyperbrowserTerminalProps = {
  runtimeBaseUrl: string;
  authMode: "cookie_bootstrap" | "bearer";
  bootstrapUrl?: string;
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  initialCols?: number;
  initialRows?: number;
  theme?: TerminalTheme;
  className?: string;
  style?: React.CSSProperties;
  onExit?: (event: { exitCode?: number; error?: string }) => void;
  onConnectionError?: (message: string) => void;
};
```

## Planned File Layout

```text
src/components/terminal/TerminalSurface.tsx
src/components/terminal/useTerminalEmulator.ts
src/components/terminal/terminal-theme.ts
src/components/terminal/types.ts

src/components/hyperbrowser/HyperbrowserTerminal.tsx
src/components/hyperbrowser/hyperbrowser-pty-connection.ts
src/components/hyperbrowser/hyperbrowser-runtime-auth.ts
```

Also required:

- package exports for the generic terminal layer
- package exports for the Hyperbrowser wrapper
- package CSS export for terminal styles and theme variables

## Styling and Themes

The terminal should be fully styleable.

Base design:

- Expose theme presets plus custom theme overrides.
- Use CSS variables for shell chrome, panel backgrounds, border colors, typography, and spacing.
- Keep xterm theme tokens separate from outer container styling.

The generic layer should support:

- foreground/background/cursor/selection colors
- font family and font size
- line height and letter spacing if needed
- optional transparency
- custom container chrome around the xterm surface

The Hyperbrowser wrapper should not hardcode the visual treatment.

## Browser Auth and Regional Proxy Plan

### Problem

The current browser blocker is not PTY behavior. It is browser auth on the runtime host.

Current state:

- Exposed ports already have a browser bootstrap flow through `/_hb/auth`.
- Receiver/runtime routes currently expect `Authorization` bearer auth.
- Browser WebSockets cannot attach custom `Authorization` headers.

### Required Fix

Add a browser-safe PTY auth flow on the runtime host.

Proposed model:

1. Browser requests a runtime bootstrap endpoint on the runtime host.
2. Proxy reads the request `Origin`.
3. Proxy verifies that origin is allowed for the customer/session.
4. Proxy mints a short-lived signed JWT and stores it in an `HttpOnly` cookie.
5. JWT includes:
   - session binding
   - PTY-only scope
   - allowed origin claim
   - short expiry
   - optional PTY id binding if we want tighter scoping later
6. Later PTY HTTP requests and websocket upgrades:
   - validate the cookie JWT
   - require request `Origin`
   - require `request Origin === jwt.allowedOrigin`
   - allow the cookie only on `/sandbox/pty*`

### CORS Model

This should use exact-origin credentialed CORS, not wildcard CORS.

Required behavior for PTY HTTP routes:

- `Access-Control-Allow-Origin: <exact allowed origin>`
- `Access-Control-Allow-Credentials: true`
- `Vary: Origin`

Additional security requirements:

- Do not use `*`.
- Do not accept the cookie on non-PTY receiver routes.
- Validate websocket `Origin` too.
- Fail closed when `Origin` is missing on browser-cookie-authenticated PTY requests.

### Why This Is Secure

This is secure if all of the following are true:

- cookie JWT is short-lived
- cookie is `HttpOnly` and `Secure`
- scope is PTY-only, not full runtime
- exact origin matching is enforced server-side
- CORS is exact-origin only
- websocket origin is validated
- state-changing operations remain non-GET

This is not “open CORS”. It is constrained per-origin browser auth.

## Comparison With Existing CLI Implementation

The existing `hb connect` implementation already provides the transport behaviors the browser wrapper should copy.

Relevant CLI areas:

- PTY command defaults and env setup
- PTY create retry
- websocket attach and reconnect
- cursor replay
- batched stdin writes
- resize syncing
- final cleanup with kill/wait
- runtime token/detail refresh

### CLI Behaviors To Carry Over

From `cli/internal/cli/terminal.go` and `cli/internal/hb/runtime.go`, the browser wrapper should preserve:

- PTY creation retry for transient startup failures
- default PTY env such as `TERM=xterm-256color`
- initial resize sync immediately after websocket connection
- input batching instead of one websocket message per keystroke
- reconnect with `cursor` replay
- final cleanup through `kill` and `wait`
- runtime/bootstrap refresh behavior when credentials are close to expiry

### CLI Behaviors That Do Not Apply In Browser

- raw TTY mode
- Unix signal handling
- `/dev/tty` fallback logic
- direct stdout writes

### Browser-Specific Concerns The CLI Does Not Solve

- xterm rendering and themeing
- React lifecycle
- CSS export strategy
- browser auth bootstrap
- CORS
- websocket origin enforcement
- browser clipboard/focus behavior

## Browser Wrapper Checklist Based on CLI Parity

The Hyperbrowser wrapper should explicitly implement:

- create retry
- initial resize sync
- input batching
- reconnect with replay cursor
- non-zero exit handling
- close/unmount cleanup policy
- auth/bootstrap refresh strategy

Without these, the browser version will be visibly weaker than `hb connect`.

## Implementation Phases

### Phase 1: Generic Terminal UI

- Add generic terminal types.
- Add xterm-based `TerminalSurface`.
- Add theme support and CSS variables.
- Add a mock connection implementation for visual testing without a backend.

### Phase 2: Hyperbrowser PTY Wrapper

- Add PTY connection adapter for local/direct receiver flows.
- Use existing PTY endpoints and websocket protocol.
- Add visual test scenario using a mock or local runtime.

### Phase 3: Browser Auth Through Regional Proxy

- Add PTY-scoped browser bootstrap endpoint.
- Add PTY-only cookie auth in `regional-proxy`.
- Add exact-origin credentialed CORS for PTY HTTP routes.
- Add websocket `Origin` checks.

### Phase 4: Integration Hardening

- Add reconnect and replay support.
- Add auth refresh behavior.
- Add unmount/close semantics.
- Add error, reconnecting, and terminated UI states.

## Open Decisions

- Whether to bind the browser auth cookie to a PTY id or only to the session and PTY route scope.
- Whether PTY creation should happen in the browser or via a control-plane assisted flow from the app backend.
- Whether close should remain `POST /kill` or also be available as a websocket control message.
- How package CSS should be exported in this library, since the current build only ships JS and types.

## Acceptance Criteria

The design is complete when:

- the generic terminal layer can run against a mock connection without Hyperbrowser dependencies
- the Hyperbrowser wrapper can attach to the current PTY endpoints
- browser access works through `regional-proxy` using PTY-scoped cookie auth
- reconnect with output replay works
- terminal styling can be fully customized through theme props and CSS variables
- the browser terminal is not materially worse than `hb connect` for core PTY behavior
