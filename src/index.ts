/**
 * Public exports for Hyperbrowser UI components.
 * Add component exports here as new components are created.
 */
export {
  HyperbrowserVncViewer,
  type HyperbrowserVncViewerProps,
} from "./components/HyperbrowserVncViewer";

export {
  HyperbrowserTerminal,
  createHyperbrowserPtyConnection,
  useSandboxTerminalConnection,
  type HyperbrowserPtyBrowserAuthParams,
  type HyperbrowserPtyBrowserAuthResolver,
  type HyperbrowserPtyConnectionOptions,
  type HyperbrowserPtyStatus,
  type HyperbrowserRuntimeBrowserAuth,
  type HyperbrowserTerminalProps,
  type UseSandboxTerminalConnectionOptions,
} from "./components/hyperbrowser/HyperbrowserTerminal";

export {
  useHyperbrowserHlsPlayback,
  type HyperbrowserVideoSourceType,
  type UseHyperbrowserHlsPlaybackParams,
  type UseHyperbrowserHlsPlaybackResult,
} from "./hooks/useHyperbrowserHlsPlayback";

export { FileWorkspace } from "./components/filesystem/FileWorkspace";

export {
  defaultFileWorkspaceTheme,
  fileWorkspaceThemePresets,
  resolveFileWorkspaceTheme,
} from "./components/filesystem/fileWorkspaceThemes";

export {
  HyperbrowserFileWorkspace,
  createHyperbrowserFilesystemAdapter,
  type HyperbrowserFileWorkspaceProps,
  type HyperbrowserFilesystemAdapterOptions,
  type HyperbrowserFilesystemBrowserAuthParams,
  type HyperbrowserFilesystemBrowserAuthResolver,
} from "./components/hyperbrowser/HyperbrowserFileWorkspace";

export { BaseTerminal } from "./components/terminal/BaseTerminal";
export { TerminalSurface } from "./components/terminal/TerminalSurface";
export { useTerminal } from "./components/terminal/useTerminal";

export {
  createTerminalTheme,
  defaultTerminalAppearance,
  defaultTerminalOptions,
  defaultTerminalPreset,
  defaultTerminalTheme,
  resolveTerminalTheme,
  terminalPresets,
} from "./components/terminal/terminalThemes";

export type {
  FileDirectoryListing,
  FileEntry,
  FileEntryType,
  FilePreview,
  FilePreviewKind,
  FileWorkspaceAdapter,
  FileWorkspaceChromeTheme,
  FileWorkspaceEditorTheme,
  FileWorkspaceProps,
  FileWorkspaceTheme,
  FileWorkspaceThemeName,
  ResolvedFileWorkspaceTheme,
} from "./components/filesystem/types";

export type {
  ResolvedTerminalTheme,
  TerminalAppearance,
  TerminalChromeTheme,
  TerminalConnectParams,
  TerminalConnection,
  TerminalExitEvent,
  TerminalExitListener,
  TerminalOptionOverrides,
  TerminalOutputListener,
  TerminalPreset,
  TerminalPresetName,
  TerminalSession,
  TerminalSize,
  TerminalStatus,
  UseTerminalOptions,
  UseTerminalResult,
  BaseTerminalProps,
  TerminalSurfaceProps,
  TerminalSurfaceTheme,
  TerminalTheme,
  TerminalUnsubscribe,
} from "./components/terminal/types";
