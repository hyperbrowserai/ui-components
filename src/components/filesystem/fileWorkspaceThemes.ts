import type {
  FileWorkspaceAppearance,
  FileWorkspaceChromeTheme,
  FileWorkspaceEditorTheme,
  FileWorkspaceSurfaceTheme,
  LegacyFileWorkspaceTheme,
  FileWorkspacePreset,
  FileWorkspacePresetName,
  FileWorkspaceTheme,
  FileWorkspaceThemeName,
  ResolvedFileWorkspaceTheme,
} from "./types";

type NormalizedThemeInput = {
  appearance?: FileWorkspaceAppearance;
  chromeTheme?: Partial<FileWorkspaceChromeTheme>;
  editorTheme?: Partial<FileWorkspaceEditorTheme>;
  preset?: FileWorkspacePresetName;
};

const DEFAULT_FILE_WORKSPACE_APPEARANCE: FileWorkspaceAppearance = "light";

const baseFileWorkspaceEditorTheme = {
  fontFamily:
    '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  fontSize: 14,
  lineHeight: 1.5,
} as const;

const legacyThemeAliases: Record<
  string,
  { appearance: FileWorkspaceAppearance; preset: FileWorkspacePresetName }
> = {
  "basic-dark": {
    appearance: "dark",
    preset: "basic",
  },
  "atlas-dark": {
    appearance: "dark",
    preset: "atlas",
  },
  "ledger-dark": {
    appearance: "dark",
    preset: "ledger",
  },
};

function definePreset(preset: FileWorkspacePreset): FileWorkspacePreset {
  return preset;
}

function mergeChromeTheme(
  base: FileWorkspaceChromeTheme,
  override: Partial<FileWorkspaceChromeTheme> | undefined
): FileWorkspaceChromeTheme {
  return {
    accent: override?.accent ?? base.accent,
    background: override?.background ?? base.background,
    border: override?.border ?? base.border,
    danger: override?.danger ?? base.danger,
    divider: override?.divider ?? base.divider,
    editorBackground: override?.editorBackground ?? base.editorBackground,
    panel: override?.panel ?? base.panel,
    panelMuted: override?.panelMuted ?? base.panelMuted,
    rowActive: override?.rowActive ?? base.rowActive,
    rowHover: override?.rowHover ?? base.rowHover,
    shadow: override?.shadow ?? base.shadow,
    text: override?.text ?? base.text,
    textMuted: override?.textMuted ?? base.textMuted,
    warning: override?.warning ?? base.warning,
  };
}

function mergeEditorTheme(
  base: FileWorkspaceEditorTheme,
  override: Partial<FileWorkspaceEditorTheme> | undefined
): FileWorkspaceEditorTheme {
  return {
    fontFamily: override?.fontFamily ?? base.fontFamily,
    fontSize: override?.fontSize ?? base.fontSize,
    lineHeight: override?.lineHeight ?? base.lineHeight,
  };
}

function isLegacyThemeInput(
  input: FileWorkspaceTheme
): input is LegacyFileWorkspaceTheme {
  return "chrome" in input || "editor" in input;
}

function normalizeThemeInput(input: FileWorkspaceTheme | undefined): NormalizedThemeInput {
  if (!input) {
    return {};
  }

  if (isLegacyThemeInput(input)) {
    return {
      appearance: input.appearance,
      chromeTheme: input.chrome,
      editorTheme: input.editor,
      preset: input.preset,
    };
  }

  const normalizedInput = input as FileWorkspaceSurfaceTheme;
  return {
    appearance: normalizedInput.appearance,
    chromeTheme: normalizedInput.chromeTheme,
    editorTheme: normalizedInput.editorTheme,
    preset: normalizedInput.preset,
  };
}

function normalizeThemeName(
  input: FileWorkspaceThemeName | undefined
): NormalizedThemeInput {
  if (!input) {
    return {};
  }

  const legacyAlias = legacyThemeAliases[input];
  if (legacyAlias) {
    return legacyAlias;
  }

  return {
    preset: input as FileWorkspacePresetName,
  };
}

export const defaultFileWorkspaceAppearance = DEFAULT_FILE_WORKSPACE_APPEARANCE;

