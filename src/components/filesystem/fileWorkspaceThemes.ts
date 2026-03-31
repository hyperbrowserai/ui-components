import type {
  FileWorkspaceTheme,
  FileWorkspaceThemeName,
  ResolvedFileWorkspaceTheme,
} from "./types";

export const fileWorkspaceThemePresets: Record<string, ResolvedFileWorkspaceTheme> = {
  atlas: {
    id: "atlas",
    label: "Atlas",
    chrome: {
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
      tabActive: "#ffffff",
      tabInactive: "#edf3f8",
      text: "#10243b",
      textMuted: "#62748a",
      warning: "#b54708",
    },
    editor: {
      fontFamily:
        '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
      fontSize: 14,
      lineHeight: 1.5,
    },
  },
  ledger: {
    id: "ledger",
    label: "Ledger",
    chrome: {
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
      tabActive: "#fffdf8",
      tabInactive: "#efe7d8",
      text: "#21312c",
      textMuted: "#6a7169",
      warning: "#9c5d00",
    },
    editor: {
      fontFamily:
        '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
      fontSize: 14,
      lineHeight: 1.5,
    },
  },
};

export const defaultFileWorkspaceTheme = fileWorkspaceThemePresets.atlas;

export function resolveFileWorkspaceTheme(
  theme?: FileWorkspaceTheme | FileWorkspaceThemeName
): ResolvedFileWorkspaceTheme {
  const preset =
    typeof theme === "string"
      ? fileWorkspaceThemePresets[theme] ?? defaultFileWorkspaceTheme
      : defaultFileWorkspaceTheme;

  if (!theme || typeof theme === "string") {
    return preset;
  }

  return {
    id: theme.id ?? preset.id,
    label: theme.label ?? preset.label,
    chrome: {
      ...preset.chrome,
      ...theme.chrome,
    },
    editor: {
      ...preset.editor,
      ...theme.editor,
    },
  };
}
