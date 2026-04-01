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
      return "Connected";
    case "closed":
      return "Closed";
    case "error":
      return "Error";
    default:
      return "Idle";
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
  const { status, viewportRef } = useTerminal({
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
        <div className="hb-terminal__titleBlock">
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
    </section>
  );
}
