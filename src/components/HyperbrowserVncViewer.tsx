import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { VncScreen, type VncScreenHandle } from "react-vnc";

const DEFAULT_VNC_PASSWORD = "vncpassword";
const DEFAULT_USERNAME = "admin";
const DEFAULT_TARGET = "vnc";
const DEFAULT_HEIGHT_PX = 560;
const DEFAULT_RETRY_DURATION = 2000;
const APPLE_PLATFORM_PATTERN = /(Mac|iPhone|iPad|iPod)/i;
const REGIONAL_PROXY_AUDIENCE = "regional-proxy";
const SESSION_PROXY_AUDIENCE = "session-proxy";
const REGIONAL_PROXY_LIVE_SCOPE = "browser-live";
const REGIONAL_PROXY_COMPUTER_ACTION_SCOPE = "browser-computer-action";
const SESSION_PROXY_LIVE_SCOPE = "view";
const SESSION_PROXY_COMPUTER_ACTION_SCOPE = "computer-action";

type TokenAudience =
  | typeof REGIONAL_PROXY_AUDIENCE
  | typeof SESSION_PROXY_AUDIENCE;

type BrowserTokenClaims = {
  audience: TokenAudience;
  sessionId: string | null;
  scopes: Set<string>;
};

type VncConnectionInput = {
  token?: string;
  connectUrl?: string;
};

type ComputerActionConnectionInput = VncConnectionInput & {
  computerActionEndpoint?: string;
};

type VncClientConfig = {
  autoConnect: boolean;
  clipViewport: boolean;
  dragViewport: boolean;
  resizeSession: boolean;
  scaleViewport: boolean;
};

type InternalRfbKeyboardController = {
  _keyboard?: {
    grab: () => void;
    ungrab: () => void;
  };
  _canvas?: HTMLCanvasElement | null;
  _screen?: HTMLDivElement | null;
  _updateClip?: () => void;
  _updateScale?: () => void;
};

type RewrittenKeyState = {
  key: string;
  code: string;
  location: number;
};

type HyperbrowserVncViewerConnectionProps = {
  token: string;
  connectUrl: string;
  computerActionEndpoint?: string;
};

type HyperbrowserVncViewerDisplayProps = {
  disableFocusOnConnect?: boolean;
  rewriteCmdAsCtrl?: boolean;
  useComputerActionClipboard?: boolean;
  debugClipboardFlow?: boolean;
  viewOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  height?: number | string;
  retryDuration?: number;
  vncPassword?: string;
  onConnect?: () => void;
  onConnectionError?: (message: string) => void;
};

export type HyperbrowserVncViewerProps =
  HyperbrowserVncViewerConnectionProps & HyperbrowserVncViewerDisplayProps;

function normalizeToUrl(
  rawValue: string,
  label: string = "connectUrl",
  allowedProtocols: Set<string> = new Set(["http:", "https:", "ws:", "wss:"])
): URL {
  const value = rawValue.trim();
  if (!value) {
    throw new Error(`Expected ${label} to be a non-empty string.`);
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)
    ? value
    : `https://${value}`;

  const parsed = new URL(withProtocol);
  if (!allowedProtocols.has(parsed.protocol)) {
    throw new Error(`Unsupported ${label} protocol: ${parsed.protocol}`);
  }

  return parsed;
}

function decodeBase64Url(value: string): string | null {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  try {
    if (typeof globalThis.atob === "function") {
      return globalThis.atob(padded);
    }

    const maybeBuffer = (
      globalThis as typeof globalThis & {
        Buffer?: {
          from: (
            value: string,
            encoding: "base64"
          ) => { toString: (encoding: "utf-8") => string };
        };
      }
    ).Buffer;
    if (maybeBuffer) {
      return maybeBuffer.from(padded, "base64").toString("utf-8");
    }
  } catch {
    return null;
  }

  return null;
}

function tokenAudiencesInclude(audience: unknown, expected: TokenAudience) {
  return typeof audience === "string"
    ? audience === expected
    : Array.isArray(audience) && audience.includes(expected);
}

function resolveTokenAudience(audience: unknown): TokenAudience {
  const matches: TokenAudience[] = [];
  if (tokenAudiencesInclude(audience, REGIONAL_PROXY_AUDIENCE)) {
    matches.push(REGIONAL_PROXY_AUDIENCE);
  }
  if (tokenAudiencesInclude(audience, SESSION_PROXY_AUDIENCE)) {
    matches.push(SESSION_PROXY_AUDIENCE);
  }

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new Error(
      `Browser token audience must be exactly one of "${REGIONAL_PROXY_AUDIENCE}" or "${SESSION_PROXY_AUDIENCE}".`
    );
  }

  throw new Error(
    `Browser token audience must be "${REGIONAL_PROXY_AUDIENCE}" or "${SESSION_PROXY_AUDIENCE}".`
  );
}

