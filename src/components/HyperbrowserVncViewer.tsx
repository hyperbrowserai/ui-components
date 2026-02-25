import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from 'react';
import { VncScreen, type VncScreenHandle } from 'react-vnc';

const DEFAULT_VNC_PASSWORD = 'vncpassword';
const DEFAULT_USERNAME = 'admin';
const DEFAULT_TARGET = 'vnc';
const DEFAULT_HEIGHT_PX = 560;
const DEFAULT_RETRY_DURATION = 2000;

type InternalRfbKeyboardController = {
  _keyboard?: {
    grab: () => void;
    ungrab: () => void;
  };
  _canvas?: HTMLCanvasElement | null;
};

export type HyperbrowserVncViewerProps = {
  token: string;
  connectUrl: string;
  disableFocusOnConnect?: boolean;
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
    throw new Error('Expected connectUrl to be a non-empty string.');
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)
    ? value
    : `https://${value}`;

  const parsed = new URL(withProtocol);
  const allowedProtocols = new Set(['http:', 'https:', 'ws:', 'wss:']);
  if (!allowedProtocols.has(parsed.protocol)) {
    throw new Error(`Unsupported connectUrl protocol: ${parsed.protocol}`);
  }

  return parsed;
}

function toWebSocketOrigin(url: URL): string {
  const protocol =
    url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}`;
}

function toCssLength(size: number | string): string {
  return typeof size === 'number' ? `${size}px` : size;
}

function buildVncWebSocketUrl(
  token: string,
  connectUrl: string,
  vncPassword: string = DEFAULT_VNC_PASSWORD
): string {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error('Expected token to be a non-empty string.');
  }

  const connectBaseUrl = normalizeToUrl(connectUrl);
  const liveDomain = `${connectBaseUrl.protocol}//${connectBaseUrl.host}`;
  const wsOrigin = toWebSocketOrigin(connectBaseUrl);
  const params = new URLSearchParams({
    autoconnect: 'true',
    password: vncPassword,
    resize: 'scale',
    scaling: 'local',
    token: trimmedToken,
    liveDomain
  });

  return `${wsOrigin}/websockify?${params.toString()}`;
}

export function HyperbrowserVncViewer({
  token,
  connectUrl,
  disableFocusOnConnect = false,
  viewOnly = false,
  className,
  style,
  height = DEFAULT_HEIGHT_PX,
  retryDuration = DEFAULT_RETRY_DURATION,
  vncPassword = DEFAULT_VNC_PASSWORD,
  onConnect,
  onConnectionError
}: HyperbrowserVncViewerProps) {
  const vncRef = useRef<VncScreenHandle | null>(null);
  const vncContainerRef = useRef<HTMLDivElement | null>(null);
  const [isVncInputActive, setIsVncInputActive] = useState(false);
  const useManagedInputGuards = disableFocusOnConnect;

  const connection = useMemo(() => {
    try {
      return {
        webSocketUrl: buildVncWebSocketUrl(token, connectUrl, vncPassword),
        error: null as string | null
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { webSocketUrl: null, error: message };
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

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, [disableVncInput, useManagedInputGuards]);

  useEffect(() => {
    if (!useManagedInputGuards || !isVncInputActive) {
      return;
    }

    const forwardKeyboardEvent = (event: KeyboardEvent) => {
      if (!event.isTrusted) {
        return;
      }

      const rfb = vncRef.current?.rfb as InternalRfbKeyboardController | null;
      const canvas = rfb?._canvas;
      if (!canvas) {
        return;
      }

      if (event.target === canvas) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const forwardedEvent = new KeyboardEvent(event.type, {
        key: event.key,
        code: event.code,
        location: event.location,
        repeat: event.repeat,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        bubbles: true,
        cancelable: true
      });

      canvas.dispatchEvent(forwardedEvent);
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('keydown', forwardKeyboardEvent, true);
    document.addEventListener('keyup', forwardKeyboardEvent, true);
    return () => {
      document.removeEventListener('keydown', forwardKeyboardEvent, true);
      document.removeEventListener('keyup', forwardKeyboardEvent, true);
    };
  }, [isVncInputActive, useManagedInputGuards]);

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
            border: '1px solid #fecaca',
            borderRadius: '8px',
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: '0.95rem',
            padding: '0.9rem 1rem'
          }}
        >
          {connection.error ?? 'Unable to resolve a VNC websocket URL.'}
        </div>
      </section>
    );
  }

  const webSocketUrl = connection.webSocketUrl;

  return (
    <section
      className={className}
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#ffffff',
        ...style
      }}
    >
      <div
        ref={vncContainerRef}
        onMouseDownCapture={useManagedInputGuards ? activateVncInput : undefined}
        onTouchStartCapture={useManagedInputGuards ? activateVncInput : undefined}
      >
        <VncScreen
          key={webSocketUrl}
          ref={vncRef}
          url={webSocketUrl}
          rfbOptions={{
            credentials: {
              username: DEFAULT_USERNAME,
              password: vncPassword,
              target: DEFAULT_TARGET
            }
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
          style={{ width: '100%', height: resolvedHeight }}
        />
      </div>
    </section>
  );
}
