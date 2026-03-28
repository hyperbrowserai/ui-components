import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import type {
  ResolvedTerminalTheme,
  TerminalSession,
  TerminalState,
  TerminalSurfaceProps,
} from "./types";

const DEFAULT_TERMINAL_COLS = 80;
const DEFAULT_TERMINAL_ROWS = 24;

type UseTerminalEmulatorParams = Pick<
  TerminalSurfaceProps,
  | "autoFocus"
  | "connection"
  | "fontFamily"
  | "fontSize"
  | "letterSpacing"
  | "lineHeight"
  | "onConnectionError"
  | "onExit"
  | "onReady"
  | "onStateChange"
  | "readOnly"
  | "terminalOptions"
> & {
  theme: ResolvedTerminalTheme;
};

type UseTerminalEmulatorResult = {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  errorMessage: string | null;
  state: TerminalState;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

export function useTerminalEmulator({
  autoFocus = true,
  connection,
  fontFamily,
  fontSize,
  letterSpacing,
  lineHeight,
  onConnectionError,
  onExit,
  onReady,
  onStateChange,
  readOnly = false,
  terminalOptions,
  theme,
}: UseTerminalEmulatorParams): UseTerminalEmulatorResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const sessionRef = useRef<TerminalSession | null>(null);
  const sessionCleanupRef = useRef<(() => void) | null>(null);
  const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const readOnlyRef = useRef(readOnly);
  const onConnectionErrorRef = useRef(onConnectionError);
  const onExitRef = useRef(onExit);
  const onReadyRef = useRef(onReady);
  const onStateChangeRef = useRef(onStateChange);
  const autoFocusRef = useRef(autoFocus);
  const [state, setState] = useState<TerminalState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);

  useEffect(() => {
    readOnlyRef.current = readOnly;
    onConnectionErrorRef.current = onConnectionError;
    onExitRef.current = onExit;
    onReadyRef.current = onReady;
    onStateChangeRef.current = onStateChange;
    autoFocusRef.current = autoFocus;
  }, [autoFocus, onConnectionError, onExit, onReady, onStateChange, readOnly]);

  const updateState = (nextState: TerminalState) => {
    setState(nextState);
    onStateChangeRef.current?.(nextState);
  };

  const disposeSession = () => {
    const cleanup = sessionCleanupRef.current;
    sessionCleanupRef.current = null;
    lastSizeRef.current = null;
    sessionRef.current = null;
    cleanup?.();
  };

  const resolveTerminalSize = (): { cols: number; rows: number } => {
    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;
    if (!terminal) {
      return { cols: DEFAULT_TERMINAL_COLS, rows: DEFAULT_TERMINAL_ROWS };
    }

    try {
      fitAddon?.fit();
    } catch {
      // Ignore transient layout errors when the terminal is hidden.
    }

    return {
      cols: terminal.cols > 0 ? terminal.cols : DEFAULT_TERMINAL_COLS,
      rows: terminal.rows > 0 ? terminal.rows : DEFAULT_TERMINAL_ROWS,
    };
  };

  const reportError = (message: string) => {
    setErrorMessage(message);
    updateState("error");
    onConnectionErrorRef.current?.(message);
  };

  const syncSessionSize = () => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }

    const nextSize = resolveTerminalSize();
    const previousSize = lastSizeRef.current;
    if (
      previousSize &&
      previousSize.cols === nextSize.cols &&
      previousSize.rows === nextSize.rows
    ) {
      return;
    }

    lastSizeRef.current = nextSize;
    Promise.resolve(session.resize(nextSize)).catch((error) => {
      reportError(getErrorMessage(error, "Terminal resize failed."));
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const fitAddon = new FitAddon();
    const terminal = new Terminal({
      cursorBlink: theme.terminalOptions?.cursorBlink ?? true,
      cursorStyle: theme.terminalOptions?.cursorStyle ?? "bar",
      disableStdin: readOnly,
      fontFamily: fontFamily ?? theme.terminalOptions?.fontFamily,
      fontSize: fontSize ?? theme.terminalOptions?.fontSize,
      letterSpacing: letterSpacing ?? theme.terminalOptions?.letterSpacing,
      lineHeight: lineHeight ?? theme.terminalOptions?.lineHeight,
      theme: theme.terminal,
      ...terminalOptions,
    });

    terminal.loadAddon(fitAddon);
    terminal.open(container);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const handleTerminalData = terminal.onData((data) => {
      if (readOnlyRef.current) {
        return;
      }

      const session = sessionRef.current;
      if (!session) {
        return;
      }

      Promise.resolve(session.writeInput(data)).catch((error) => {
        reportError(getErrorMessage(error, "Terminal input failed."));
      });
    });

    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(() => {
        if (resizeFrameRef.current !== null) {
          cancelAnimationFrame(resizeFrameRef.current);
        }
        resizeFrameRef.current = window.requestAnimationFrame(() => {
          resizeFrameRef.current = null;
          syncSessionSize();
        });
      });
      resizeObserverRef.current.observe(container);
    }

    if (typeof document !== "undefined" && "fonts" in document) {
      void (
        document as Document & { fonts?: { ready?: Promise<unknown> } }
      ).fonts?.ready?.then(() => {
        syncSessionSize();
      });
    }

    updateState("idle");
    setTerminalReady(true);
    onReadyRef.current?.(terminal);

    if (autoFocusRef.current) {
      window.requestAnimationFrame(() => {
        terminal.focus();
      });
    }

    return () => {
      setTerminalReady(false);
      disposeSession();
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      handleTerminalData.dispose();
      terminal.dispose();
      fitAddon.dispose();
      fitAddonRef.current = null;
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    terminal.options.theme = theme.terminal;
    terminal.options.cursorBlink = theme.terminalOptions?.cursorBlink ?? true;
    terminal.options.cursorStyle = theme.terminalOptions?.cursorStyle ?? "bar";
    terminal.options.disableStdin = readOnly;
    terminal.options.fontFamily = fontFamily ?? theme.terminalOptions?.fontFamily;
    terminal.options.fontSize = fontSize ?? theme.terminalOptions?.fontSize;
    terminal.options.letterSpacing =
      letterSpacing ?? theme.terminalOptions?.letterSpacing;
    terminal.options.lineHeight = lineHeight ?? theme.terminalOptions?.lineHeight;

    if (terminalOptions) {
      Object.assign(terminal.options, terminalOptions);
    }

    syncSessionSize();
  }, [
    fontFamily,
    fontSize,
    letterSpacing,
    lineHeight,
    readOnly,
    terminalOptions,
    theme,
  ]);

  useEffect(() => {
    if (!terminalReady || !terminalRef.current) {
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    disposeSession();
    setErrorMessage(null);
    updateState("connecting");

    const connectSession = async () => {
      const initialSize = resolveTerminalSize();
      const session = await connection.connect({
        cols: initialSize.cols,
        rows: initialSize.rows,
        signal: controller.signal,
      });

      if (isCancelled) {
        await Promise.resolve(session.close()).catch(() => {});
        return;
      }

      sessionRef.current = session;
      lastSizeRef.current = initialSize;

      const removeOutputListener = session.onOutput((data) => {
        terminalRef.current?.write(data);
      });
      const removeExitListener = session.onExit((event) => {
        if (sessionRef.current !== session) {
          return;
        }

        updateState("closed");
        onExitRef.current?.(event);
      });

      sessionCleanupRef.current = () => {
        removeOutputListener();
        removeExitListener();
        void Promise.resolve(session.close()).catch(() => {});
      };

      updateState("ready");
      if (autoFocusRef.current) {
        window.requestAnimationFrame(() => {
          terminalRef.current?.focus();
        });
      }
    };

    void connectSession().catch((error) => {
      if (isCancelled || controller.signal.aborted) {
        return;
      }
      reportError(getErrorMessage(error, "Terminal connection failed."));
    });

    return () => {
      isCancelled = true;
      controller.abort();
      disposeSession();
    };
  }, [connection, terminalReady]);

  return {
    containerRef,
    errorMessage,
    state,
  };
}