function parseTokenScopes(scope: unknown): Set<string> {
  if (typeof scope === "string") {
    return new Set(scope.split(/\s+/).filter(Boolean));
  }

  if (Array.isArray(scope)) {
    return new Set(
      scope.filter((value): value is string => typeof value === "string")
    );
  }

  return new Set();
}

function parseBrowserTokenClaims(token: string): BrowserTokenClaims {
  const [, encodedPayload] = token.split(".");
  if (!encodedPayload) {
    throw new Error("Expected token to be a JWT with a payload.");
  }

  const decodedPayload = decodeBase64Url(encodedPayload);
  if (!decodedPayload) {
    throw new Error("Unable to decode token payload.");
  }

  let payload: {
    aud?: unknown;
    sessionId?: unknown;
    scope?: unknown;
  };

  try {
    payload = JSON.parse(decodedPayload) as typeof payload;
  } catch {
    throw new Error("Unable to parse token payload.");
  }

  const sessionId =
    typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";

  return {
    audience: resolveTokenAudience(payload.aud),
    sessionId: sessionId || null,
    scopes: parseTokenScopes(payload.scope),
  };
}

function assertTokenScopes(
  claims: BrowserTokenClaims,
  requiredScopes: string[],
  purpose: string
): void {
  const missingScopes = requiredScopes.filter(
    (scope) => !claims.scopes.has(scope)
  );
  if (missingScopes.length > 0) {
    throw new Error(
      `Browser token for ${claims.audience} is missing ${purpose} scope: ${missingScopes.join(
        ", "
      )}.`
    );
  }
}

function assertLiveViewToken(claims: BrowserTokenClaims): void {
  assertTokenScopes(
    claims,
    claims.audience === REGIONAL_PROXY_AUDIENCE
      ? [REGIONAL_PROXY_LIVE_SCOPE]
      : [SESSION_PROXY_LIVE_SCOPE],
    "live view"
  );
}

function assertComputerActionToken(claims: BrowserTokenClaims): void {
  assertTokenScopes(
    claims,
    claims.audience === REGIONAL_PROXY_AUDIENCE
      ? [REGIONAL_PROXY_COMPUTER_ACTION_SCOPE]
      : [SESSION_PROXY_COMPUTER_ACTION_SCOPE],
    "computer action"
  );
}

function assertCompatibleTokenClaims(
  primaryClaims: BrowserTokenClaims,
  secondaryClaims: BrowserTokenClaims,
  context: string
): void {
  if (primaryClaims.audience !== secondaryClaims.audience) {
    throw new Error(
      `${context} token audience ${secondaryClaims.audience} does not match live view token audience ${primaryClaims.audience}.`
    );
  }

  if (
    primaryClaims.sessionId &&
    secondaryClaims.sessionId &&
    primaryClaims.sessionId !== secondaryClaims.sessionId
  ) {
    throw new Error(
      `${context} token sessionId ${secondaryClaims.sessionId} does not match live view token sessionId ${primaryClaims.sessionId}.`
    );
  }
}

function toRegionalBrowserPath(claims: BrowserTokenClaims): string {
  if (!claims.sessionId) {
    throw new Error(
      `Browser token for ${REGIONAL_PROXY_AUDIENCE} requires a sessionId claim.`
    );
  }

  return `/browser/${encodeURIComponent(claims.sessionId)}`;
}

function toAudienceDefaultLivePath(claims: BrowserTokenClaims): string {
  return claims.audience === REGIONAL_PROXY_AUDIENCE
    ? `${toRegionalBrowserPath(claims)}/live`
    : "";
}

function toBasePath(url: URL, claims: BrowserTokenClaims): string {
  const proxiedPath = url.searchParams.get("path");
  if (proxiedPath?.startsWith("/")) {
    return proxiedPath.replace(/\/+$/, "");
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/vnc.html")) {
    const vncBasePath = pathname.slice(0, -"/vnc.html".length);
    return vncBasePath || toAudienceDefaultLivePath(claims);
  }

  return pathname === "" || pathname === "/"
    ? toAudienceDefaultLivePath(claims)
    : pathname;
}

function isSessionProxyLiveHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === "app.hyperbrowser.ai" ||
    (normalizedHostname.startsWith("connect-") &&
      normalizedHostname.endsWith(".hyperbrowser.ai"))
  );
}

