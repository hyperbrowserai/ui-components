import React from "react";

import type { CSSProperties } from "react";
import { resolveTerminalTheme } from "./terminalThemes";
import { useTerminal } from "./useTerminal";
import type { TerminalStatus, TerminalSurfaceProps } from "./types";

function toStatusLabel(status: TerminalStatus): string {
  switch (status) {
    case "connecting":
      return "Connecting";
    case "ready":
      return "Live";
    case "closed":
      return "Closed";
    case "error":
      return "Issue";
    default:
      return "Idle";
  }
}

function toFooterMessage(
  status: TerminalStatus,
  errorMessage: string | null,
): string {
  if (errorMessage) {
    return errorMessage;
  }

  switch (status) {
    case "connecting":
      return "Establishing terminal session";
    case "ready":
      return "Ready for input";
    case "closed":
      return "Session closed";
    case "error":
      return "Terminal connection failed";
    default:
      return "Session idle";
  }
}

function toThemeStyle(
  theme: ReturnType<typeof resolveTerminalTheme>,
): CSSProperties {
  return {
    "--hb-terminal-accent": theme.chrome.accent,
    "--hb-terminal-background": theme.chrome.background,
    "--hb-terminal-border": theme.chrome.border,
    "--hb-terminal-panel": theme.chrome.panel,
    "--hb-terminal-panel-muted": theme.chrome.panelMuted,
    "--hb-terminal-screen-background":
      theme.terminal.background ?? theme.chrome.background,
    "--hb-terminal-shadow": theme.chrome.shadow,
    "--hb-terminal-text": theme.chrome.text,
    "--hb-terminal-text-muted": theme.chrome.textMuted,
  } as CSSProperties;
}

export function TerminalSurface({
  appearance,
  autoFocus = true,
  className,
  chromeTheme,
  connection,
  onConnectionError,
  onExit,
  onReady,
  onStatusChange,
  preset,
  readOnly = false,
  style,
  terminalOptions,
  terminalTheme,
  title = "Terminal",
}: TerminalSurfaceProps) {
  const resolvedTheme = resolveTerminalTheme({
    appearance,
    chromeTheme,
    preset,
    terminalOptions,
    terminalTheme,
  });
  const { errorMessage, status, viewportRef } = useTerminal({
    appearance,
    autoFocus,
    connection,
    onConnectionError,
    onExit,
    onReady,
    onStatusChange,
    preset,
    readOnly,
    terminalOptions,
    terminalTheme,
  });

  const rootClassName = ["hb-terminal", className].filter(Boolean).join(" ");
  const mergedStyle = {
    ...toThemeStyle(resolvedTheme),
    ...style,
  };

  return (
    <section
      aria-label={title}
      className={rootClassName}
      data-status={status}
      style={mergedStyle}
    >
      <div aria-hidden="true" className="hb-terminal__glow" />
      <header className="hb-terminal__header">
        <div aria-hidden="true" className="hb-terminal__traffic">
          <span />
          <span />
          <span />
        </div>
        <div className="hb-terminal__titleBlock">
          <p className="hb-terminal__eyebrow">{resolvedTheme.label}</p>
          <h2 className="hb-terminal__title">{title}</h2>
        </div>
        <div className="hb-terminal__status" data-status={status}>
          {toStatusLabel(status)}
        </div>
      </header>

      <div className="hb-terminal__viewport">
        <div
          className="hb-terminal__screen hb-terminal-base"
          ref={viewportRef}
        />
        {status === "connecting" ? (
          <div className="hb-terminal__overlay">
            <span>Establishing terminal session…</span>
          </div>
        ) : null}
      </div>

      <footer className="hb-terminal__footer">
        <span className="hb-terminal__footerLabel">
          {readOnly ? "Read only" : "Interactive"}
        </span>
        <span className="hb-terminal__footerMeta">
          {toFooterMessage(status, errorMessage)}
        </span>
      </footer>
    </section>
  );
}
