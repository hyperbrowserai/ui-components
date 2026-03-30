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

function createBasicDarkTheme(): ITheme {
  return {
    ...createAnsiPalette({
      black: "#2e3436",
      blue: "#3465a4",
      brightBlack: "#555753",
      brightBlue: "#729fcf",
      brightCyan: "#34e2e2",
      brightGreen: "#8ae234",
      brightMagenta: "#ad7fa8",
      brightRed: "#ef2929",
      brightWhite: "#eeeeec",
      brightYellow: "#fce94f",
      cyan: "#06989a",
      green: "#4e9a06",
      magenta: "#75507b",
      red: "#cc0000",
      white: "#d3d7cf",
      yellow: "#c4a000",
    }),
    background: "#000000",
    cursor: "#ffffff",
    cursorAccent: "#000000",
    foreground: "#ffffff",
    selectionBackground: "rgba(255, 255, 255, 0.3)",
    selectionInactiveBackground: "rgba(255, 255, 255, 0.3)",
  };
}

function createBasicLightTheme(): ITheme {
  return {
    ...createAnsiPalette({
      black: "#2e3436",
      blue: "#3465a4",
      brightBlack: "#555753",
      brightBlue: "#729fcf",
      brightCyan: "#34e2e2",
      brightGreen: "#8ae234",
      brightMagenta: "#ad7fa8",
      brightRed: "#ef2929",
      brightWhite: "#4b5563",
      brightYellow: "#f59e0b",
      cyan: "#06989a",
      green: "#4e9a06",
      magenta: "#75507b",
      red: "#cc0000",
      white: "#6b7280",
      yellow: "#c4a000",
    }),
    background: "#f7f7f7",
    cursor: "#111111",
    cursorAccent: "#f7f7f7",
    foreground: "#111111",
    selectionBackground: "rgba(0, 0, 0, 0.16)",
    selectionInactiveBackground: "rgba(0, 0, 0, 0.1)",
  };
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

function createSkylineDarkTheme(): ITheme {
  return {
    ...createAnsiPalette({
      black: "#102231",
      blue: "#36b6f0",
      brightBlack: "#5f7687",
      brightBlue: "#7ed8ff",
      brightCyan: "#9fe8ff",
      brightGreen: "#7ee6a4",
      brightMagenta: "#d8cbff",
      brightRed: "#ff9b9b",
      brightWhite: "#f7fcff",
      brightYellow: "#ffd37f",
      cyan: "#67d7ff",
      green: "#4fd18f",
      magenta: "#c1b2f9",
      red: "#f87171",
      white: "#d9edf8",
      yellow: "#f6b453",
    }),
    background: "#081a24",
    cursor: "#36b6f0",
    cursorAccent: "#081a24",
    foreground: "#ffffff",
    selectionBackground: "rgba(193, 178, 249, 0.16)",
    selectionInactiveBackground: "rgba(193, 178, 249, 0.1)",
  };
}

function createSkylineLightTheme(): ITheme {
  return {
    ...createAnsiPalette({
      black: "#143041",
      blue: "#0484c7",
      brightBlack: "#6f8491",
      brightBlue: "#36b6f0",
      brightCyan: "#5fd7f5",
      brightGreen: "#2cc56f",
      brightMagenta: "#ab96f2",
      brightRed: "#f27c7c",
      brightWhite: "#ffffff",
      brightYellow: "#f6bf5b",
      cyan: "#1993d3",
      green: "#16a34a",
      magenta: "#8f7de6",
      red: "#dc6b6b",
      white: "#f2fbff",
      yellow: "#d7931f",
    }),
    background: "#f2fbff",
    cursor: "#0484c7",
    cursorAccent: "#f2fbff",
    foreground: "#000000",
    selectionBackground: "rgba(25, 147, 211, 0.1)",
    selectionInactiveBackground: "rgba(25, 147, 211, 0.06)",
  };
}

function createBreezeDarkTheme(): ITheme {
  return {
    ...createAnsiPalette({
      black: "#231627",
      blue: "#6599ff",
      brightBlack: "#74606f",
      brightBlue: "#90b4ff",
      brightCyan: "#8ff4ff",
      brightGreen: "#84f0c7",
      brightMagenta: "#ffc1ff",
      brightRed: "#ff7cab",
      brightWhite: "#fff8fc",
      brightYellow: "#ffd18a",
      cyan: "#49e8f2",
      green: "#55e7b2",
      magenta: "#e9aefe",
      red: "#f8518d",
      white: "#f4e6ef",
      yellow: "#f4b25d",
    }),
    background: "#160d1f",
    cursor: "#f8518d",
    cursorAccent: "#160d1f",
    foreground: "#fff4fb",
    selectionBackground: "rgba(248, 81, 141, 0.16)",
    selectionInactiveBackground: "rgba(248, 81, 141, 0.1)",
  };
}

function createBreezeLightTheme(): ITheme {
  return {
    ...createAnsiPalette({
      black: "#5f5260",
      blue: "#496eb8",
      brightBlack: "#8c828b",
      brightBlue: "#6b8dd1",
      brightCyan: "#38a6af",
      brightGreen: "#36a078",
      brightMagenta: "#a27bad",
      brightRed: "#da5f89",
      brightWhite: "#5b4854",
      brightYellow: "#d39a54",
      cyan: "#0b7880",
      green: "#24805e",
      magenta: "#886594",
      red: "#c44170",
      white: "#745f6d",
      yellow: "#b98332",
    }),
    background: "#fff5fb",
    cursor: "#c44170",
    cursorAccent: "#fff5fb",
    foreground: "#5a4753",
    selectionBackground: "rgba(196, 65, 112, 0.14)",
    selectionInactiveBackground: "rgba(196, 65, 112, 0.08)",
  };
}

export const terminalPresets = {
  basic: definePreset({
    id: "basic",
    label: "Basic",
    chrome: {
      dark: {
        accent: "#ffffff",
        background: "#0a0a0a",
        border: "rgba(255, 255, 255, 0.12)",
        panel: "rgba(12, 12, 12, 0.96)",
        panelMuted: "rgba(20, 20, 20, 0.94)",
        shadow: "rgba(0, 0, 0, 0.42)",
        text: "#f5f5f5",
        textMuted: "#9ca3af",
      },
      light: {
        accent: "#111111",
        background: "#f3f4f6",
        border: "rgba(17, 17, 17, 0.1)",
        panel: "rgba(255, 255, 255, 0.96)",
        panelMuted: "rgba(243, 244, 246, 0.96)",
        shadow: "rgba(17, 17, 17, 0.08)",
        text: "#111111",
        textMuted: "#6b7280",
      },
    },
    terminal: {
      dark: createBasicDarkTheme(),
      light: createBasicLightTheme(),
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "block",
    },
  }),
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
  skyline: definePreset({
    id: "skyline",
    label: "Skyline",
    chrome: {
      dark: {
        accent: "#36b6f0",
        background: "#0b2230",
        border: "rgba(54, 182, 240, 0.18)",
        panel: "rgba(12, 34, 48, 0.96)",
        panelMuted: "rgba(15, 41, 58, 0.94)",
        shadow: "rgba(3, 14, 20, 0.42)",
        text: "#f3fbff",
        textMuted: "#8fb2c3",
      },
      light: {
        accent: "#0484c7",
        background: "#e9f7ff",
        border: "rgba(4, 132, 199, 0.14)",
        panel: "rgba(255, 255, 255, 0.96)",
        panelMuted: "rgba(236, 248, 255, 0.96)",
        shadow: "rgba(8, 71, 103, 0.12)",
        text: "#0a2230",
        textMuted: "#5c7b8a",
      },
    },
    terminal: {
      dark: createSkylineDarkTheme(),
      light: createSkylineLightTheme(),
    },
    terminalOptions: {
      cursorBlink: true,
      cursorStyle: "bar",
    },
  }),
  breeze: definePreset({
    id: "breeze",
    label: "Breeze",
    chrome: {
      dark: {
        accent: "#f8518d",
        background: "#201129",
        border: "rgba(248, 81, 141, 0.16)",
        panel: "rgba(34, 18, 43, 0.96)",
        panelMuted: "rgba(46, 23, 55, 0.94)",
        shadow: "rgba(12, 4, 16, 0.4)",
        text: "#fff7fc",
        textMuted: "#b89dae",
      },
      light: {
        accent: "#c44170",
        background: "#fff1f8",
        border: "rgba(196, 65, 112, 0.14)",
        panel: "rgba(255, 255, 255, 0.96)",
        panelMuted: "rgba(255, 243, 249, 0.96)",
        shadow: "rgba(146, 66, 109, 0.12)",
        text: "#434447",
        textMuted: "#8c828b",
      },
    },
    terminal: {
      dark: createBreezeDarkTheme(),
      light: createBreezeLightTheme(),
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