function assertConnectUrlMatchesAudience(
  connectBaseUrl: URL,
  claims: BrowserTokenClaims
): void {
  if (
    claims.audience === REGIONAL_PROXY_AUDIENCE &&
    isSessionProxyLiveHost(connectBaseUrl.hostname)
  ) {
    throw new Error(
      `Browser token audience "${REGIONAL_PROXY_AUDIENCE}" cannot be used with session-proxy live host ${connectBaseUrl.host}.`
    );
  }

  const basePath = toBasePath(connectBaseUrl, claims);
  if (
    claims.audience === SESSION_PROXY_AUDIENCE &&
    basePath === "/live"
  ) {
    throw new Error(
      "connectUrl must be the session proxy transport base, not the frontend liveUrl. Pass session.liveDomain as connectUrl for standard browser sessions."
    );
  }

  if (
    claims.audience === SESSION_PROXY_AUDIENCE &&
    basePath.startsWith("/browser/")
  ) {
    throw new Error(
      `Browser token audience "${SESSION_PROXY_AUDIENCE}" cannot be used with regional live path ${basePath}.`
    );
  }
}

function toWebSocketBaseUrl(url: URL, claims: BrowserTokenClaims): string {
  const protocol =
    url.protocol === "https:" || url.protocol === "wss:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}${toBasePath(url, claims)}`;
}

function toHttpBaseUrl(url: URL, claims: BrowserTokenClaims): string {
  const protocol =
    url.protocol === "wss:"
      ? "https:"
      : url.protocol === "ws:"
      ? "http:"
      : url.protocol;
  return `${protocol}//${url.host}${toBasePath(url, claims)}`;
}

function toHttpOrigin(url: URL): string {
  const protocol =
    url.protocol === "wss:"
      ? "https:"
      : url.protocol === "ws:"
      ? "http:"
      : url.protocol;
  return `${protocol}//${url.host}`;
}

function trimOptionalValue(value: string | undefined): string | null {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue ? trimmedValue : null;
}

function resolveVncConnectionInput(input: VncConnectionInput): {
  token: string;
  connectBaseUrl: URL;
  claims: BrowserTokenClaims;
} {
  const token = trimOptionalValue(input.token);
  if (!token) {
    throw new Error("Expected token to be a non-empty string.");
  }

  const claims = parseBrowserTokenClaims(token);
  assertLiveViewToken(claims);

  const connectUrl = trimOptionalValue(input.connectUrl);
  if (!connectUrl) {
    throw new Error("Expected connectUrl to be a non-empty string.");
  }

  const connectBaseUrl = normalizeToUrl(
    connectUrl,
    "connectUrl"
  );
  assertConnectUrlMatchesAudience(connectBaseUrl, claims);

  return { token, connectBaseUrl, claims };
}

function appendTokenToUrl(url: URL, token: string): string {
  url.searchParams.set("token", token);
  return url.toString();
}

function buildRegionalComputerActionUrl(
  token: string,
  connectBaseUrl: URL,
  claims: BrowserTokenClaims
): string {
  const params = new URLSearchParams({ token });
  return `${toHttpOrigin(connectBaseUrl)}${toRegionalBrowserPath(
    claims
  )}/computer-action?${params.toString()}`;
}

function buildSessionProxyComputerActionUrl(
  token: string,
  connectBaseUrl: URL,
  claims: BrowserTokenClaims
): string {
  const params = new URLSearchParams({ token });
  return `${toHttpBaseUrl(connectBaseUrl, claims)}/computer-action?${params.toString()}`;
}

function buildRegionalVncWebSocketUrl(
  token: string,
  connectBaseUrl: URL,
  claims: BrowserTokenClaims
): string {
  const webSocketUrl = new URL(`${toWebSocketBaseUrl(connectBaseUrl, claims)}/`);
  webSocketUrl.searchParams.set("token", token);
  return webSocketUrl.toString();
}

function buildSessionProxyVncWebSocketUrl(
  token: string,
  connectBaseUrl: URL,
  claims: BrowserTokenClaims,
  vncPassword: string
): string {
  const liveDomain = `${connectBaseUrl.protocol}//${connectBaseUrl.host}`;
  const params = new URLSearchParams({
    autoconnect: "true",
    password: vncPassword,
    resize: "scale",
    scaling: "local",
    token,
    liveDomain,
  });

  return `${toWebSocketBaseUrl(connectBaseUrl, claims)}/websockify?${params.toString()}`;
}

