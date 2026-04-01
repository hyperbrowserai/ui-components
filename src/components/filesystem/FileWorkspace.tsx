import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { CodeEditorPane } from "./CodeEditorPane";
import { FileTree } from "./FileTree";
import { inferLanguageFromPath } from "./fileLanguage";
import {
  getAncestorPaths,
  getBaseName,
  getDirName,
  isPathWithin,
  normalizeFilePath,
} from "./filePath";
import { resolveFileWorkspaceTheme } from "./fileWorkspaceThemes";
import type { FileDocument, FileEntry, FileWorkspaceProps } from "./types";

function toThemeStyle(
  theme: ReturnType<typeof resolveFileWorkspaceTheme>
): CSSProperties {
  return {
    "--hb-filesystem-accent": theme.chrome.accent,
    "--hb-filesystem-background": theme.chrome.background,
    "--hb-filesystem-border": theme.chrome.border,
    "--hb-filesystem-danger": theme.chrome.danger,
    "--hb-filesystem-divider": theme.chrome.divider,
    "--hb-filesystem-editor-background": theme.chrome.editorBackground,
    "--hb-filesystem-panel": theme.chrome.panel,
    "--hb-filesystem-panel-muted": theme.chrome.panelMuted,
    "--hb-filesystem-row-active": theme.chrome.rowActive,
    "--hb-filesystem-row-hover": theme.chrome.rowHover,
    "--hb-filesystem-shadow": theme.chrome.shadow,
    "--hb-filesystem-tab-active": theme.chrome.tabActive,
    "--hb-filesystem-tab-inactive": theme.chrome.tabInactive,
    "--hb-filesystem-text": theme.chrome.text,
    "--hb-filesystem-text-muted": theme.chrome.textMuted,
    "--hb-filesystem-warning": theme.chrome.warning,
  } as CSSProperties;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "An unexpected filesystem error occurred.";
}

function resolveExplorerRootPath(path: string): string {
  const normalizedPath = normalizeFilePath(path);
  if (normalizedPath === "/") {
    return "/";
  }

  const [segment] = normalizedPath.split("/").filter(Boolean);
  return segment ? `/${segment}` : "/";
}

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "directory" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="M6 3.5h6.25A1.25 1.25 0 0 1 13.5 4.75V11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
      <path
        d="M3.75 6h6.5c.69 0 1.25.56 1.25 1.25v5c0 .69-.56 1.25-1.25 1.25h-6.5C3.06 13.5 2.5 12.94 2.5 12.25v-5C2.5 6.56 3.06 6 3.75 6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

type WorkspacePickerOption = {
  isParent?: boolean;
  path: string;
};

function WorkspaceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="M1.75 4.75a1.5 1.5 0 0 1 1.5-1.5h2.4l1.1 1.2H12.75a1.5 1.5 0 0 1 1.5 1.5v5.3a1.5 1.5 0 0 1-1.5 1.5H3.25a1.5 1.5 0 0 1-1.5-1.5v-6.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="hb-filesystem__workspaceTriggerChevron"
      data-open={open ? "true" : undefined}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M4.5 6.25 8 9.75l3.5-3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ParentDirectoryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="M6.25 4 3.75 6.5 6.25 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
      <path
        d="M4 6.5h6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function toDirectoryInputValue(path: string): string {
  const normalizedPath = normalizeFilePath(path);
  if (normalizedPath === "/") {
    return "/";
  }
  return `${normalizedPath}/`;
}

function toWorkspaceLabel(path: string): string {
  const normalizedPath = normalizeFilePath(path);
  if (normalizedPath === "/") {
    return "/";
  }
  return getBaseName(normalizedPath);
}

