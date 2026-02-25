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

type InternalRfbKeyboardController = {
  _keyboard?: {
    grab: () => void;
    ungrab: () => void;
  };
  _canvas?: HTMLCanvasElement | null;
};

type RewrittenKeyState = {
  key: string;
  code: string;
  location: number;
};

export type HyperbrowserVncViewerProps = {
  token: string;
  connectUrl: string;
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

function normalizeToUrl(rawValue: string): URL {
  const value = rawValue.trim();
  if (!value) {
    throw new Error("Expected connectUrl to be a non-empty string.");
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)
    ? value
    : `https://${value}`;

  const parsed = new URL(withProtocol);
  const allowedProtocols = new Set(["http:", "https:", "ws:", "wss:"]);
  if (!allowedProtocols.has(parsed.protocol)) {
    throw new Error(`Unsupported connectUrl protocol: ${parsed.protocol}`);
  }

  return parsed;
}

function toWebSocketOrigin(url: URL): string {
  const protocol =
    url.protocol === "https:" || url.protocol === "wss:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}`;
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
  token: string,
  connectUrl: string,
  vncPassword: string = DEFAULT_VNC_PASSWORD
): string {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error("Expected token to be a non-empty string.");
  }

  const connectBaseUrl = normalizeToUrl(connectUrl);
  const liveDomain = `${connectBaseUrl.protocol}//${connectBaseUrl.host}`;
  const wsOrigin = toWebSocketOrigin(connectBaseUrl);
  const params = new URLSearchParams({
    autoconnect: "true",
    password: vncPassword,
    resize: "scale",
    scaling: "local",
    token: trimmedToken,
    liveDomain,
  });

  return `${wsOrigin}/websockify?${params.toString()}`;
}

function buildComputerActionUrl(token: string, connectUrl: string): string {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error("Expected token to be a non-empty string.");
  }

  const connectBaseUrl = normalizeToUrl(connectUrl);
  const actionOrigin = toHttpOrigin(connectBaseUrl);
  const params = new URLSearchParams({ token: trimmedToken });
  return `${actionOrigin}/computer-action?${params.toString()}`;
}

export function HyperbrowserVncViewer({
  token,
  connectUrl,
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

  const connection = useMemo(() => {
    try {
      return {
        webSocketUrl: buildVncWebSocketUrl(token, connectUrl, vncPassword),
        computerActionUrl: buildComputerActionUrl(token, connectUrl),
        error: null as string | null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { webSocketUrl: null, computerActionUrl: null, error: message };
    }
  }, [token, connectUrl, vncPassword]);

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
  }, [disableVncInput, connection.webSocketUrl, useManagedInputGuards]);

  const resolvedHeight = toCssLength(height);

  if (connection.error || !connection.webSocketUrl) {
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

  const webSocketUrl = connection.webSocketUrl;

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
            if (useManagedInputGuards) {
              disableVncInput();
              // noVNC may claim focus shortly after connect; enforce off state.
              window.setTimeout(() => {
                disableVncInput();
              }, 0);
              window.setTimeout(() => {
                disableVncInput();
              }, 120);
            } else {
              activateVncInput();
            }
            onConnect?.();
          }}
          focusOnClick={!useManagedInputGuards}
          scaleViewport
          resizeSession
          viewOnly={viewOnly}
          retryDuration={retryDuration}
          style={{ width: "100%", height: resolvedHeight }}
        />
      </div>
    </section>
  );
}
