import type { ITheme } from "@xterm/xterm";
import type {
  ResolvedTerminalTheme,
  TerminalChromeTheme,
  TerminalTheme,
  TerminalThemeName,
} from "./types";

function createAnsiPalette(colors: {
  black: string;
  blue: string;
  brightBlack: string;
  brightBlue: string;
  brightCyan: string;
  brightGreen: string;
  brightMagenta: string;
  brightRed: string;
  brightWhite: string;
  brightYellow: string;
  cyan: string;
  green: string;
  magenta: string;
  red: string;
  white: string;
  yellow: string;
}): ITheme {
  return { ...colors };
}

function defineTheme(theme: ResolvedTerminalTheme): ResolvedTerminalTheme {
  return theme;
}

export const terminalThemePresets = {
  atlas: defineTheme({
    id: "atlas",
    label: "Atlas",
    chrome: {
      accent: "#6ce0ca",
      background: "#071013",
      border: "rgba(108, 224, 202, 0.22)",
      panel: "rgba(9, 22, 26, 0.94)",
      panelMuted: "rgba(12, 30, 35, 0.88)",
      shadow: "rgba(2, 8, 10, 0.48)",
      text: "#e5fbf5",
      textMuted: "#8cabaa",
    },
    terminal: {
      ...createAnsiPalette({
        black: "#102026",
        blue: "#63b7ff",
        brightBlack: "#58717d",
        brightBlue: "#8fd0ff",
        brightCyan: "#95f1ff",
        brightGreen: "#9df5b3",
        brightMagenta: "#f5a8ff",
        brightRed: "#ff8d8d",
        brightWhite: "#f4fffd",
        brightYellow: "#ffe08c",
        cyan: "#6ce0ca",
        green: "#62d882",
        magenta: "#d78bff",
        red: "#ff7272",
        white: "#d5ebe4",
        yellow: "#d6bf67",
      }),
      background: "#050c0f",
      cursor: "#6ce0ca",
      cursorAccent: "#031113",
      foreground: "#d9f8f0",
      selectionBackground: "rgba(108, 224, 202, 0.26)",
      selectionInactiveBackground: "rgba(108, 224, 202, 0.16)",
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: '"Iosevka Hyper", "IBM Plex Mono", "SFMono-Regular", monospace',
      fontSize: 14,
      letterSpacing: 0,
      lineHeight: 1.2,
    },
  }),
  paper: defineTheme({
    id: "paper",
    label: "Paper",
    chrome: {
      accent: "#9a5c24",
      background: "#f5eedf",
      border: "rgba(139, 96, 37, 0.18)",
      panel: "rgba(255, 251, 243, 0.96)",
      panelMuted: "rgba(246, 237, 223, 0.96)",
      shadow: "rgba(95, 71, 43, 0.15)",
      text: "#2f261a",
      textMuted: "#736148",
    },
    terminal: {
      ...createAnsiPalette({
        black: "#31241a",
        blue: "#295eb6",
        brightBlack: "#7e6b54",
        brightBlue: "#4c7fe2",
        brightCyan: "#2c9c96",
        brightGreen: "#5f8f2d",
        brightMagenta: "#9c54af",
        brightRed: "#c7553a",
        brightWhite: "#fffdf7",
        brightYellow: "#b88417",
        cyan: "#127f7a",
        green: "#486f1c",
        magenta: "#82439b",
        red: "#a7432d",
        white: "#f3ead8",
        yellow: "#966b0c",
      }),
      background: "#fff8ea",
      cursor: "#9a5c24",
      cursorAccent: "#fff6e2",
      foreground: "#302518",
      selectionBackground: "rgba(154, 92, 36, 0.22)",
      selectionInactiveBackground: "rgba(154, 92, 36, 0.12)",
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: '"Berkeley Mono", "IBM Plex Mono", "SFMono-Regular", monospace',
      fontSize: 14,
      letterSpacing: 0,
      lineHeight: 1.25,
    },
  }),
  ember: defineTheme({
    id: "ember",
    label: "Ember",
    chrome: {
      accent: "#ff8b5b",
      background: "#180d0d",
      border: "rgba(255, 139, 91, 0.2)",
      panel: "rgba(29, 16, 16, 0.95)",
      panelMuted: "rgba(40, 20, 20, 0.92)",
      shadow: "rgba(9, 2, 2, 0.45)",
      text: "#ffe8dd",
      textMuted: "#b79d94",
    },
    terminal: {
      ...createAnsiPalette({
        black: "#231111",
        blue: "#7db0ff",
        brightBlack: "#755f5f",
        brightBlue: "#a5c7ff",
        brightCyan: "#8df0f0",
        brightGreen: "#9ae29d",
        brightMagenta: "#f0a3e2",
        brightRed: "#ff9d8f",
        brightWhite: "#fff1ea",
        brightYellow: "#ffd183",
        cyan: "#5ad0d0",
        green: "#70c778",
        magenta: "#dd83c7",
        red: "#ff6f61",
        white: "#ecd3cb",
        yellow: "#d7a854",
      }),
      background: "#120708",
      cursor: "#ff8b5b",
      cursorAccent: "#180d0d",
      foreground: "#f8ddd3",
      selectionBackground: "rgba(255, 139, 91, 0.26)",
      selectionInactiveBackground: "rgba(255, 139, 91, 0.14)",
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "underline",
      fontFamily: '"JetBrains Mono", "IBM Plex Mono", "SFMono-Regular", monospace',
      fontSize: 14,
      letterSpacing: 0,
      lineHeight: 1.2,
    },
  }),
} as const satisfies Record<string, ResolvedTerminalTheme>;

export const defaultTerminalTheme = terminalThemePresets.atlas;
const terminalThemePresetLookup: Record<string, ResolvedTerminalTheme> =
  terminalThemePresets;

function mergeChromeTheme(
  base: TerminalChromeTheme,
  override: Partial<TerminalChromeTheme> | undefined
): TerminalChromeTheme {
  return {
    accent: override?.accent ?? base.accent,
    background: override?.background ?? base.background,
    border: override?.border ?? base.border,
    panel: override?.panel ?? base.panel,
    panelMuted: override?.panelMuted ?? base.panelMuted,
    shadow: override?.shadow ?? base.shadow,
    text: override?.text ?? base.text,
    textMuted: override?.textMuted ?? base.textMuted,
  };
}

export function resolveTerminalTheme(
  theme: TerminalTheme | TerminalThemeName | undefined
): ResolvedTerminalTheme {
  if (!theme) {
    return defaultTerminalTheme;
  }

  if (typeof theme === "string") {
    return terminalThemePresetLookup[theme] ?? defaultTerminalTheme;
  }

  const baseTheme =
    typeof theme.id === "string" && terminalThemePresetLookup[theme.id]
      ? terminalThemePresetLookup[theme.id]
      : defaultTerminalTheme;

  return {
    chrome: mergeChromeTheme(baseTheme.chrome, theme.chrome),
    id: theme.id ?? baseTheme.id,
    label: theme.label ?? baseTheme.label,
    terminal: {
      ...baseTheme.terminal,
      ...theme.terminal,
    },
    terminalOptions: {
      ...baseTheme.terminalOptions,
      ...theme.terminalOptions,
    },
  };
}
