import type { CSSProperties } from "react";
import type { ITerminalOptions, ITheme, Terminal } from "@xterm/xterm";

export type TerminalSize = {
  cols: number;
  rows: number;
};

export type TerminalExitEvent = {
  exitCode?: number;
  error?: string;
};

export type TerminalState =
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

export type ResolvedTerminalTheme = {
  chrome: TerminalChromeTheme;
  id: string;
  label: string;
  terminal: ITheme;
  terminalOptions?: Pick<
    ITerminalOptions,
    "cursorBlink" | "cursorStyle" | "fontFamily" | "fontSize" | "letterSpacing" | "lineHeight"
  >;
};

export type TerminalTheme = Partial<ResolvedTerminalTheme> & {
  id?: string;
  label?: string;
};

export type TerminalThemeName = string;

export type TerminalSurfaceProps = {
  autoFocus?: boolean;
  className?: string;
  connection: TerminalConnection;
  fontFamily?: string;
  fontSize?: number;
  letterSpacing?: number;
  lineHeight?: number;
  onConnectionError?: (message: string) => void;
  onExit?: (event: TerminalExitEvent) => void;
  onReady?: (terminal: Terminal) => void;
  onStateChange?: (state: TerminalState) => void;
  readOnly?: boolean;
  style?: CSSProperties;
  terminalOptions?: Omit<
    Partial<ITerminalOptions>,
    "cols" | "rows" | "disableStdin" | "fontFamily" | "fontSize" | "letterSpacing" | "lineHeight" | "theme"
  >;
  theme?: TerminalTheme | TerminalThemeName;
  title?: string;
};
