import React from "react";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { CodeEditorPane } from "./CodeEditorPane";
import { FileTree } from "./FileTree";
import { inferLanguageFromPath } from "./fileLanguage";
import {
  getAncestorPaths,
  getBaseName,
  getDirName,
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

function toStatusLabel(document: FileDocument | null): string {
  if (!document) {
    return "Explorer ready";
  }

  if (!document.readOnlyReason && document.contents.length === 0) {
    return "Empty file";
  }

  if (!document.contents.trim()) {
    return "Preview unavailable";
  }

  if (document.truncated) {
    return "Truncated preview";
  }

  return "Read-only preview";
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

function RefreshIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="M13 8a5 5 0 1 1-1.38-3.45"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
      <path
        d="M10.75 2.75H13v2.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  );
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
  const [activeDocument, setActiveDocument] = useState<FileDocument | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading filesystem preview…");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const explorerRootPath = resolveExplorerRootPath(initialPath);

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
      setStatusMessage(`Previewing ${normalizedPath}`);
      setErrorMessage(null);
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
      setStatusMessage(`Previewing ${normalizedPath}`);
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
          setActiveDocument(null);
          setActiveDocumentPath(null);
          setSelectedPath(entry.path);
          setStatusMessage(`Browsing ${entry.path}`);
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
  }, [initialPath]);

  const selectedEntry = selectedPath ? entryIndex[selectedPath] ?? null : null;

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
      setStatusMessage(`Browsing ${normalizedPath}`);
      return;
    }

    setExpandedPaths((current) =>
      current.filter((entryPath) => entryPath !== normalizedPath)
    );
  }

  async function refreshWorkspace() {
    const targetPath =
      selectedEntry?.type === "directory"
        ? selectedEntry.path
        : selectedPath
          ? getDirName(selectedPath)
          : "/";

    await loadDirectory(targetPath);
    if (activeDocumentPath) {
      await loadDocument(activeDocumentPath, { force: true });
    } else {
      setStatusMessage(`Refreshed ${targetPath}`);
    }
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
      <header className="hb-filesystem__header">
        <div className="hb-filesystem__titleBlock">
          <p className="hb-filesystem__eyebrow">{resolvedTheme.label}</p>
          <h2 className="hb-filesystem__title">{title}</h2>
        </div>
        <div className="hb-filesystem__headerActions">
          <button
            className="hb-filesystem__actionButton"
            onClick={() => {
              void refreshWorkspace();
            }}
            type="button"
          >
            <RefreshIcon />
            Refresh
          </button>
        </div>
      </header>

      <div className="hb-filesystem__body">
        <div className="hb-filesystem__bodyHeader hb-filesystem__bodyHeader--sidebar">
          <p className="hb-filesystem__sidebarTitle">Files</p>
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
            rootPath={explorerRootPath}
            selectedPath={selectedPath}
          />
        </aside>

        <div className="hb-filesystem__workspace">
          <CodeEditorPane document={activeDocument} theme={resolvedTheme} />
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