export function FileWorkspace({
  adapter,
  className,
  initialPath = "/",
  onError,
  onOpenFile,
  style,
  theme,
  title = "Filesystem Browser",
}: FileWorkspaceProps) {
  const resolvedTheme = resolveFileWorkspaceTheme(theme);
  const derivedWorkspaceRootPath = resolveExplorerRootPath(initialPath);
  const adapterRef = useRef(adapter);
  const mountedRef = useRef(true);
  const workspacePickerRef = useRef<HTMLDivElement | null>(null);
  const workspacePickerRequestRef = useRef(0);
  const [activeDocumentPath, setActiveDocumentPath] = useState<string | null>(null);
  const [directoryChildren, setDirectoryChildren] = useState<Record<string, FileEntry[]>>({});
  const [entryIndex, setEntryIndex] = useState<Record<string, FileEntry>>({
    "/": {
      name: "/",
      path: "/",
      type: "directory",
    },
  });
  const [expandedPaths, setExpandedPaths] = useState<string[]>(["/"]);
  const [loadingDirectories, setLoadingDirectories] = useState<string[]>(["/"]);
  const [activeDocument, setActiveDocument] = useState<FileDocument | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [workspaceRootPath, setWorkspaceRootPath] = useState(derivedWorkspaceRootPath);
  const [isWorkspacePickerOpen, setIsWorkspacePickerOpen] = useState(false);
  const [workspaceDraftPath, setWorkspaceDraftPath] = useState(
    toDirectoryInputValue(derivedWorkspaceRootPath)
  );
  const [workspaceBrowserPath, setWorkspaceBrowserPath] = useState(derivedWorkspaceRootPath);
  const [workspacePickerOptions, setWorkspacePickerOptions] = useState<
    WorkspacePickerOption[]
  >([]);
  const [workspacePickerError, setWorkspacePickerError] = useState<string | null>(null);
  const [workspacePickerLoading, setWorkspacePickerLoading] = useState(false);

  adapterRef.current = adapter;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function pushError(message: string) {
    onError?.(message);
  }

  async function statPath(path: string): Promise<FileEntry | null> {
    const normalizedPath = normalizeFilePath(path);
    if (normalizedPath === "/") {
      return {
        name: "/",
        path: "/",
        type: "directory",
      };
    }

    try {
      return await adapterRef.current.stat(normalizedPath);
    } catch {
      return null;
    }
  }

  function mergeEntries(entries: FileEntry[]) {
    setEntryIndex((current) => {
      const nextEntries = { ...current };
      for (const entry of entries) {
        nextEntries[entry.path] = entry;
      }
      return nextEntries;
    });
  }

  async function loadDirectory(path: string): Promise<FileEntry[]> {
    const normalizedPath = normalizeFilePath(path);
    setLoadingDirectories((current) =>
      current.includes(normalizedPath) ? current : [...current, normalizedPath]
    );

    try {
      const listing = await adapterRef.current.listDirectory(normalizedPath);
      if (!mountedRef.current) {
        return [];
      }

      const sortedEntries = sortEntries(
        listing.entries.map((entry) => ({
          ...entry,
          language: entry.language ?? inferLanguageFromPath(entry.path),
        }))
      );

      setDirectoryChildren((current) => ({
        ...current,
        [normalizedPath]: sortedEntries,
      }));
      mergeEntries(sortedEntries);

      if (normalizedPath !== "/") {
        setEntryIndex((current) => ({
          ...current,
          [normalizedPath]:
            current[normalizedPath] ??
            ({
              name: getBaseName(normalizedPath),
              path: normalizedPath,
              type: "directory",
            } satisfies FileEntry),
        }));
      }

      return sortedEntries;
    } catch (error) {
      pushError(toErrorMessage(error));
      return [];
    } finally {
      if (mountedRef.current) {
        setLoadingDirectories((current) =>
          current.filter((entryPath) => entryPath !== normalizedPath)
        );
      }
    }
  }

  async function ensureDirectoryLoaded(path: string): Promise<void> {
    const normalizedPath = normalizeFilePath(path);
    if (directoryChildren[normalizedPath]) {
      return;
    }
    await loadDirectory(normalizedPath);
  }

  async function listWorkspacePickerOptions(path: string): Promise<WorkspacePickerOption[]> {
    const normalizedPath = normalizeFilePath(path);
    const entries = directoryChildren[normalizedPath] ?? (await loadDirectory(normalizedPath));
    const nextOptions: WorkspacePickerOption[] = [];

    if (normalizedPath !== "/") {
      nextOptions.push({
        isParent: true,
        path: getDirName(normalizedPath),
      });
    }

    for (const entry of entries) {
      if (entry.type !== "directory") {
        continue;
      }
      nextOptions.push({
        path: entry.path,
      });
    }

    return nextOptions;
  }

  async function showWorkspacePickerDirectory(path: string): Promise<void> {
    const requestId = ++workspacePickerRequestRef.current;
    const normalizedPath = normalizeFilePath(path);

    setWorkspacePickerLoading(true);

    try {
      const nextOptions = await listWorkspacePickerOptions(normalizedPath);

      if (requestId !== workspacePickerRequestRef.current || !mountedRef.current) {
        return;
      }

      setWorkspaceBrowserPath(normalizedPath);
      setWorkspacePickerOptions(nextOptions);
    } catch (error) {
      if (requestId !== workspacePickerRequestRef.current || !mountedRef.current) {
        return;
      }
      setWorkspacePickerError(toErrorMessage(error));
    }

    if (requestId === workspacePickerRequestRef.current && mountedRef.current) {
      setWorkspacePickerLoading(false);
    }
  }

  async function validateWorkspacePickerPath(inputPath: string): Promise<boolean> {
    const requestId = ++workspacePickerRequestRef.current;
    const trimmedPath = inputPath.trim();
    const normalizedInput = trimmedPath ? normalizeFilePath(trimmedPath) : workspaceRootPath;

    setWorkspacePickerLoading(true);

    let exactDirectory = false;
    let nextError: string | null = null;

    try {
      if (!trimmedPath || !trimmedPath.startsWith("/")) {
        nextError = "Enter an absolute folder path.";
      } else {
        const entry = await statPath(normalizedInput);
        if (entry?.type === "directory") {
          exactDirectory = true;
          const nextOptions = await listWorkspacePickerOptions(normalizedInput);

          if (requestId !== workspacePickerRequestRef.current || !mountedRef.current) {
            return exactDirectory;
          }

          setWorkspaceBrowserPath(normalizedInput);
          setWorkspacePickerOptions(nextOptions);
        } else if (entry?.type === "file") {
          nextError = "Please enter a folder path.";
        } else {
          nextError = "Please enter a path that exists.";
        }
      }
    } catch (error) {
      nextError = toErrorMessage(error);
    }

    if (requestId !== workspacePickerRequestRef.current || !mountedRef.current) {
      return exactDirectory;
    }

    setWorkspacePickerError(nextError);
    setWorkspacePickerLoading(false);
    return exactDirectory;
  }

  async function expandDirectoryChain(path: string): Promise<void> {
    const ancestors = getAncestorPaths(path);
    for (const ancestor of ancestors) {
      setExpandedPaths((current) =>
        current.includes(ancestor) ? current : [...current, ancestor]
      );
      await ensureDirectoryLoaded(ancestor);
    }
  }

  async function loadDocument(path: string, options?: { force?: boolean }) {
    const normalizedPath = normalizeFilePath(path);

    setSelectedPath(normalizedPath);
    setActiveDocumentPath(normalizedPath);
    onOpenFile?.(normalizedPath);

    if (activeDocumentPath === normalizedPath && activeDocument && !options?.force) {
      return;
    }

    try {
      const document = await adapterRef.current.readFile(normalizedPath);
      if (!mountedRef.current) {
        return;
      }

      setActiveDocument({
        ...document,
        language:
          document.language ??
          entryIndex[normalizedPath]?.language ??
          inferLanguageFromPath(normalizedPath),
        path: normalizedPath,
      });
    } catch (error) {
      pushError(toErrorMessage(error));
    }
  }

  useEffect(() => {
    let active = true;

    setWorkspaceRootPath(derivedWorkspaceRootPath);
    setWorkspaceDraftPath(toDirectoryInputValue(derivedWorkspaceRootPath));
    setWorkspaceBrowserPath(derivedWorkspaceRootPath);
    setWorkspacePickerError(null);
    setIsWorkspacePickerOpen(false);

    async function initializeWorkspace() {
      await loadDirectory("/");
      if (!active || !mountedRef.current) {
        return;
      }

      const normalizedInitialPath = normalizeFilePath(initialPath);
      if (normalizedInitialPath === "/") {
        setSelectedPath("/");
        return;
      }

      try {
        const entry = await adapterRef.current.stat(normalizedInitialPath);
        if (!active || !mountedRef.current) {
          return;
        }

        setEntryIndex((current) => ({
          ...current,
          [entry.path]: {
            ...entry,
            language: entry.language ?? inferLanguageFromPath(entry.path),
          },
        }));

        if (entry.type === "directory") {
          await expandDirectoryChain(entry.path);
          if (!active || !mountedRef.current) {
            return;
          }
          setActiveDocument(null);
          setActiveDocumentPath(null);
          setSelectedPath(entry.path);
          return;
        }

        const parentPath = getDirName(entry.path);
        await expandDirectoryChain(parentPath);
        if (!active || !mountedRef.current) {
          return;
        }

        await loadDocument(entry.path, { force: true });
      } catch (error) {
        pushError(toErrorMessage(error));
      }
    }

    void initializeWorkspace();

    return () => {
      active = false;
    };
  }, [derivedWorkspaceRootPath, initialPath]);

  useEffect(() => {
    if (!isWorkspacePickerOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (workspacePickerRef.current?.contains(target)) {
        return;
      }
      setIsWorkspacePickerOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setIsWorkspacePickerOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isWorkspacePickerOpen]);

  async function handleToggleDirectory(path: string) {
    const normalizedPath = normalizeFilePath(path);
    if (normalizedPath === "/") {
      await ensureDirectoryLoaded("/");
      return;
    }

    const isExpanded = expandedPaths.includes(normalizedPath);
    if (!isExpanded) {
      setExpandedPaths((current) => [...current, normalizedPath]);
      await ensureDirectoryLoaded(normalizedPath);
      return;
    }

    setExpandedPaths((current) =>
      current.filter((entryPath) => entryPath !== normalizedPath)
    );
  }

  async function copyActivePath(path: string) {
    if (!navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(path);
      setCopyState("copied");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 1200);
    } catch {
      setCopyState("idle");
    }
  }

  function openWorkspacePicker() {
    setWorkspaceDraftPath(toDirectoryInputValue(workspaceRootPath));
    setWorkspaceBrowserPath(workspaceRootPath);
    setWorkspacePickerError(null);
    setIsWorkspacePickerOpen(true);
    void showWorkspacePickerDirectory(workspaceRootPath);
  }

  function handleWorkspaceOptionClick(option: WorkspacePickerOption) {
    setWorkspaceDraftPath(toDirectoryInputValue(option.path));
    setWorkspacePickerError(null);
    void showWorkspacePickerDirectory(option.path);
  }

  async function commitWorkspacePath() {
    const isValidDirectory = await validateWorkspacePickerPath(workspaceDraftPath);
    if (!isValidDirectory) {
      return;
    }

    const nextWorkspaceRootPath = normalizeFilePath(workspaceDraftPath);
    await ensureDirectoryLoaded(nextWorkspaceRootPath);

    if (activeDocumentPath && isPathWithin(nextWorkspaceRootPath, activeDocumentPath)) {
      await expandDirectoryChain(getDirName(activeDocumentPath));
      const visibleAncestors = getAncestorPaths(getDirName(activeDocumentPath)).filter(
        (path) => path === "/" || isPathWithin(nextWorkspaceRootPath, path)
      );
      setExpandedPaths(
        Array.from(new Set(["/", nextWorkspaceRootPath, ...visibleAncestors]))
      );
      setSelectedPath(activeDocumentPath);
    } else {
      setExpandedPaths(Array.from(new Set(["/", nextWorkspaceRootPath])));
      setSelectedPath(nextWorkspaceRootPath);
      setActiveDocument(null);
      setActiveDocumentPath(null);
    }

    setWorkspaceRootPath(nextWorkspaceRootPath);
    setIsWorkspacePickerOpen(false);
  }

  const rootClassName = ["hb-filesystem", className].filter(Boolean).join(" ");

  return (
    <section
      aria-label={title}
      className={rootClassName}
      style={{
        ...toThemeStyle(resolvedTheme),
        ...style,
      }}
    >
      <div className="hb-filesystem__body">
        <div className="hb-filesystem__bodyHeader hb-filesystem__bodyHeader--sidebar">
          <div className="hb-filesystem__workspaceSwitcher" ref={workspacePickerRef}>
            <button
              aria-expanded={isWorkspacePickerOpen ? "true" : "false"}
              className="hb-filesystem__workspaceTrigger"
              onClick={() => {
                if (isWorkspacePickerOpen) {
                  setIsWorkspacePickerOpen(false);
                  return;
                }
                openWorkspacePicker();
              }}
              title={workspaceRootPath}
              type="button"
            >
              <span className="hb-filesystem__workspaceTriggerIcon">
                <WorkspaceIcon />
              </span>
              <span className="hb-filesystem__workspaceTriggerText">
                {toWorkspaceLabel(workspaceRootPath)}
              </span>
              <ChevronDownIcon open={isWorkspacePickerOpen} />
            </button>

            {isWorkspacePickerOpen ? (
              <div
                aria-label="Open folder"
                className="hb-filesystem__workspaceMenu"
                role="dialog"
              >
                <div className="hb-filesystem__workspaceMenuHeader">
                  <span className="hb-filesystem__workspaceMenuTitle">Open Folder</span>
                  <button
                    className="hb-filesystem__workspaceMenuConfirm"
                    onClick={() => {
                      void commitWorkspacePath();
                    }}
                    type="button"
                  >
                    OK
                  </button>
                </div>

                <input
                  autoCapitalize="none"
                  autoComplete="off"
                  className="hb-filesystem__workspaceInput"
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setWorkspaceDraftPath(nextValue);

                    if (nextValue === "/" || nextValue.endsWith("/")) {
                      void validateWorkspacePickerPath(nextValue);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void commitWorkspacePath();
                    }
                  }}
                  spellCheck={false}
                  type="text"
                  value={workspaceDraftPath}
                />

                {workspacePickerError ? (
                  <p className="hb-filesystem__workspaceError">{workspacePickerError}</p>
                ) : null}

                <div className="hb-filesystem__workspaceOptions" role="listbox">
                  {workspacePickerLoading ? (
                    <p className="hb-filesystem__workspacePlaceholder">Loading folders…</p>
                  ) : workspacePickerOptions.length > 0 ? (
                    workspacePickerOptions.map((option) => (
                      <button
                        className="hb-filesystem__workspaceOption"
                        key={`${option.isParent ? "parent" : "dir"}:${option.path}`}
                        onClick={() => {
                          handleWorkspaceOptionClick(option);
                        }}
                        title={option.path}
                        type="button"
                      >
                        <span className="hb-filesystem__workspaceOptionIcon">
                          {option.isParent ? <ParentDirectoryIcon /> : <WorkspaceIcon />}
                        </span>
                        <span className="hb-filesystem__workspaceOptionText">
                          {option.isParent ? ".." : getBaseName(option.path)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="hb-filesystem__workspacePlaceholder">
                      No folders in {workspaceBrowserPath}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="hb-filesystem__bodyHeader hb-filesystem__bodyHeader--workspace">
          {activeDocument ? (
            <>
              <code className="hb-filesystem__previewPathBar">{activeDocument.path}</code>
              <button
                aria-label="Copy file path"
                className="hb-filesystem__copyButton"
                onClick={() => {
                  void copyActivePath(activeDocument.path);
                }}
                title={copyState === "copied" ? "Copied" : "Copy path"}
                type="button"
              >
                <CopyIcon />
              </button>
            </>
          ) : (
            <div
              aria-hidden="true"
              className="hb-filesystem__previewPathBar"
              data-empty="true"
            />
          )}
        </div>

        <aside className="hb-filesystem__sidebar">
          <FileTree
            activeFilePath={activeDocumentPath}
            directoryChildren={directoryChildren}
            expandedPaths={expandedPaths}
            loadingPaths={loadingDirectories}
            onOpenFile={(path) => {
              void loadDocument(path);
            }}
            onSelectPath={setSelectedPath}
            onToggleDirectory={(path) => {
              void handleToggleDirectory(path);
            }}
            rootPath={workspaceRootPath}
            selectedPath={selectedPath}
          />
        </aside>

        <div className="hb-filesystem__workspace">
          <CodeEditorPane document={activeDocument} theme={resolvedTheme} />
        </div>
      </div>
    </section>
  );
}
