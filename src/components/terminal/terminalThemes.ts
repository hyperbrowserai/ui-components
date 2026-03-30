import type { ITerminalOptions, ITheme } from "@xterm/xterm";
import type {
  ResolvedTerminalTheme,
  TerminalAppearance,
  TerminalChromeTheme,
  TerminalOptionOverrides,
  TerminalPreset,
  TerminalPresetName,
  TerminalSurfaceTheme,
  TerminalTheme,
} from "./types";

type NormalizedThemeInput = {
  chromeTheme?: Partial<TerminalChromeTheme>;
  appearance?: TerminalAppearance;
  preset?: TerminalPresetName;
  terminalOptions?: TerminalOptionOverrides;
  terminalTheme?: Partial<ITheme>;
};

const DEFAULT_TERMINAL_APPEARANCE: TerminalAppearance = "dark";

export const defaultTerminalAppearance = DEFAULT_TERMINAL_APPEARANCE;

export const defaultTerminalOptions = {
  cursorBlink: true,
  cursorStyle: "bar",
  fontFamily:
    '"IBM Plex Mono", "SFMono-Regular", ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  fontSize: 14,
  letterSpacing: 0,
  lineHeight: 1.2,
} as const satisfies Pick<
  ITerminalOptions,
  | "cursorBlink"
  | "cursorStyle"
  | "fontFamily"
  | "fontSize"
  | "letterSpacing"
  | "lineHeight"
>;

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

function definePreset(preset: TerminalPreset): TerminalPreset {
  return preset;
}

function createGraphiteDarkTheme(): ITheme {
  return {
    ...createAnsiPalette({
      black: "#1f1f1f",
      blue: "#7aa2ff",
      brightBlack: "#6b6b6b",
      brightBlue: "#a6beff",
      brightCyan: "#9fe5ff",
      brightGreen: "#9ae7b0",
      brightMagenta: "#f1a8ff",
      brightRed: "#ff9f9f",
      brightWhite: "#ffffff",
      brightYellow: "#ffe08a",
      cyan: "#63cfe3",
      green: "#73c991",
      magenta: "#d98cff",
      red: "#ff6b7a",
      white: "#d8d8d8",
      yellow: "#d1ad63",
    }),
    background: "#1f1f1f",
    cursor: "#7aa2ff",
    cursorAccent: "#1f1f1f",
    foreground: "#ededed",
    selectionBackground: "rgba(122, 162, 255, 0.24)",
    selectionInactiveBackground: "rgba(122, 162, 255, 0.14)",
  };
}

function createGraphiteLightTheme(): ITheme {
  return {
    ...createAnsiPalette({
      black: "#202020",
      blue: "#3f6fe5",
      brightBlack: "#727272",
      brightBlue: "#5a84f0",
      brightCyan: "#228fcb",
      brightGreen: "#2d9b54",
      brightMagenta: "#b34dd1",
      brightRed: "#d3475c",
      brightWhite: "#fafafa",
      brightYellow: "#b98512",
      cyan: "#176b98",
      green: "#257d47",
      magenta: "#9442af",
      red: "#b63b4e",
      white: "#f2f2f2",
      yellow: "#946c18",
    }),
    background: "#f7f7f7",
    cursor: "#3f6fe5",
    cursorAccent: "#f7f7f7",
    foreground: "#171717",
    selectionBackground: "rgba(63, 111, 229, 0.18)",
    selectionInactiveBackground: "rgba(63, 111, 229, 0.1)",
  };
}