export const fileWorkspacePresets = {
  basic: definePreset({
    id: "basic",
    label: "Basic",
    chrome: {
      dark: {
        accent: "#ffffff",
        background: "#0a0a0a",
        border: "rgba(255, 255, 255, 0.12)",
        danger: "#ff7b72",
        divider: "rgba(255, 255, 255, 0.1)",
        editorBackground: "#050505",
        panel: "rgba(12, 12, 12, 0.96)",
        panelMuted: "rgba(20, 20, 20, 0.94)",
        rowActive: "rgba(255, 255, 255, 0.1)",
        rowHover: "rgba(255, 255, 255, 0.06)",
        shadow: "0 24px 48px rgba(0, 0, 0, 0.42)",
        text: "#f5f5f5",
        textMuted: "#9ca3af",
        warning: "#f3b35b",
      },
      light: {
        accent: "#111111",
        background: "#f3f4f6",
        border: "rgba(17, 17, 17, 0.1)",
        danger: "#b91c1c",
        divider: "rgba(17, 17, 17, 0.08)",
        editorBackground: "#ffffff",
        panel: "rgba(255, 255, 255, 0.96)",
        panelMuted: "rgba(243, 244, 246, 0.96)",
        rowActive: "#e5e7eb",
        rowHover: "#f3f4f6",
        shadow: "0 24px 48px rgba(17, 17, 17, 0.08)",
        text: "#111111",
        textMuted: "#6b7280",
        warning: "#b45309",
      },
    },
    editor: {
      dark: baseFileWorkspaceEditorTheme,
      light: baseFileWorkspaceEditorTheme,
    },
  }),
  atlas: definePreset({
    id: "atlas",
    label: "Atlas",
    chrome: {
      dark: {
        accent: "#3d80e8",
        background: "#0a121d",
        border: "#233347",
        danger: "#f97066",
        divider: "#1e3044",
        editorBackground: "#08111a",
        panel: "#0f1926",
        panelMuted: "#0b1420",
        rowActive: "#15314d",
        rowHover: "#11263b",
        shadow: "0 24px 48px rgba(2, 6, 23, 0.52)",
        text: "#edf4ff",
        textMuted: "#92a7be",
        warning: "#f0a63d",
      },
      light: {
        accent: "#1267d6",
        background: "#eef3f7",
        border: "#d7e0ea",
        danger: "#b42318",
        divider: "#d7e0ea",
        editorBackground: "#fbfdff",
        panel: "#ffffff",
        panelMuted: "#f5f8fb",
        rowActive: "#dfeeff",
        rowHover: "#eef5ff",
        shadow: "0 24px 48px rgba(15, 23, 42, 0.08)",
        text: "#10243b",
        textMuted: "#62748a",
        warning: "#b54708",
      },
    },
    editor: {
      dark: baseFileWorkspaceEditorTheme,
      light: baseFileWorkspaceEditorTheme,
    },
  }),
  ledger: definePreset({
    id: "ledger",
    label: "Ledger",
    chrome: {
      dark: {
        accent: "#1f9c74",
        background: "#17120d",
        border: "#3a2f23",
        danger: "#ff8a7a",
        divider: "#34291f",
        editorBackground: "#120e09",
        panel: "#211913",
        panelMuted: "#19130e",
        rowActive: "#14342a",
        rowHover: "#11261f",
        shadow: "0 24px 48px rgba(7, 5, 3, 0.5)",
        text: "#f3ece2",
        textMuted: "#b4a695",
        warning: "#e2a13c",
      },
      light: {
        accent: "#0a8b67",
        background: "#f4f1ea",
        border: "#ddd5c7",
        danger: "#ab1f2f",
        divider: "#ddd5c7",
        editorBackground: "#fffdf9",
        panel: "#fffdf8",
        panelMuted: "#f8f4ec",
        rowActive: "#e8f6ef",
        rowHover: "#f4faf7",
        shadow: "0 22px 44px rgba(55, 48, 35, 0.09)",
        text: "#21312c",
        textMuted: "#6a7169",
        warning: "#9c5d00",
      },
    },
    editor: {
      dark: baseFileWorkspaceEditorTheme,
      light: baseFileWorkspaceEditorTheme,
    },
  }),
} satisfies Record<FileWorkspacePresetName, FileWorkspacePreset>;

export const fileWorkspaceThemePresets = fileWorkspacePresets;

export const defaultFileWorkspacePreset = fileWorkspacePresets.atlas;

export function createFileWorkspaceTheme(
  presetOrTheme: FileWorkspacePresetName | FileWorkspaceSurfaceTheme,
  overrides: Omit<FileWorkspaceSurfaceTheme, "preset"> = {}
): FileWorkspaceSurfaceTheme {
  if (typeof presetOrTheme === "string") {
    return {
      preset: presetOrTheme,
      ...overrides,
    };
  }

  return presetOrTheme;
}

export function resolveFileWorkspaceTheme(
  theme?: FileWorkspaceTheme | FileWorkspaceThemeName
): ResolvedFileWorkspaceTheme {
  const normalizedInput =
    typeof theme === "string" ? normalizeThemeName(theme) : normalizeThemeInput(theme);
  const appearance =
    normalizedInput.appearance ?? defaultFileWorkspaceAppearance;
  const basePreset =
    (normalizedInput.preset &&
      fileWorkspacePresets[normalizedInput.preset as FileWorkspacePresetName]) ||
    defaultFileWorkspacePreset;

  return {
    appearance,
    chrome: mergeChromeTheme(
      basePreset.chrome[appearance],
      normalizedInput.chromeTheme
    ),
    editor: mergeEditorTheme(
      basePreset.editor[appearance],
      normalizedInput.editorTheme
    ),
    id: basePreset.id,
    label: basePreset.label,
  };
}

export const defaultFileWorkspaceTheme = resolveFileWorkspaceTheme();