function buildVncClientConfig(audience: TokenAudience): VncClientConfig {
  return {
    autoConnect: true,
    clipViewport: false,
    dragViewport: false,
    resizeSession: audience === SESSION_PROXY_AUDIENCE,
    scaleViewport: true,
  };
}

function buildVncConnection(
  input: VncConnectionInput,
  vncPassword: string
): {
  clientConfig: VncClientConfig;
  webSocketUrl: string;
} {
  const { token, connectBaseUrl, claims } = resolveVncConnectionInput(input);
  const webSocketUrl =
    claims.audience === REGIONAL_PROXY_AUDIENCE
      ? buildRegionalVncWebSocketUrl(token, connectBaseUrl, claims)
      : buildSessionProxyVncWebSocketUrl(
          token,
          connectBaseUrl,
          claims,
          vncPassword
        );

  return {
    clientConfig: buildVncClientConfig(claims.audience),
    webSocketUrl,
  };
}

function toCssLength(size: number | string): string {
  return typeof size === "number" ? `${size}px` : size;
}

function useMetaModifierForClipboardShortcuts(): boolean {
  return APPLE_PLATFORM_PATTERN.test(navigator.platform ?? "");
}

function isShortcutMatch(
  event: KeyboardEvent,
  shortcut: "copy" | "paste",
  useMetaModifier: boolean
): boolean {
  const key = event.key.toLowerCase();
  const modifierPressed = useMetaModifier ? event.metaKey : event.ctrlKey;
  return modifierPressed && (shortcut === "copy" ? key === "c" : key === "v");
}

function buildVncWebSocketUrl(
  tokenOrInput: string | VncConnectionInput,
  connectUrl?: string,
  vncPassword: string = DEFAULT_VNC_PASSWORD
): string {
  return buildVncConnection(
    typeof tokenOrInput === "string"
      ? { token: tokenOrInput, connectUrl }
      : tokenOrInput,
    vncPassword
  ).webSocketUrl;
}

function buildComputerActionUrl(
  tokenOrInput: string | ComputerActionConnectionInput,
  connectUrl?: string,
  computerActionEndpoint?: string
): string {
  const input =
    typeof tokenOrInput === "string"
      ? { token: tokenOrInput, connectUrl, computerActionEndpoint }
      : tokenOrInput;
  const { token, connectBaseUrl, claims } = resolveVncConnectionInput(input);

  if (input.computerActionEndpoint) {
    const actionUrl = normalizeToUrl(
      input.computerActionEndpoint,
      "computerActionEndpoint",
      new Set(["http:", "https:"])
    );
    const endpointToken = trimOptionalValue(
      actionUrl.searchParams.get("token") ?? undefined
    );
    if (endpointToken) {
      const endpointClaims = parseBrowserTokenClaims(endpointToken);
      assertComputerActionToken(endpointClaims);
      assertCompatibleTokenClaims(claims, endpointClaims, "Computer action");
      return actionUrl.toString();
    }

    assertComputerActionToken(claims);
    return appendTokenToUrl(actionUrl, token);
  }

  assertComputerActionToken(claims);
  return claims.audience === REGIONAL_PROXY_AUDIENCE
    ? buildRegionalComputerActionUrl(token, connectBaseUrl, claims)
    : buildSessionProxyComputerActionUrl(token, connectBaseUrl, claims);
}

