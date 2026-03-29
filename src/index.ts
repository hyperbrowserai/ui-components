/**
 * Public exports for Hyperbrowser UI components.
 * Add component exports here as new components are created.
 */
export {
  HyperbrowserVncViewer,
  type HyperbrowserVncViewerProps
} from './components/HyperbrowserVncViewer';

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
