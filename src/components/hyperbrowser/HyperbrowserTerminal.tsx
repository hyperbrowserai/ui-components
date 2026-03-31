import React from "react";
import { TerminalSurface } from "../terminal/TerminalSurface";
import type { TerminalSurfaceProps } from "../terminal/types";
import {
  createHyperbrowserPtyConnection,
  type HyperbrowserPtyBrowserAuthParams,
  type HyperbrowserPtyBrowserAuthResolver,
  type HyperbrowserPtyConnectionOptions,
  type HyperbrowserPtyStatus,
  type HyperbrowserRuntimeBrowserAuth,
} from "./hyperbrowser-pty-connection";
import {
  useSandboxTerminalConnection,
  getSandboxTerminalConnectionIdentity,
  type UseSandboxTerminalConnectionOptions,
} from "./useSandboxTerminalConnection";

export type HyperbrowserTerminalProps = Omit<
  TerminalSurfaceProps,
  "connection"
> &
  UseSandboxTerminalConnectionOptions;

export {
  createHyperbrowserPtyConnection,
  type HyperbrowserPtyBrowserAuthParams,
  type HyperbrowserPtyBrowserAuthResolver,
  type HyperbrowserPtyConnectionOptions,
  type HyperbrowserRuntimeBrowserAuth,
  type HyperbrowserPtyStatus,
  useSandboxTerminalConnection,
  type UseSandboxTerminalConnectionOptions,
};

function HyperbrowserTerminalSession(props: HyperbrowserTerminalProps) {
  const {
    appearance,
    autoFocus,
    className,
    chromeTheme,
    onConnectionError,
    onExit,
    onReady,
    onStatusChange,
    preset,
    readOnly,
    style,
    terminalOptions,
    terminalTheme,
    title,
  } = props;

  const connection = useSandboxTerminalConnection(props);

  return (
    <TerminalSurface
      appearance={appearance}
      autoFocus={autoFocus}
      className={className}
      chromeTheme={chromeTheme}
      connection={connection}
      onConnectionError={onConnectionError}
      onExit={onExit}
      onReady={onReady}
      onStatusChange={onStatusChange}
      preset={preset}
      readOnly={readOnly}
      style={style}
      terminalOptions={terminalOptions}
      terminalTheme={terminalTheme}
      title={title ?? "Hyperbrowser Terminal"}
    />
  );
}

export function HyperbrowserTerminal(props: HyperbrowserTerminalProps) {
  const terminalKey = getSandboxTerminalConnectionIdentity(props);

  return <HyperbrowserTerminalSession key={terminalKey} {...props} />;
}
