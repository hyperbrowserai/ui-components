import type { CSSProperties } from "react";

export type FileEntryType = "file" | "directory";

export type FileEntry = {
  path: string;
  name: string;
  type: FileEntryType;
  symlinkTarget?: string;
  size?: number;
  modifiedAt?: string;
  mode?: number;
  permissions?: string;
  owner?: string;
  group?: string;
  language?: string;
};

export type FileDirectoryListing = {
  path: string;
  entries: FileEntry[];
};

export type FilePreviewKind =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "binary";

export type FileTextPreview = {
  kind: "text";
  path: string;
  contents: string;
  contentType?: string;
  encoding?: string;
  language?: string;
  readOnly?: boolean;
  readOnlyReason?: string;
  size?: number;
  truncated?: boolean;
};

export type FileAssetPreview = {
  kind: "image" | "audio" | "video" | "pdf";
  path: string;
  contentType?: string;
  expiresAt?: number;
  name?: string;
  size?: number;
  url: string;
};

export type FileBinaryPreview = {
  kind: "binary";
  path: string;
  contentType?: string;
  name?: string;
  readOnlyReason?: string;
  reason?: string;
  size?: number;
};

export type FilePreview = FileTextPreview | FileAssetPreview | FileBinaryPreview;

export type FileWorkspaceAdapter = {
  listDirectory(path: string): Promise<FileDirectoryListing>;
  previewFile(path: string): Promise<FilePreview>;
  stat(path: string): Promise<FileEntry>;
  writeFile?: (path: string, contents: string) => Promise<void>;
  createFile?: (path: string, contents?: string) => Promise<void>;
  createDirectory?: (path: string) => Promise<void>;
  rename?: (path: string, nextPath: string) => Promise<void>;
  delete?: (path: string, options?: { recursive?: boolean }) => Promise<void>;
};

export type FileWorkspaceChromeTheme = {
  accent: string;
  background: string;
  border: string;
  danger: string;
  divider: string;
  editorBackground: string;
  panel: string;
  panelMuted: string;
  rowActive: string;
  rowHover: string;
  shadow: string;
  tabActive: string;
  tabInactive: string;
  text: string;
  textMuted: string;
  warning: string;
};

export type FileWorkspaceEditorTheme = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

export type ResolvedFileWorkspaceTheme = {
  chrome: FileWorkspaceChromeTheme;
  editor: FileWorkspaceEditorTheme;
  id: string;
  label: string;
};

export type FileWorkspaceTheme = Partial<ResolvedFileWorkspaceTheme> & {
  chrome?: Partial<FileWorkspaceChromeTheme>;
  editor?: Partial<FileWorkspaceEditorTheme>;
  id?: string;
  label?: string;
};

export type FileWorkspaceThemeName = string;

export type FileWorkspaceProps = {
  adapter: FileWorkspaceAdapter;
  className?: string;
  onCreateDirectory?: (path: string) => void;
  onCreateFile?: (path: string) => void;
  onDelete?: (path: string) => void;
  onError?: (message: string) => void;
  onOpenFile?: (path: string) => void;
  onRename?: (path: string, nextPath: string) => void;
  onSaveFile?: (path: string) => void;
  onWorkspacePathChange?: (path: string) => void;
  readOnly?: boolean;
  style?: CSSProperties;
  theme?: FileWorkspaceTheme | FileWorkspaceThemeName;
  title?: string;
  workspacePath?: string;
};
