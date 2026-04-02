import { useRef } from "react";
import type { TerminalConnection } from "../terminal/types";
import {
  createHyperbrowserPtyConnection,
  type HyperbrowserPtyConnectionOptions,
} from "./hyperbrowser-pty-connection";

export type UseSandboxTerminalConnectionOptions =
  HyperbrowserPtyConnectionOptions;

const DEFAULT_CLOSE_BEHAVIOR = "disconnect";
const DEFAULT_COMMAND = "bash";
const DEFAULT_CREATE_RETRY_COUNT = 4;
const DEFAULT_CREATE_RETRY_DELAY_MS = 700;
const DEFAULT_INPUT_BATCH_DELAY_MS = 16;
const DEFAULT_INPUT_BATCH_MAX_BYTES = 8192;
const DEFAULT_RECONNECT_RETRY_DELAY_MS = 1000;

const functionIdentityMap = new WeakMap<Function, number>();
let nextFunctionIdentity = 1;

function getFunctionIdentity(value: Function | undefined): string {
  if (!value) {
    return "";
  }

  const existingIdentity = functionIdentityMap.get(value);
  if (existingIdentity) {
    return `fn:${existingIdentity}`;
  }

  const nextIdentity = nextFunctionIdentity;
  nextFunctionIdentity += 1;
  functionIdentityMap.set(value, nextIdentity);
  return `fn:${nextIdentity}`;
}

function serializeStringArray(value: string[] | undefined): string {
  if (!value) {
    return "";
  }

  return JSON.stringify(value);
}

function serializeStringRecord(
  value: Record<string, string> | undefined,
): string {
  if (!value) {
    return "";
  }

  return JSON.stringify(
    Object.entries(value).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey),
    ),
  );
}

export function getSandboxTerminalConnectionIdentity(
  options: UseSandboxTerminalConnectionOptions,
): string {
  const identityParts = [
    getFunctionIdentity(options.getRuntimeAccess),
    options.existingPtyId ?? "",
    options.closeBehavior ?? DEFAULT_CLOSE_BEHAVIOR,
    options.killSignal ?? "",
    typeof options.maxReconnectAttempts === "number"
      ? String(options.maxReconnectAttempts)
      : "",
    String(options.reconnectRetryDelayMs ?? DEFAULT_RECONNECT_RETRY_DELAY_MS),
    String(options.inputBatchDelayMs ?? DEFAULT_INPUT_BATCH_DELAY_MS),
    String(options.inputBatchMaxBytes ?? DEFAULT_INPUT_BATCH_MAX_BYTES),
    getFunctionIdentity(options.fetch),
    getFunctionIdentity(options.webSocketFactory),
  ];

  if (!options.existingPtyId) {
    identityParts.push(
      options.command ?? DEFAULT_COMMAND,
      serializeStringArray(options.args),
      options.cwd ?? "",
      serializeStringRecord(options.env),
      String(options.useShell ?? ""),
      typeof options.timeoutMs === "number" ? String(options.timeoutMs) : "",
      String(options.createRetryCount ?? DEFAULT_CREATE_RETRY_COUNT),
      String(options.createRetryDelayMs ?? DEFAULT_CREATE_RETRY_DELAY_MS),
    );
  }

  return identityParts.join("|");
}

export function useSandboxTerminalConnection(
  options: UseSandboxTerminalConnectionOptions,
): TerminalConnection {
  const identity = getSandboxTerminalConnectionIdentity(options);
  const recordRef = useRef<{
    connection: TerminalConnection;
    identity: string;
  } | null>(null);

  if (!recordRef.current || recordRef.current.identity !== identity) {
    recordRef.current = {
      connection: createHyperbrowserPtyConnection(options),
      identity,
    };
  }

  return recordRef.current.connection;
}
