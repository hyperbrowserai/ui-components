/**
 * Public exports for Hyperbrowser UI components.
 * Add component exports here as new components are created.
 */
export {
  HyperbrowserVncViewer,
  type HyperbrowserVncViewerProps
} from './components/HyperbrowserVncViewer';

export {
  HyperbrowserFileWorkspace,
  createHyperbrowserFilesystemAdapter,
  type HyperbrowserFileWorkspaceProps,
  type HyperbrowserFilesystemAdapterOptions,
  type HyperbrowserFilesystemBrowserAuthResolver,
  type HyperbrowserRuntimeBrowserAuth as HyperbrowserFilesystemRuntimeBrowserAuth
} from './components/hyperbrowser/HyperbrowserFileWorkspace';

export {
  HyperbrowserTerminal,
  createHyperbrowserPtyConnection,
  type HyperbrowserPtyBrowserAuthResolver,
  type HyperbrowserPtyConnectionOptions,
  type HyperbrowserPtyStatus,
  type HyperbrowserRuntimeBrowserAuth,
  type HyperbrowserTerminalProps
} from './components/hyperbrowser/HyperbrowserTerminal';

export {
  FileWorkspace
} from './components/filesystem/FileWorkspace';

export {
  configureMonacoLoader,
  getConfiguredMonacoVsPath
} from './components/filesystem/monaco-loader';

export {
  defaultFileWorkspaceTheme,
  fileWorkspaceThemePresets,
  resolveFileWorkspaceTheme
} from './components/filesystem/fileWorkspaceThemes';

export {
  useHyperbrowserHlsPlayback,
  type HyperbrowserVideoSourceType,
  type UseHyperbrowserHlsPlaybackParams,
  type UseHyperbrowserHlsPlaybackResult
} from './hooks/useHyperbrowserHlsPlayback';

export { TerminalSurface } from './components/terminal/TerminalSurface';

export {
  defaultTerminalTheme,
  resolveTerminalTheme,
  terminalThemePresets
} from './components/terminal/terminalThemes';

export type {
  FileDirectoryListing,
  FileDocument,
  FileEntry,
  FileEntryType,
  FileWorkspaceAdapter,
  FileWorkspaceChromeTheme,
  FileWorkspaceEditorTheme,
  FileWorkspaceProps,
  FileWorkspaceTheme,
  FileWorkspaceThemeName,
  ResolvedFileWorkspaceTheme
} from './components/filesystem/types';

export type {
  ResolvedTerminalTheme,
  TerminalChromeTheme,
  TerminalConnectParams,
  TerminalConnection,
  TerminalExitEvent,
  TerminalExitListener,
  TerminalOutputListener,
  TerminalSession,
  TerminalSize,
  TerminalState,
  TerminalSurfaceProps,
  TerminalTheme,
  TerminalThemeName,
  TerminalUnsubscribe
} from './components/terminal/types';
