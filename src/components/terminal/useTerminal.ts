import { useEffect, useMemo, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import {
  defaultTerminalOptions,
  resolveTerminalTheme,
} from "./terminalThemes";
import type {
  TerminalSession,
  TerminalStatus,
  UseTerminalOptions,
  UseTerminalResult,
} from "./types";

const DEFAULT_TERMINAL_COLS = 80;
const DEFAULT_TERMINAL_ROWS = 24;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

export function useTerminal({
  appearance,
  autoFocus = true,
  connection,
  onConnectionError,
  onExit,
  onReady,
  onStatusChange,
  preset,
  readOnly = false,
  terminalOptions,
  terminalTheme,
}: UseTerminalOptions): UseTerminalResult {
  const resolvedTheme = useMemo(
    () =>
      resolveTerminalTheme({
        appearance,
        preset,
        terminalOptions,
        terminalTheme,
      }),
    [appearance, preset, terminalOptions, terminalTheme],
  );
  const resolvedTerminalOptions = useMemo(
    () => ({
      ...defaultTerminalOptions,
      ...resolvedTheme.terminalOptions,
      ...terminalOptions,
    }),
    [resolvedTheme, terminalOptions],
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);
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
  const onStatusChangeRef = useRef(onStatusChange);
  const autoFocusRef = useRef(autoFocus);
  const [status, setStatus] = useState<TerminalStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);

  useEffect(() => {
    readOnlyRef.current = readOnly;
    onConnectionErrorRef.current = onConnectionError;
    onExitRef.current = onExit;
    onReadyRef.current = onReady;
    onStatusChangeRef.current = onStatusChange;
    autoFocusRef.current = autoFocus;
  }, [autoFocus, onConnectionError, onExit, onReady, onStatusChange, readOnly]);

  const updateStatus = (nextStatus: TerminalStatus) => {
    setStatus(nextStatus);
    onStatusChangeRef.current?.(nextStatus);
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
    const terminalInstance = terminalRef.current;
    if (!terminalInstance) {
      return { cols: DEFAULT_TERMINAL_COLS, rows: DEFAULT_TERMINAL_ROWS };
    }

    try {
      fitAddon?.fit();
    } catch {
      // Ignore transient layout errors when the terminal is hidden.
    }

    return {
      cols:
        terminalInstance.cols > 0
          ? terminalInstance.cols
          : DEFAULT_TERMINAL_COLS,
      rows:
        terminalInstance.rows > 0
          ? terminalInstance.rows
          : DEFAULT_TERMINAL_ROWS,
    };
  };

  const reportError = (message: string) => {
    setErrorMessage(message);
    updateStatus("error");
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
    const container = viewportRef.current;
    if (!container) {
      return;
    }

    const fitAddon = new FitAddon();
    const terminalInstance = new Terminal({
      ...resolvedTerminalOptions,
      disableStdin: readOnly,
      theme: resolvedTheme.terminal,
    });

    terminalInstance.loadAddon(fitAddon);
    terminalInstance.open(container);

    terminalRef.current = terminalInstance;
    fitAddonRef.current = fitAddon;
    setTerminal(terminalInstance);

    const handleTerminalData = terminalInstance.onData((data) => {
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

    updateStatus("idle");
    setTerminalReady(true);
    onReadyRef.current?.(terminalInstance);

    if (autoFocusRef.current) {
      window.requestAnimationFrame(() => {
        terminalInstance.focus();
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
      terminalInstance.dispose();
      fitAddon.dispose();
      fitAddonRef.current = null;
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminalInstance = terminalRef.current;
    if (!terminalInstance) {
      return;
    }

    Object.assign(terminalInstance.options, resolvedTerminalOptions);
    terminalInstance.options.disableStdin = readOnly;
    terminalInstance.options.theme = resolvedTheme.terminal;

    syncSessionSize();
  }, [readOnly, resolvedTerminalOptions, resolvedTheme]);

  useEffect(() => {
    if (!terminalReady || !terminalRef.current) {
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    disposeSession();
    setErrorMessage(null);
    updateStatus("connecting");

    const disposeConnection = () => {
      if (isCancelled) {
        return;
      }

      isCancelled = true;
      disposeSession();
      controller.abort();
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        return;
      }

      disposeConnection();
    };

    window.addEventListener("pagehide", handlePageHide);

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

        updateStatus("closed");
        onExitRef.current?.(event);
      });

      sessionCleanupRef.current = () => {
        removeOutputListener();
        removeExitListener();
        void Promise.resolve(session.close()).catch(() => {});
      };

      updateStatus("ready");
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
      window.removeEventListener("pagehide", handlePageHide);
      disposeConnection();
    };
  }, [connection, terminalReady]);

  return {
    errorMessage,
    status,
    terminal,
    viewportRef,
  };
}
