import { useRef } from "react";
import { TerminalSurface } from "../terminal/TerminalSurface";
import type { TerminalSurfaceProps } from "../terminal/types";
import {
  createHyperbrowserPtyConnection,
  type HyperbrowserPtyBrowserAuthResolver,
  type HyperbrowserPtyConnectionOptions,
  type HyperbrowserPtyStatus,
  type HyperbrowserRuntimeBrowserAuth,
} from "./hyperbrowser-pty-connection";

export type HyperbrowserTerminalProps = Omit<TerminalSurfaceProps, "connection"> &
  HyperbrowserPtyConnectionOptions;

type StableConnectionFactory = {
  connection: ReturnType<typeof createHyperbrowserPtyConnection>;
};

function serializeValue(value: unknown): string {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (value instanceof Headers) {
    return JSON.stringify(Array.from(value.entries()));
  }

  if (typeof value === "object") {
    return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
  }

  return String(value);
}

function createTerminalConnectionKey(props: HyperbrowserTerminalProps): string {
  return [
    props.sandboxId ?? "",
    props.runtimeBaseUrl ?? "",
    props.bootstrapUrl ?? "",
    props.browserAuthPath ?? "",
    props.existingPtyId ?? "",
    props.command ?? "",
    serializeValue(props.args),
    props.cwd ?? "",
    serializeValue(props.env),
    String(props.useShell ?? ""),
    String(props.timeoutMs ?? ""),
    props.closeBehavior ?? "disconnect",
    props.killSignal ?? "",
  ].join("|");
}

function createConnectionOptions(
  props: HyperbrowserTerminalProps
): HyperbrowserPtyConnectionOptions {
  return {
    apiBaseUrl: props.apiBaseUrl,
    apiCredentials: props.apiCredentials,
    apiHeaders: props.apiHeaders,
    args: props.args,
    bootstrapUrl: props.bootstrapUrl,
    browserAuthPath: props.browserAuthPath,
    closeBehavior: props.closeBehavior,
    command: props.command,
    createRetryCount: props.createRetryCount,
    createRetryDelayMs: props.createRetryDelayMs,
    cwd: props.cwd,
    env: props.env,
    existingPtyId: props.existingPtyId,
    fetch: props.fetch,
    getRuntimeBrowserAuth: props.getRuntimeBrowserAuth,
    inputBatchDelayMs: props.inputBatchDelayMs,
    inputBatchMaxBytes: props.inputBatchMaxBytes,
    killSignal: props.killSignal,
    maxReconnectAttempts: props.maxReconnectAttempts,
    reconnectRetryDelayMs: props.reconnectRetryDelayMs,
    runtimeBaseUrl: props.runtimeBaseUrl,
    sandboxId: props.sandboxId,
    timeoutMs: props.timeoutMs,
    useShell: props.useShell,
    webSocketFactory: props.webSocketFactory,
  };
}

export {
  createHyperbrowserPtyConnection,
  type HyperbrowserPtyBrowserAuthResolver,
  type HyperbrowserPtyConnectionOptions,
  type HyperbrowserRuntimeBrowserAuth,
  type HyperbrowserPtyStatus,
};

export function HyperbrowserTerminal(props: HyperbrowserTerminalProps) {
  const {
    autoFocus,
    className,
    fontFamily,
    fontSize,
    letterSpacing,
    lineHeight,
    onConnectionError,
    onExit,
    onReady,
    onStateChange,
    readOnly,
    style,
    terminalOptions,
    theme,
    title,
  } = props;

  const connectionFactoryRef = useRef<StableConnectionFactory | null>(null);
  const connectionKeyRef = useRef<string>("");
  const connectionKey = createTerminalConnectionKey(props);

  if (
    !connectionFactoryRef.current ||
    connectionKeyRef.current !== connectionKey
  ) {
    connectionFactoryRef.current = {
      connection: createHyperbrowserPtyConnection(createConnectionOptions(props)),
    };
    connectionKeyRef.current = connectionKey;
  }

  return (
    <TerminalSurface
      autoFocus={autoFocus}
      className={className}
      connection={connectionFactoryRef.current.connection}
      fontFamily={fontFamily}
      fontSize={fontSize}
      key={connectionKey}
      letterSpacing={letterSpacing}
      lineHeight={lineHeight}
      onConnectionError={onConnectionError}
      onExit={onExit}
      onReady={onReady}
      onStateChange={onStateChange}
      readOnly={readOnly}
      style={style}
      terminalOptions={terminalOptions}
      theme={theme}
      title={title ?? "Hyperbrowser Terminal"}
    />
  );
}
