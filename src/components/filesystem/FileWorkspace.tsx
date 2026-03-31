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
  isRootPath,
  joinFilePath,
  normalizeFilePath,
} from "./filePath";
import { resolveFileWorkspaceTheme } from "./fileWorkspaceThemes";
import type { FileDocument, FileEntry, FileWorkspaceProps } from "./types";

type WorkspaceDocument = FileDocument & {
  savedContents: string;
};

type PendingAction =
  | {
      directoryPath: string;
      type: "create-directory" | "create-file";
    }
  | {
      path: string;
      type: "rename";
    };

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

function toStatusLabel(document: WorkspaceDocument | null): string {
  if (!document) {
    return "No file open";
  }
  if (document.readOnly) {
    return "Read only";
  }
  if (document.contents !== document.savedContents) {
    return "Unsaved changes";
  }
  return "Synced";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "An unexpected filesystem error occurred.";
}

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "directory" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

export function FileWorkspace({
  adapter,
  className,
  initialPath = "/",
  onCreateDirectory,
  onCreateFile,
  onDelete,
  onError,
  onOpenFile,
  onRename,
  onSaveFile,
  readOnly = false,
  style,
  theme,
  title = "Filesystem Workspace",
}: FileWorkspaceProps) {
  const resolvedTheme = resolveFileWorkspaceTheme(theme);
  const adapterRef = useRef(adapter);
  const mountedRef = useRef(true);
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
  const [openDocuments, setOpenDocuments] = useState<WorkspaceDocument[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingActionValue, setPendingActionValue] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading sandbox filesystem…");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  adapterRef.current = adapter;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function pushError(message: string) {
    setErrorMessage(message);
    setStatusMessage(message);
    onError?.(message);
  }

  function mergeEntries(entries: FileEntry[]) {
    const nextEntries = { ...entryIndex };
    for (const entry of entries) {
      nextEntries[entry.path] = entry;
    }
    setEntryIndex(nextEntries);
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

  async function expandDirectoryChain(path: string): Promise<void> {
    const ancestors = getAncestorPaths(path);
    for (const ancestor of ancestors) {
      setExpandedPaths((current) =>
        current.includes(ancestor) ? current : [...current, ancestor]
      );
      if (entryIndex[ancestor]?.type === "directory" || ancestor === "/") {
        await ensureDirectoryLoaded(ancestor);
      }
    }
  }

  async function openFile(path: string): Promise<void> {
    const normalizedPath = normalizeFilePath(path);
    setSelectedPath(normalizedPath);
    setActiveDocumentPath(normalizedPath);
    onOpenFile?.(normalizedPath);

    const existingDocument = openDocuments.find(
      (document) => document.path === normalizedPath
    );
    if (existingDocument) {
      return;
    }

    try {
      const document = await adapterRef.current.readFile(normalizedPath);
      if (!mountedRef.current) {
        return;
      }

      const nextDocument: WorkspaceDocument = {
        ...document,
        language:
          document.language ??
          entryIndex[normalizedPath]?.language ??
          inferLanguageFromPath(normalizedPath),
        path: normalizedPath,
        savedContents: document.contents,
      };
      setOpenDocuments((current) => [...current, nextDocument]);
      setStatusMessage(`Opened ${normalizedPath}`);
      setErrorMessage(null);
    } catch (error) {
      pushError(toErrorMessage(error));
    }
  }

  useEffect(() => {
    let active = true;

    async function initializeWorkspace() {
      await loadDirectory("/");
      if (!active || !mountedRef.current) {
        return;
      }

      const normalizedInitialPath = normalizeFilePath(initialPath);
      if (normalizedInitialPath === "/") {
        setSelectedPath("/");
        setStatusMessage("Ready");
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
          setSelectedPath(entry.path);
        } else {
          const parentPath = getDirName(entry.path);
          await expandDirectoryChain(parentPath);
          if (!active || !mountedRef.current) {
            return;
          }
          await openFile(entry.path);
        }
        setStatusMessage("Ready");
      } catch (error) {
        pushError(toErrorMessage(error));
      }
    }

    void initializeWorkspace();

    return () => {
      active = false;
    };
  }, [initialPath]);

  useEffect(() => {
    function handleWindowSave(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      event.preventDefault();
      void saveActiveDocument();
    }

    window.addEventListener("keydown", handleWindowSave);
    return () => {
      window.removeEventListener("keydown", handleWindowSave);
    };
  });

  const activeDocument =
    openDocuments.find((document) => document.path === activeDocumentPath) ?? null;
  const selectedEntry = selectedPath ? entryIndex[selectedPath] ?? null : null;
  const isWorkspaceReadOnly = readOnly === true;

  async function handleToggleDirectory(path: string) {
    const normalizedPath = normalizeFilePath(path);
    if (isRootPath(normalizedPath)) {
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

  function updateDocument(path: string, patch: Partial<WorkspaceDocument>) {
    const normalizedPath = normalizeFilePath(path);
    setOpenDocuments((current) =>
      current.map((document) =>
        document.path === normalizedPath ? { ...document, ...patch } : document
      )
    );
  }

  async function saveActiveDocument() {
    if (!activeDocument) {
      return;
    }
    if (isWorkspaceReadOnly || activeDocument.readOnly) {
      setStatusMessage("This file is read-only and cannot be saved.");
      return;
    }
    if (activeDocument.contents === activeDocument.savedContents) {
      setStatusMessage("No changes to save.");
      return;
    }

    try {
      await adapterRef.current.writeFile(activeDocument.path, activeDocument.contents);
      if (!mountedRef.current) {
        return;
      }

      updateDocument(activeDocument.path, {
        savedContents: activeDocument.contents,
      });
      setStatusMessage(`Saved ${activeDocument.path}`);
      setErrorMessage(null);
      onSaveFile?.(activeDocument.path);
      await ensureDirectoryLoaded(getDirName(activeDocument.path));
    } catch (error) {
      pushError(toErrorMessage(error));
    }
  }

  function startCreateAction(type: "create-directory" | "create-file") {
    const baseDirectory =
      selectedEntry?.type === "directory"
        ? selectedEntry.path
        : selectedPath
          ? getDirName(selectedPath)
          : "/";
    setPendingAction({
      directoryPath: baseDirectory,
      type,
    });
    setPendingActionValue("");
  }

  function startRenameAction() {
    if (!selectedPath || isRootPath(selectedPath)) {
      return;
    }
    setPendingAction({
      path: selectedPath,
      type: "rename",
    });
    setPendingActionValue(getBaseName(selectedPath));
  }

  function cancelPendingAction() {
    setPendingAction(null);
    setPendingActionValue("");
  }

  async function submitPendingAction() {
    if (!pendingAction) {
      return;
    }

    const currentPendingAction = pendingAction;
    const nextName = pendingActionValue.trim();
    if (!nextName) {
      setStatusMessage("Name is required.");
      return;
    }

    try {
      if (currentPendingAction.type === "create-file") {
        const nextPath = joinFilePath(currentPendingAction.directoryPath, nextName);
        await adapterRef.current.createFile(nextPath, "");
        if (!mountedRef.current) {
          return;
        }

        await ensureDirectoryLoaded(currentPendingAction.directoryPath);
        await loadDirectory(currentPendingAction.directoryPath);
        setSelectedPath(nextPath);
        setActiveDocumentPath(nextPath);
        setOpenDocuments((current) => {
          if (current.some((document) => document.path === nextPath)) {
            return current;
          }
          return [
            ...current,
            {
              contents: "",
              language: inferLanguageFromPath(nextPath),
              path: nextPath,
              savedContents: "",
            },
          ];
        });
        setStatusMessage(`Created ${nextPath}`);
        onCreateFile?.(nextPath);
      } else if (currentPendingAction.type === "create-directory") {
        const nextPath = joinFilePath(currentPendingAction.directoryPath, nextName);
        await adapterRef.current.createDirectory(nextPath);
        if (!mountedRef.current) {
          return;
        }

        await ensureDirectoryLoaded(currentPendingAction.directoryPath);
        await loadDirectory(currentPendingAction.directoryPath);
        setExpandedPaths((current) =>
          current.includes(nextPath) ? current : [...current, nextPath]
        );
        setSelectedPath(nextPath);
        setStatusMessage(`Created ${nextPath}`);
        onCreateDirectory?.(nextPath);
      } else if (currentPendingAction.type === "rename") {
        const currentPath = currentPendingAction.path;
        const nextPath = joinFilePath(getDirName(currentPath), nextName);
        await adapterRef.current.rename(currentPath, nextPath);
        if (!mountedRef.current) {
          return;
        }

        await loadDirectory(getDirName(currentPath));
        if (getDirName(nextPath) !== getDirName(currentPath)) {
          await loadDirectory(getDirName(nextPath));
        }

        setEntryIndex((current) => {
          const nextIndex = { ...current };
          const movingEntry = nextIndex[currentPath];
          delete nextIndex[currentPath];
          if (movingEntry) {
            nextIndex[nextPath] = {
              ...movingEntry,
              name: getBaseName(nextPath),
              path: nextPath,
            };
          }
          return nextIndex;
        });
        setOpenDocuments((current) =>
          current.map((document) =>
            document.path === currentPath
              ? {
                  ...document,
                  language: inferLanguageFromPath(nextPath),
                  path: nextPath,
                }
              : document
          )
        );
        setExpandedPaths((current) =>
          current.map((path) => (path === currentPath ? nextPath : path))
        );
        if (selectedPath === currentPath) {
          setSelectedPath(nextPath);
        }
        if (activeDocumentPath === currentPath) {
          setActiveDocumentPath(nextPath);
        }
        setStatusMessage(`Renamed to ${nextPath}`);
        onRename?.(currentPath, nextPath);
      }

      setErrorMessage(null);
      cancelPendingAction();
    } catch (error) {
      pushError(toErrorMessage(error));
    }
  }

  async function deleteSelectedPath() {
    if (!selectedPath || isRootPath(selectedPath)) {
      return;
    }

    const isDirectory = entryIndex[selectedPath]?.type === "directory";
    const confirmationMessage = isDirectory
      ? `Delete ${selectedPath} and all nested files?`
      : `Delete ${selectedPath}?`;
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      await adapterRef.current.delete(selectedPath, {
        recursive: isDirectory,
      });
      if (!mountedRef.current) {
        return;
      }

      const parentPath = getDirName(selectedPath);
      await loadDirectory(parentPath);
      setSelectedPath(parentPath);
      setExpandedPaths((current) =>
        current.filter((path) => !isPathWithin(selectedPath, path))
      );
      setOpenDocuments((current) =>
        current.filter((document) => !isPathWithin(selectedPath, document.path))
      );
      setActiveDocumentPath((current) =>
        current && isPathWithin(selectedPath, current) ? null : current
      );
      setStatusMessage(`Deleted ${selectedPath}`);
      setErrorMessage(null);
      onDelete?.(selectedPath);
    } catch (error) {
      pushError(toErrorMessage(error));
    }
  }

  async function refreshExplorer() {
    const targetPath =
      selectedEntry?.type === "directory"
        ? selectedEntry.path
        : selectedPath
          ? getDirName(selectedPath)
          : "/";
    await loadDirectory(targetPath);
    setStatusMessage(`Refreshed ${targetPath}`);
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
      <div aria-hidden="true" className="hb-filesystem__glow" />
      <header className="hb-filesystem__header">
        <div className="hb-filesystem__titleBlock">
          <p className="hb-filesystem__eyebrow">{resolvedTheme.label}</p>
          <h2 className="hb-filesystem__title">{title}</h2>
        </div>
        <div className="hb-filesystem__headerActions">
          <button
            className="hb-filesystem__actionButton"
            disabled={
              isWorkspaceReadOnly ||
              !activeDocument ||
              activeDocument.readOnly === true ||
              activeDocument.contents === activeDocument.savedContents
            }
            onClick={() => {
              void saveActiveDocument();
            }}
            type="button"
          >
            Save
          </button>
          <button
            className="hb-filesystem__actionButton"
            onClick={() => {
              void refreshExplorer();
            }}
            type="button"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="hb-filesystem__body">
        <aside className="hb-filesystem__sidebar">
          <div className="hb-filesystem__sidebarHeader">
            <div>
              <p className="hb-filesystem__sidebarEyebrow">Explorer</p>
              <p className="hb-filesystem__sidebarPath">
                {selectedPath ?? normalizeFilePath(initialPath)}
              </p>
            </div>
            <div className="hb-filesystem__sidebarActions">
              <button
                className="hb-filesystem__miniButton"
                disabled={isWorkspaceReadOnly}
                onClick={() => startCreateAction("create-file")}
                type="button"
              >
                New file
              </button>
              <button
                className="hb-filesystem__miniButton"
                disabled={isWorkspaceReadOnly}
                onClick={() => startCreateAction("create-directory")}
                type="button"
              >
                New folder
              </button>
              <button
                className="hb-filesystem__miniButton"
                disabled={
                  isWorkspaceReadOnly || !selectedPath || isRootPath(selectedPath)
                }
                onClick={startRenameAction}
                type="button"
              >
                Rename
              </button>
              <button
                className="hb-filesystem__miniButton"
                data-tone="danger"
                disabled={
                  isWorkspaceReadOnly || !selectedPath || isRootPath(selectedPath)
                }
                onClick={() => {
                  void deleteSelectedPath();
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>

          {pendingAction ? (
            <form
              className="hb-filesystem__inlineForm"
              onSubmit={(event) => {
                event.preventDefault();
                void submitPendingAction();
              }}
            >
              <label className="hb-filesystem__inlineFormLabel">
                {pendingAction.type === "rename"
                  ? `Rename ${pendingAction.path}`
                  : `Create in ${pendingAction.directoryPath}`}
                <input
                  autoFocus
                  className="hb-filesystem__input"
                  onChange={(event) => setPendingActionValue(event.target.value)}
                  placeholder={
                    pendingAction.type === "create-directory"
                      ? "folder-name"
                      : pendingAction.type === "create-file"
                        ? "file-name.ts"
                        : "new-name"
                  }
                  value={pendingActionValue}
                />
              </label>
              <div className="hb-filesystem__inlineFormActions">
                <button className="hb-filesystem__actionButton" type="submit">
                  Apply
                </button>
                <button
                  className="hb-filesystem__actionButton"
                  onClick={cancelPendingAction}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          <FileTree
            activeFilePath={activeDocumentPath}
            directoryChildren={directoryChildren}
            expandedPaths={expandedPaths}
            loadingPaths={loadingDirectories}
            onOpenFile={(path) => {
              void openFile(path);
            }}
            onSelectPath={setSelectedPath}
            onToggleDirectory={(path) => {
              void handleToggleDirectory(path);
            }}
            selectedPath={selectedPath}
          />
        </aside>

        <div className="hb-filesystem__workspace">
          <div className="hb-filesystem__tabs">
            {openDocuments.length === 0 ? (
              <div className="hb-filesystem__tab" data-active="true">
                No file open
              </div>
            ) : (
              openDocuments.map((document) => {
                const isActive = document.path === activeDocumentPath;
                const isDirty = document.contents !== document.savedContents;
                return (
                  <div
                    className="hb-filesystem__tab"
                    data-active={isActive ? "true" : undefined}
                    key={document.path}
                  >
                    <button
                      className="hb-filesystem__tabButton"
                      onClick={() => {
                        setActiveDocumentPath(document.path);
                        setSelectedPath(document.path);
                      }}
                      type="button"
                    >
                      <span>{getBaseName(document.path)}</span>
                      {isDirty ? (
                        <span className="hb-filesystem__dirtyDot">DIRTY</span>
                      ) : null}
                    </button>
                    <button
                      aria-label={`Close ${document.path}`}
                      className="hb-filesystem__tabClose"
                      onClick={() => {
                        const nextDocuments = openDocuments.filter(
                          (item) => item.path !== document.path
                        );
                        setOpenDocuments(nextDocuments);
                        setActiveDocumentPath((current) => {
                          if (current !== document.path) {
                            return current;
                          }
                          const remainingDocument =
                            nextDocuments[nextDocuments.length - 1] ?? null;
                          return remainingDocument?.path ?? null;
                        });
                      }}
                      type="button"
                    >
                      x
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <CodeEditorPane
            document={activeDocument}
            onChange={(nextContents) => {
              if (!activeDocumentPath) {
                return;
              }
              updateDocument(activeDocumentPath, {
                contents: nextContents,
              });
            }}
            onSave={() => {
              void saveActiveDocument();
            }}
            theme={resolvedTheme}
          />
        </div>
      </div>

      <footer className="hb-filesystem__footer">
        <span className="hb-filesystem__footerLabel">
          {toStatusLabel(activeDocument)}
        </span>
        <span className="hb-filesystem__footerMeta">
          {errorMessage ?? statusMessage}
        </span>
      </footer>
    </section>
  );
}
