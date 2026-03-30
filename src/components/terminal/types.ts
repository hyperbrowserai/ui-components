import type { CSSProperties, MutableRefObject } from "react";
import type { ITerminalOptions, ITheme, Terminal } from "@xterm/xterm";

export type TerminalSize = {
  cols: number;
  rows: number;
};

export type TerminalExitEvent = {
  exitCode?: number;
  error?: string;
};

export type TerminalStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "closed"
  | "error";

export type TerminalUnsubscribe = () => void;

export type TerminalOutputListener = (data: Uint8Array) => void;

export type TerminalExitListener = (event: TerminalExitEvent) => void;

export type TerminalConnectParams = TerminalSize & {
  signal: AbortSignal;
};

export type TerminalSession = {
  writeInput(data: string | Uint8Array): void | Promise<void>;
  resize(size: TerminalSize): void | Promise<void>;
  close(): void | Promise<void>;
  onOutput(listener: TerminalOutputListener): TerminalUnsubscribe;
  onExit(listener: TerminalExitListener): TerminalUnsubscribe;
};

export type TerminalConnection = {
  connect(params: TerminalConnectParams): Promise<TerminalSession>;
};

export type TerminalChromeTheme = {
  accent: string;
  background: string;
  border: string;
  panel: string;
  panelMuted: string;
  shadow: string;
  text: string;
  textMuted: string;
};

export type TerminalAppearance = "dark" | "light";

export type TerminalPresetName =
  | "basic"
  | "atlas"
  | "paper"
  | "ember"
  | "graphite"
  | "skyline"
  | "breeze";

export type TerminalOptionOverrides = Omit<
  Partial<ITerminalOptions>,
  "cols" | "rows" | "disableStdin" | "theme"
>;

export type TerminalPreset = {
  chrome: Record<TerminalAppearance, TerminalChromeTheme>;
  id: TerminalPresetName;
  label: string;
  terminal: Record<TerminalAppearance, ITheme>;
  terminalOptions?: Pick<ITerminalOptions, "cursorBlink" | "cursorStyle">;
};

export type ResolvedTerminalTheme = {
  appearance: TerminalAppearance;
  chrome: TerminalChromeTheme;
  id: string;
  label: string;
  terminal: ITheme;
  terminalOptions?: Pick<ITerminalOptions, "cursorBlink" | "cursorStyle">;
};

export type TerminalTheme = {
  appearance?: TerminalAppearance;
  preset?: TerminalPresetName;
  terminalOptions?: TerminalOptionOverrides;
  terminalTheme?: Partial<ITheme>;
};

export type TerminalSurfaceTheme = TerminalTheme & {
  chromeTheme?: Partial<TerminalChromeTheme>;
};

type TerminalBehaviorProps = {
  autoFocus?: boolean;
  connection: TerminalConnection;
  onConnectionError?: (message: string) => void;
  onExit?: (event: TerminalExitEvent) => void;
  onReady?: (terminal: Terminal) => void;
  onStatusChange?: (status: TerminalStatus) => void;
  appearance?: TerminalAppearance;
  preset?: TerminalPresetName;
  readOnly?: boolean;
  terminalOptions?: TerminalOptionOverrides;
  terminalTheme?: Partial<ITheme>;
};

export type TerminalSurfaceProps = TerminalBehaviorProps & {
  chromeTheme?: Partial<TerminalChromeTheme>;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export type UseTerminalOptions = TerminalBehaviorProps;

export type UseTerminalResult = {
  errorMessage: string | null;
  status: TerminalStatus;
  terminal: Terminal | null;
  viewportRef: MutableRefObject<HTMLDivElement | null>;
};

export type BaseTerminalProps = UseTerminalOptions & {
  className?: string;
  style?: CSSProperties;
};
