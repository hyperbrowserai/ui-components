import React from "react";
import { TerminalSurface } from "../terminal/TerminalSurface";
import type { TerminalSurfaceProps } from "../terminal/types";
import {
  createHyperbrowserPtyConnection,
  type HyperbrowserPtyConnectionOptions,
  type HyperbrowserPtyStatus,
} from "./hyperbrowser-pty-connection";
import { useHyperbrowserRuntime } from "./HyperbrowserRuntimeProvider";
import {
  useSandboxTerminalConnection,
  getSandboxTerminalConnectionIdentity,
  type UseSandboxTerminalConnectionOptions,
} from "./useSandboxTerminalConnection";

export type HyperbrowserTerminalProps = Omit<
  TerminalSurfaceProps,
  "connection"
> &
  Omit<UseSandboxTerminalConnectionOptions, "getRuntimeAccess">;

export {
  createHyperbrowserPtyConnection,
  type HyperbrowserPtyConnectionOptions,
  type HyperbrowserPtyStatus,
  useSandboxTerminalConnection,
  type UseSandboxTerminalConnectionOptions,
};

export function HyperbrowserTerminal(props: HyperbrowserTerminalProps) {
  const { ensureRuntimeAccess } = useHyperbrowserRuntime();
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

  const connectionOptions: UseSandboxTerminalConnectionOptions = {
    ...props,
    getRuntimeAccess: ensureRuntimeAccess,
  };
  const terminalKey = getSandboxTerminalConnectionIdentity(connectionOptions);
  const connection = useSandboxTerminalConnection(connectionOptions);

  return (
    <TerminalSurface
      key={terminalKey}
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