export const terminalPresets = {
  atlas: definePreset({
    id: "atlas",
    label: "Atlas",
    chrome: {
      dark: {
        accent: "#6ce0ca",
        background: "#071013",
        border: "rgba(108, 224, 202, 0.22)",
        panel: "rgba(9, 22, 26, 0.94)",
        panelMuted: "rgba(12, 30, 35, 0.88)",
        shadow: "rgba(2, 8, 10, 0.48)",
        text: "#e5fbf5",
        textMuted: "#8cabaa",
      },
      light: {
        accent: "#187d74",
        background: "#edf8f5",
        border: "rgba(24, 125, 116, 0.14)",
        panel: "rgba(255, 255, 255, 0.96)",
        panelMuted: "rgba(238, 247, 245, 0.96)",
        shadow: "rgba(15, 41, 40, 0.1)",
        text: "#143735",
        textMuted: "#54706d",
      },
    },
    terminal: {
      dark: {
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
      light: {
        ...createAnsiPalette({
          black: "#153137",
          blue: "#2f77b7",
          brightBlack: "#68838a",
          brightBlue: "#4e9adf",
          brightCyan: "#2198a0",
          brightGreen: "#3b9a57",
          brightMagenta: "#a05bd0",
          brightRed: "#cf5b62",
          brightWhite: "#fbfffe",
          brightYellow: "#c7952f",
          cyan: "#176f76",
          green: "#2d7d46",
          magenta: "#8b49b9",
          red: "#b24953",
          white: "#eff8f6",
          yellow: "#9a731f",
        }),
        background: "#f6fffc",
        cursor: "#187d74",
        cursorAccent: "#f6fffc",
        foreground: "#163638",
        selectionBackground: "rgba(24, 125, 116, 0.18)",
        selectionInactiveBackground: "rgba(24, 125, 116, 0.1)",
      },
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "bar",
    },
  }),
  paper: definePreset({
    id: "paper",
    label: "Paper",
    chrome: {
      dark: {
        accent: "#d5a86a",
        background: "#1a1410",
        border: "rgba(213, 168, 106, 0.18)",
        panel: "rgba(27, 20, 16, 0.96)",
        panelMuted: "rgba(38, 28, 22, 0.92)",
        shadow: "rgba(5, 2, 1, 0.4)",
        text: "#f7ead8",
        textMuted: "#b6a48c",
      },
      light: {
        accent: "#9a5c24",
        background: "#f5eedf",
        border: "rgba(139, 96, 37, 0.18)",
        panel: "rgba(255, 251, 243, 0.96)",
        panelMuted: "rgba(246, 237, 223, 0.96)",
        shadow: "rgba(95, 71, 43, 0.15)",
        text: "#2f261a",
        textMuted: "#736148",
      },
    },
    terminal: {
      dark: {
        ...createAnsiPalette({
          black: "#2c2118",
          blue: "#7da7ee",
          brightBlack: "#8f7c68",
          brightBlue: "#a3c1ff",
          brightCyan: "#7fdad1",
          brightGreen: "#a4c97c",
          brightMagenta: "#d9a7ed",
          brightRed: "#f0a890",
          brightWhite: "#fff5ea",
          brightYellow: "#f0cf82",
          cyan: "#57b9ae",
          green: "#86ad63",
          magenta: "#c286d8",
          red: "#db8a70",
          white: "#e6d3bf",
          yellow: "#d0a44f",
        }),
        background: "#16110d",
        cursor: "#d5a86a",
        cursorAccent: "#16110d",
        foreground: "#f4e6d2",
        selectionBackground: "rgba(213, 168, 106, 0.22)",
        selectionInactiveBackground: "rgba(213, 168, 106, 0.12)",
      },
      light: {
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
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "block",
    },
  }),
  ember: definePreset({
    id: "ember",
    label: "Ember",
    chrome: {
      dark: {
        accent: "#ff8b5b",
        background: "#180d0d",
        border: "rgba(255, 139, 91, 0.2)",
        panel: "rgba(29, 16, 16, 0.95)",
        panelMuted: "rgba(40, 20, 20, 0.92)",
        shadow: "rgba(9, 2, 2, 0.45)",
        text: "#ffe8dd",
        textMuted: "#b79d94",
      },
      light: {
        accent: "#c2552d",
        background: "#fff2ea",
        border: "rgba(194, 85, 45, 0.16)",
        panel: "rgba(255, 255, 255, 0.96)",
        panelMuted: "rgba(252, 241, 236, 0.96)",
        shadow: "rgba(120, 51, 28, 0.14)",
        text: "#3b231b",
        textMuted: "#8a6559",
      },
    },
    terminal: {
      dark: {
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
      light: {
        ...createAnsiPalette({
          black: "#3a1d1c",
          blue: "#416fd4",
          brightBlack: "#8e6d69",
          brightBlue: "#5f90ee",
          brightCyan: "#1b9fb4",
          brightGreen: "#3e9b61",
          brightMagenta: "#c25ab0",
          brightRed: "#df7457",
          brightWhite: "#fff8f4",
          brightYellow: "#d39f3f",
          cyan: "#0c8393",
          green: "#2f7e4e",
          magenta: "#a74d9a",
          red: "#c45a3b",
          white: "#f8e6dc",
          yellow: "#ab7720",
        }),
        background: "#fff7f2",
        cursor: "#c2552d",
        cursorAccent: "#fff7f2",
        foreground: "#3a221b",
        selectionBackground: "rgba(194, 85, 45, 0.18)",
        selectionInactiveBackground: "rgba(194, 85, 45, 0.1)",
      },
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "underline",
    },
  }),
  graphite: definePreset({
    id: "graphite",
    label: "Graphite",
    chrome: {
      dark: {
        accent: "#7aa2ff",
        background: "#171717",
        border: "rgba(122, 162, 255, 0.16)",
        panel: "rgba(24, 24, 24, 0.96)",
        panelMuted: "rgba(31, 31, 31, 0.94)",
        shadow: "rgba(0, 0, 0, 0.4)",
        text: "#f0f0f0",
        textMuted: "#a0a0a0",
      },
      light: {
        accent: "#3f6fe5",
        background: "#f2f2f2",
        border: "rgba(63, 111, 229, 0.14)",
        panel: "rgba(255, 255, 255, 0.96)",
        panelMuted: "rgba(245, 245, 245, 0.96)",
        shadow: "rgba(17, 17, 17, 0.08)",
        text: "#171717",
        textMuted: "#666666",
      },
    },
    terminal: {
      dark: createGraphiteDarkTheme(),
      light: createGraphiteLightTheme(),
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "bar",
    },
  }),
} as const satisfies Record<TerminalPresetName, TerminalPreset>;

export const defaultTerminalPreset = terminalPresets.atlas;

function mergeChromeTheme(
  base: TerminalChromeTheme,
  override: Partial<TerminalChromeTheme> | undefined,
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

function normalizeThemeInput(
  input: TerminalSurfaceTheme | undefined,
): NormalizedThemeInput {
  if (!input) {
    return {};
  }

  return {
    appearance: input.appearance,
    chromeTheme: input.chromeTheme,
    preset: input.preset,
    terminalOptions: input.terminalOptions,
    terminalTheme: input.terminalTheme,
  };
}

function pickThemeTerminalOptions(
  options: TerminalOptionOverrides | undefined,
): ResolvedTerminalTheme["terminalOptions"] {
  if (!options) {
    return undefined;
  }

  const terminalOptions: ResolvedTerminalTheme["terminalOptions"] = {};

  if (typeof options.cursorBlink === "boolean") {
    terminalOptions.cursorBlink = options.cursorBlink;
  }
  if (typeof options.cursorStyle === "string") {
    terminalOptions.cursorStyle = options.cursorStyle;
  }

  return Object.keys(terminalOptions).length > 0 ? terminalOptions : undefined;
}

export function createTerminalTheme(
  presetOrTheme: TerminalPresetName | TerminalTheme,
  overrides: Omit<TerminalTheme, "preset"> = {},
): TerminalTheme {
  if (typeof presetOrTheme === "string") {
    return {
      preset: presetOrTheme,
      ...overrides,
    };
  }

  return presetOrTheme;
}

export function resolveTerminalTheme(
  input?: TerminalSurfaceTheme,
): ResolvedTerminalTheme {
  const normalizedInput = normalizeThemeInput(input);
  const appearance =
    normalizedInput.appearance ?? defaultTerminalAppearance;
  const basePreset =
    (normalizedInput.preset &&
      terminalPresets[normalizedInput.preset as TerminalPresetName]) ||
    defaultTerminalPreset;
  const resolvedTerminalOptions = {
    ...basePreset.terminalOptions,
    ...pickThemeTerminalOptions(normalizedInput.terminalOptions),
  };

  return {
    appearance,
    chrome: mergeChromeTheme(
      basePreset.chrome[appearance],
      normalizedInput.chromeTheme,
    ),
    id: basePreset.id,
    label: basePreset.label,
    terminal: {
      ...basePreset.terminal[appearance],
      ...normalizedInput.terminalTheme,
    },
    terminalOptions:
      Object.keys(resolvedTerminalOptions).length > 0
        ? resolvedTerminalOptions
        : undefined,
  };
}

export const defaultTerminalTheme = resolveTerminalTheme();