export function HyperbrowserVncViewer({
  token,
  connectUrl,
  computerActionEndpoint,
  disableFocusOnConnect = false,
  rewriteCmdAsCtrl = false,
  useComputerActionClipboard = false,
  debugClipboardFlow = false,
  viewOnly = false,
  className,
  style,
  height = DEFAULT_HEIGHT_PX,
  retryDuration = DEFAULT_RETRY_DURATION,
  vncPassword = DEFAULT_VNC_PASSWORD,
  onConnect,
  onConnectionError,
}: HyperbrowserVncViewerProps) {
  const vncRef = useRef<VncScreenHandle | null>(null);
  const vncContainerRef = useRef<HTMLDivElement | null>(null);
  const rewrittenKeyCodesRef = useRef(new Set<string>());
  const rewrittenPressedKeysRef = useRef(new Map<string, RewrittenKeyState>());
  const [isVncInputActive, setIsVncInputActive] = useState(false);
  const useManagedInputGuards = disableFocusOnConnect;

  const syncVncLayout = useCallback(() => {
    const rfb = vncRef.current?.rfb as InternalRfbKeyboardController | null;
    const screen = rfb?._screen ?? null;
    const canvas = rfb?._canvas ?? null;

    if (screen) {
      screen.style.alignItems = "center";
      screen.style.background = "#000000";
      screen.style.display = "flex";
      screen.style.justifyContent = "center";
    }

    if (canvas) {
      canvas.style.flex = "0 0 auto";
      canvas.style.margin = "auto";
    }

    rfb?._updateClip?.();
    rfb?._updateScale?.();
  }, []);

  const connection = useMemo(() => {
    try {
      const vncConnection = buildVncConnection(
        { token, connectUrl },
        vncPassword
      );

      return {
        clientConfig: vncConnection.clientConfig,
        webSocketUrl: vncConnection.webSocketUrl,
        computerActionUrl: useComputerActionClipboard
          ? buildComputerActionUrl({
              token,
              connectUrl,
              computerActionEndpoint,
            })
          : null,
        error: null as string | null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        clientConfig: null,
        webSocketUrl: null,
        computerActionUrl: null,
        error: message,
      };
    }
  }, [
    token,
    connectUrl,
    computerActionEndpoint,
    useComputerActionClipboard,
    vncPassword,
  ]);

  const webSocketUrl = connection.webSocketUrl;
  const vncClientConfig = connection.clientConfig ?? buildVncClientConfig(
    SESSION_PROXY_AUDIENCE
  );

  const setNoVncKeyboardGrab = useCallback((enabled: boolean) => {
    const rfb = vncRef.current?.rfb as InternalRfbKeyboardController | null;
    const keyboard = rfb?._keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.ungrab();
    if (enabled) {
      keyboard.grab();
    }
  }, []);

  const disableVncInput = useCallback(() => {
    setIsVncInputActive(false);
    setNoVncKeyboardGrab(false);
    vncRef.current?.blur();
  }, [setNoVncKeyboardGrab]);

  const activateVncInput = useCallback(() => {
    setIsVncInputActive(true);
    vncRef.current?.focus();
    setNoVncKeyboardGrab(true);
    // Focus and keyboard grab can get deferred by some browsers.
    window.setTimeout(() => {
      if (vncContainerRef.current) {
        setNoVncKeyboardGrab(true);
        vncRef.current?.focus();
      }
    }, 0);
  }, [setNoVncKeyboardGrab]);

  useEffect(() => {
    if (!connection.error) {
      return;
    }

    onConnectionError?.(connection.error);
  }, [connection.error, onConnectionError]);

  useEffect(() => {
    if (!useManagedInputGuards) {
      return;
    }

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const container = vncContainerRef.current;
      if (!container) {
        return;
      }

      const clickedInsideVnc = container.contains(event.target as Node);
      if (clickedInsideVnc) {
        return;
      }

      disableVncInput();
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [disableVncInput, useManagedInputGuards]);

  useEffect(() => {
    if (!useManagedInputGuards && !rewriteCmdAsCtrl) {
      return;
    }

    const useMetaModifier = useMetaModifierForClipboardShortcuts();

    const forwardKeyboardEvent = (event: KeyboardEvent) => {
      if (!event.isTrusted) {
        return;
      }

      const eventCode = event.code || "";
      const normalizedKey =
        event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const codeSignature = eventCode ? `code:${eventCode}` : "";
      const keySignature = `key:${normalizedKey}`;
      const rewrittenKeyCodes = rewrittenKeyCodesRef.current;
      const rewrittenPressedKeys = rewrittenPressedKeysRef.current;
      const isMetaPhysicalKey =
        event.key === "Meta" ||
        eventCode === "MetaLeft" ||
        eventCode === "MetaRight";
      const wasRewritten =
        (codeSignature !== "" && rewrittenKeyCodes.has(codeSignature)) ||
        rewrittenKeyCodes.has(keySignature);
      const shouldRewriteMeta =
        rewriteCmdAsCtrl &&
        (event.metaKey || isMetaPhysicalKey || wasRewritten);

      if (rewriteCmdAsCtrl && event.type === "keydown" && shouldRewriteMeta) {
        if (codeSignature !== "") {
          rewrittenKeyCodes.add(codeSignature);
        }
        rewrittenKeyCodes.add(keySignature);
        if (!isMetaPhysicalKey && !event.repeat) {
          const pressedKeySignature =
            codeSignature !== "" ? codeSignature : keySignature;
          rewrittenPressedKeys.set(pressedKeySignature, {
            key: event.key,
            code: event.code,
            location: event.location,
          });
        }
      }

      const clearRewriteStateIfNeeded = () => {
        if (rewriteCmdAsCtrl && event.type === "keyup") {
          if (codeSignature !== "") {
            rewrittenKeyCodes.delete(codeSignature);
            rewrittenPressedKeys.delete(codeSignature);
          }
          rewrittenKeyCodes.delete(keySignature);
          rewrittenPressedKeys.delete(keySignature);
        }
      };

      const target = event.target;
      const isNoVncKeyboardInput =
        target instanceof HTMLTextAreaElement &&
        target.id === "noVNC_keyboardinput";
      const isEditableUserTarget =
        target instanceof HTMLInputElement ||
        (target instanceof HTMLTextAreaElement && !isNoVncKeyboardInput) ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isEditableUserTarget) {
        clearRewriteStateIfNeeded();
        return;
      }

      const container = vncContainerRef.current;
      const isInsideVnc =
        target instanceof Node && container
          ? container.contains(target)
          : false;
      const isVncContext =
        isNoVncKeyboardInput || isInsideVnc || isVncInputActive;
      if (!isVncContext) {
        clearRewriteStateIfNeeded();
        return;
      }

      const isCopyShortcut = isShortcutMatch(event, "copy", useMetaModifier);
      const isPasteShortcut = isShortcutMatch(event, "paste", useMetaModifier);
      if (useComputerActionClipboard && (isCopyShortcut || isPasteShortcut)) {
        clearRewriteStateIfNeeded();
        return;
      }

      const shouldForwardForManagedInput =
        useManagedInputGuards && isVncInputActive;
      if (!shouldRewriteMeta && !shouldForwardForManagedInput) {
        clearRewriteStateIfNeeded();
        return;
      }

      const rfb = vncRef.current?.rfb as InternalRfbKeyboardController | null;
      const canvas = rfb?._canvas ?? null;
      const noVncKeyboardInputElement =
        container?.querySelector<HTMLTextAreaElement>("#noVNC_keyboardinput") ??
        null;
      const dispatchTarget: EventTarget | null = shouldForwardForManagedInput
        ? canvas
        : shouldRewriteMeta
        ? noVncKeyboardInputElement ?? canvas
        : isNoVncKeyboardInput
        ? target
        : canvas;
      if (!dispatchTarget) {
        clearRewriteStateIfNeeded();
        return;
      }

      if (
        rewriteCmdAsCtrl &&
        event.type === "keyup" &&
        isMetaPhysicalKey &&
        rewrittenPressedKeys.size > 0
      ) {
        for (const [, pressedKey] of rewrittenPressedKeys) {
          const flushedKeyup = new KeyboardEvent("keyup", {
            key: pressedKey.key,
            code: pressedKey.code,
            location: pressedKey.location,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            bubbles: true,
            cancelable: true,
          });
          dispatchTarget.dispatchEvent(flushedKeyup);
        }
        rewrittenPressedKeys.clear();
      }

      let key = event.key;
      let code = event.code;
      let ctrlKey = event.ctrlKey;
      let metaKey = event.metaKey;

      if (shouldRewriteMeta) {
        ctrlKey = true;
        metaKey = false;
        if (key === "Meta") {
          key = "Control";
        }
        if (code === "MetaLeft") {
          code = "ControlLeft";
        } else if (code === "MetaRight") {
          code = "ControlRight";
        }
      }

      const forwardedEvent = new KeyboardEvent(event.type, {
        key,
        code,
        location: event.location,
        repeat: event.repeat,
        ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey,
        bubbles: true,
        cancelable: true,
      });

      dispatchTarget.dispatchEvent(forwardedEvent);
      event.preventDefault();
      event.stopPropagation();
      clearRewriteStateIfNeeded();
    };

    document.addEventListener("keydown", forwardKeyboardEvent, true);
    document.addEventListener("keyup", forwardKeyboardEvent, true);
    return () => {
      document.removeEventListener("keydown", forwardKeyboardEvent, true);
      document.removeEventListener("keyup", forwardKeyboardEvent, true);
      rewrittenKeyCodesRef.current.clear();
      rewrittenPressedKeysRef.current.clear();
    };
  }, [
    isVncInputActive,
    rewriteCmdAsCtrl,
    useComputerActionClipboard,
    useManagedInputGuards,
  ]);

  useEffect(() => {
    if (!useComputerActionClipboard || !connection.computerActionUrl) {
      return;
    }

    const actionUrl = connection.computerActionUrl;
    const clipboardTarget = document.body;
    if (!clipboardTarget) {
      return;
    }
    const useMetaModifier = useMetaModifierForClipboardShortcuts();
    const isVncClipboardContext = (
      eventTarget: EventTarget | null
    ): boolean => {
      const container = vncContainerRef.current;
      if (!container) {
        return false;
      }

      const targetNode = eventTarget instanceof Node ? eventTarget : null;
      const activeElement = document.activeElement;
      const isNoVncKeyboardInputActive =
        activeElement instanceof HTMLTextAreaElement &&
        activeElement.id === "noVNC_keyboardinput";
      const isTargetInside = !!(targetNode && container.contains(targetNode));
      const isActiveElementInside =
        activeElement instanceof Node && container.contains(activeElement);

      return (
        isNoVncKeyboardInputActive ||
        isTargetInside ||
        isActiveElementInside
      );
    };

    const extractClipboardText = (result: unknown): string => {
      if (!result || typeof result !== "object") {
        return "";
      }

      const data = (result as { data?: unknown }).data;
      if (!data || typeof data !== "object") {
        return "";
      }

      const clipboardText = (data as { clipboardText?: unknown }).clipboardText;
      return typeof clipboardText === "string" ? clipboardText : "";
    };

    const writeClipboardText = async (text: string) => {
      if (!navigator.clipboard?.writeText) {
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        if (debugClipboardFlow) {
          console.error("navigator.clipboard.writeText failed:", error);
          debugger;
        }
      }
    };

    const computerAction = async (body: Record<string, unknown>) => {
      const response = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "omit",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`computerAction failed: ${response.status} ${text}`);
      }

      return response.json();
    };

    const computerActionSync = (body: Record<string, unknown>): unknown => {
      const request = new XMLHttpRequest();
      request.open("POST", actionUrl, false);
      request.setRequestHeader("Content-Type", "application/json");
      request.send(JSON.stringify(body));

      if (request.status < 200 || request.status >= 300) {
        throw new Error(
          `computerAction sync failed: ${request.status} ${request.responseText ?? ""}`
        );
      }

      if (!request.responseText) {
        return {};
      }

      return JSON.parse(request.responseText) as unknown;
    };

    const runRemoteCopy = async () => {
      try {
        const selectionResult = await computerAction({
          action: "get_selection_text",
          returnScreenshot: false,
        });
        if (debugClipboardFlow) {
          debugger;
        }
        await writeClipboardText(extractClipboardText(selectionResult));
      } catch (error) {
        console.error("Copy via get_selection_text failed:", error);
        try {
          await computerAction({
            action: "press_keys",
            keys: ["ctrl", "c"],
            returnScreenshot: false,
          });
        } catch (pressError) {
          console.error("Fallback press_keys ctrl+c failed:", pressError);
        }

        try {
          const clipboardResult = await computerAction({
            action: "get_clipboard_text",
            returnScreenshot: false,
          });
          if (debugClipboardFlow) {
            debugger;
          }
          await writeClipboardText(extractClipboardText(clipboardResult));
        } catch (clipboardError) {
          console.error("get_clipboard_text fallback failed:", clipboardError);
        }
      }
    };

    const runRemoteCopySync = (): string => {
      try {
        const selectionResult = computerActionSync({
          action: "get_selection_text",
          returnScreenshot: false,
        });
        const selectionText = extractClipboardText(selectionResult);
        if (selectionText) {
          return selectionText;
        }
      } catch (error) {
        if (debugClipboardFlow) {
          console.error("Sync copy via get_selection_text failed:", error);
          debugger;
        }
      }

      try {
        computerActionSync({
          action: "press_keys",
          keys: ["ctrl", "c"],
          returnScreenshot: false,
        });
      } catch (error) {
        if (debugClipboardFlow) {
          console.error("Sync fallback press_keys ctrl+c failed:", error);
          debugger;
        }
      }

      try {
        const clipboardResult = computerActionSync({
          action: "get_clipboard_text",
          returnScreenshot: false,
        });
        return extractClipboardText(clipboardResult);
      } catch (error) {
        if (debugClipboardFlow) {
          console.error("Sync get_clipboard_text fallback failed:", error);
          debugger;
        }
      }

      return "";
    };

    const runRemotePaste = async (eventText: string = "") => {
      try {
        let text = eventText;

        if (!text && navigator.clipboard?.readText) {
          try {
            text = await navigator.clipboard.readText();
          } catch (error) {
            if (debugClipboardFlow) {
              console.error("navigator.clipboard.readText failed:", error);
              debugger;
            }
            text = "";
          }
        }

        await computerAction({
          action: "put_selection_text",
          text,
          returnScreenshot: false,
        });
        if (debugClipboardFlow) {
          debugger;
        }
      } catch (error) {
        console.error("Failed to paste via put_selection_text:", error);
      }
    };

    const handleShortcutKeydown = (event: KeyboardEvent) => {
      if (!isVncClipboardContext(event.target)) {
        return;
      }

      const isCopyShortcut = isShortcutMatch(event, "copy", useMetaModifier);
      const isPasteShortcut = isShortcutMatch(event, "paste", useMetaModifier);
      if (!isCopyShortcut && !isPasteShortcut) {
        return;
      }

      if (debugClipboardFlow) {
        debugger;
      }
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      event.stopPropagation();
    };

    const handleCopy = (event: ClipboardEvent) => {
      if (!isVncClipboardContext(event.target)) {
        return;
      }

      if (debugClipboardFlow) {
        debugger;
      }
      event.stopPropagation();
      event.preventDefault();
      if (event.clipboardData) {
        const syncText = runRemoteCopySync();
        if (syncText) {
          event.clipboardData.setData("text/plain", syncText);
          return;
        }
      }

      (async () => {
        try {
          await runRemoteCopy();
        } catch (error) {
          console.error("runRemoteCopy failed:", error);
        }
      })();
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (!isVncClipboardContext(event.target)) {
        return;
      }

      if (debugClipboardFlow) {
        debugger;
      }
      event.stopPropagation();
      event.preventDefault();
      const eventText = event.clipboardData?.getData("text/plain") ?? "";
      (async () => {
        try {
          await runRemotePaste(eventText);
        } catch (error) {
          console.error("runRemotePaste failed:", error);
        }
      })();
    };

    clipboardTarget.addEventListener("copy", handleCopy);
    document.addEventListener("keydown", handleShortcutKeydown, true);
    clipboardTarget.addEventListener("paste", handlePaste);

    return () => {
      clipboardTarget.removeEventListener("copy", handleCopy);
      document.removeEventListener("keydown", handleShortcutKeydown, true);
      clipboardTarget.removeEventListener("paste", handlePaste);
    };
  }, [
    connection.computerActionUrl,
    debugClipboardFlow,
    useComputerActionClipboard,
  ]);

  useEffect(() => {
    if (useManagedInputGuards) {
      disableVncInput();
    }
  }, [disableVncInput, useManagedInputGuards, webSocketUrl]);

  useEffect(() => {
    const container = vncContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(syncVncLayout);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [syncVncLayout, webSocketUrl]);

  const resolvedHeight = toCssLength(height);

  if (connection.error || !webSocketUrl) {
    return (
      <section className={className} style={style}>
        <div
          role="alert"
          style={{
            border: "1px solid #fecaca",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "0.95rem",
            padding: "0.9rem 1rem",
          }}
        >
          {connection.error ?? "Unable to resolve a VNC websocket URL."}
        </div>
      </section>
    );
  }

  return (
    <section
      className={className}
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#ffffff",
        ...style,
      }}
    >
      <div
        ref={vncContainerRef}
        onMouseDownCapture={
          useManagedInputGuards ? activateVncInput : undefined
        }
        onTouchStartCapture={
          useManagedInputGuards ? activateVncInput : undefined
        }
        style={{
          width: "100%",
          height: resolvedHeight,
          background: "#000000",
        }}
      >
        <VncScreen
          key={webSocketUrl}
          ref={vncRef}
          url={webSocketUrl}
          rfbOptions={{
            credentials: {
              username: DEFAULT_USERNAME,
              password: vncPassword,
              target: DEFAULT_TARGET,
            },
          }}
          onConnect={() => {
            syncVncLayout();
            window.setTimeout(syncVncLayout, 0);
            window.setTimeout(syncVncLayout, 120);

            if (useManagedInputGuards) {
              disableVncInput();
              // noVNC may claim focus shortly after connect; enforce off state.
              window.setTimeout(disableVncInput, 0);
              window.setTimeout(disableVncInput, 120);
            } else {
              activateVncInput();
            }
            onConnect?.();
          }}
          focusOnClick={!useManagedInputGuards}
          autoConnect={vncClientConfig.autoConnect}
          clipViewport={vncClientConfig.clipViewport}
          dragViewport={vncClientConfig.dragViewport}
          scaleViewport={vncClientConfig.scaleViewport}
          resizeSession={vncClientConfig.resizeSession}
          viewOnly={viewOnly}
          retryDuration={retryDuration}
          background="#000000"
          style={{ width: "100%", height: "100%", background: "#000000" }}
        />
      </div>
    </section>
  );
}
