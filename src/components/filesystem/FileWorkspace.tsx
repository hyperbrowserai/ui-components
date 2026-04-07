import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { CodeEditorPane } from "./CodeEditorPane";
import { FileTree } from "./FileTree";
import { inferLanguageFromPath } from "./fileLanguage";
import {
  getSymlinkCycleTarget,
  getAncestorPaths,
  getBaseName,
  getDirName,
  isPathWithin,
  normalizeFilePath,
} from "./filePath";
import { resolveFileWorkspaceTheme } from "./fileWorkspaceThemes";
import type { FileEntry, FilePreview, FileWorkspaceProps } from "./types";

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

function isPathNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("no such file") ||
    message.includes("no such directory") ||
    message.includes("enoent")
  );
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

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="m3.75 8.5 2.5 2.5 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
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

function getExpandedWorkspacePaths(
  workspacePath: string,
  activeDocumentPath: string | null
): string[] {
  const nextPaths = new Set(getAncestorPaths(workspacePath));

  if (!activeDocumentPath || !isPathWithin(workspacePath, activeDocumentPath)) {
    return Array.from(nextPaths);
  }

  for (const ancestor of getAncestorPaths(getDirName(activeDocumentPath))) {
    if (ancestor === "/" || isPathWithin(workspacePath, ancestor)) {
      nextPaths.add(ancestor);
    }
  }

  return Array.from(nextPaths);
}

type DirectoryLoadOptions = {
  reportError?: boolean;
  throwOnError?: boolean;
};

export function FileWorkspace({
  adapter,
  appearance,
  className,
  chromeTheme,
  editorTheme,
  onError,
  onOpenFile,
  onWorkspacePathChange,
  preset,
  style,
  theme,
  title = "Filesystem Browser",
  workspacePath,
}: FileWorkspaceProps) {
  const resolvedTheme = resolveFileWorkspaceTheme(
    appearance !== undefined ||
      chromeTheme !== undefined ||
      editorTheme !== undefined ||
      preset !== undefined
      ? {
          appearance,
          chromeTheme,
          editorTheme,
          preset,
        }
      : theme
  );
  const controlledWorkspacePath =
    workspacePath == null ? null : normalizeFilePath(workspacePath);
  const adapterRef = useRef(adapter);
  const mountedRef = useRef(true);
  const workspacePickerRef = useRef<HTMLDivElement | null>(null);
  const workspacePickerRequestRef = useRef(0);
  const documentRequestRef = useRef(0);
  const copyResetTimeoutRef = useRef<number | null>(null);
  const activeDocumentRef = useRef<FilePreview | null>(null);
  const activeDocumentPathRef = useRef<string | null>(null);
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
  const [loadingDirectories, setLoadingDirectories] = useState<string[]>([]);
  const [activeDocument, setActiveDocument] = useState<FilePreview | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [uncontrolledWorkspacePath, setUncontrolledWorkspacePath] = useState(
    controlledWorkspacePath ?? "/"
  );
  const [isWorkspacePickerOpen, setIsWorkspacePickerOpen] = useState(false);
  const [workspaceDraftPath, setWorkspaceDraftPath] = useState(
    toDirectoryInputValue(controlledWorkspacePath ?? "/")
  );
  const [workspaceBrowserPath, setWorkspaceBrowserPath] = useState(controlledWorkspacePath ?? "/");
  const [workspacePickerOptions, setWorkspacePickerOptions] = useState<
    WorkspacePickerOption[]
  >([]);
  const [workspacePickerError, setWorkspacePickerError] = useState<string | null>(null);
  const [workspacePickerLoading, setWorkspacePickerLoading] = useState(false);
  const resolvedWorkspacePath = controlledWorkspacePath ?? uncontrolledWorkspacePath;

  adapterRef.current = adapter;
  activeDocumentRef.current = activeDocument;
  activeDocumentPathRef.current = activeDocumentPath;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (controlledWorkspacePath !== null) {
      setUncontrolledWorkspacePath(controlledWorkspacePath);
    }
  }, [controlledWorkspacePath]);

  function pushError(message: string) {
    onError?.(message);
  }

  async function statPath(path: string): Promise<FileEntry> {
    const normalizedPath = normalizeFilePath(path);
    if (normalizedPath === "/") {
      return {
        name: "/",
        path: "/",
        type: "directory",
      };
    }

    return await adapterRef.current.stat(normalizedPath);
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

  async function loadDirectory(
    path: string,
    options?: DirectoryLoadOptions
  ): Promise<FileEntry[]> {
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
      if (options?.reportError !== false) {
        pushError(toErrorMessage(error));
      }
      if (options?.throwOnError) {
        throw error;
      }
      return [];
    } finally {
      if (mountedRef.current) {
        setLoadingDirectories((current) =>
          current.filter((entryPath) => entryPath !== normalizedPath)
        );
      }
    }
  }

  async function ensureDirectoryLoaded(
    path: string,
    options?: DirectoryLoadOptions
  ): Promise<void> {
    const normalizedPath = normalizeFilePath(path);
    if (directoryChildren[normalizedPath]) {
      return;
    }
    await loadDirectory(normalizedPath, options);
  }

  async function listWorkspacePickerOptions(path: string): Promise<WorkspacePickerOption[]> {
    const normalizedPath = normalizeFilePath(path);
    const entries =
      directoryChildren[normalizedPath] ??
      (await loadDirectory(normalizedPath, {
        reportError: false,
        throwOnError: true,
      }));
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
    const normalizedInput = trimmedPath ? normalizeFilePath(trimmedPath) : resolvedWorkspacePath;

    setWorkspacePickerLoading(true);

    let exactDirectory = false;
    let nextError: string | null = null;

    try {
      if (!trimmedPath || !trimmedPath.startsWith("/")) {
        nextError = "Enter an absolute folder path.";
      } else {
        const entry = await statPath(normalizedInput);
        if (entry.type === "directory") {
          const nextOptions = await listWorkspacePickerOptions(normalizedInput);

          if (requestId !== workspacePickerRequestRef.current || !mountedRef.current) {
            return exactDirectory;
          }

          setWorkspaceBrowserPath(normalizedInput);
          setWorkspacePickerOptions(nextOptions);
          exactDirectory = true;
        } else if (entry.type === "file") {
          nextError = "Please enter a folder path.";
        }
      }
    } catch (error) {
      nextError = isPathNotFoundError(error)
        ? "Please enter a path that exists."
        : toErrorMessage(error);
    }

    if (requestId !== workspacePickerRequestRef.current || !mountedRef.current) {
      return exactDirectory;
    }

    setWorkspacePickerError(nextError);
    setWorkspacePickerLoading(false);
    return exactDirectory;
  }

  async function loadDocument(path: string, options?: { force?: boolean }) {
    const normalizedPath = normalizeFilePath(path);
    const requestId = ++documentRequestRef.current;

    setSelectedPath(normalizedPath);
    setActiveDocumentPath(normalizedPath);
    onOpenFile?.(normalizedPath);

    if (
      activeDocumentPathRef.current === normalizedPath &&
      activeDocumentRef.current &&
      !options?.force
    ) {
      return;
    }

    try {
      const document = await adapterRef.current.previewFile(normalizedPath);
      if (requestId !== documentRequestRef.current || !mountedRef.current) {
        return;
      }

      if (document.kind === "text") {
        setActiveDocument({
          ...document,
          language:
            document.language ??
            entryIndex[normalizedPath]?.language ??
            inferLanguageFromPath(normalizedPath),
        });
        return;
      }

      setActiveDocument(document);
    } catch (error) {
      if (requestId !== documentRequestRef.current || !mountedRef.current) {
        return;
      }
      pushError(toErrorMessage(error));
    }
  }

  useEffect(() => {
    let active = true;

    workspacePickerRequestRef.current += 1;
    documentRequestRef.current += 1;
    setWorkspaceDraftPath(toDirectoryInputValue(resolvedWorkspacePath));
    setWorkspaceBrowserPath(resolvedWorkspacePath);
    setWorkspacePickerError(null);
    setWorkspacePickerLoading(false);
    setWorkspacePickerOptions([]);
    setIsWorkspacePickerOpen(false);

    async function initializeWorkspace() {
      try {
        const entry = await statPath(resolvedWorkspacePath);
        if (!active || !mountedRef.current) {
          return;
        }

        if (entry.type !== "directory") {
          pushError("Workspace path must point to a folder.");
          setActiveDocument(null);
          setActiveDocumentPath(null);
          setSelectedPath(null);
          setExpandedPaths(["/"]);
          return;
        }

        setEntryIndex((current) => ({
          ...current,
          [entry.path]: {
            ...entry,
            language: entry.language ?? inferLanguageFromPath(entry.path),
          },
        }));

        const nextExpandedPaths = getExpandedWorkspacePaths(
          resolvedWorkspacePath,
          activeDocumentRef.current ? activeDocumentPathRef.current : null
        );
        setExpandedPaths(nextExpandedPaths);

        for (const ancestor of nextExpandedPaths) {
          await ensureDirectoryLoaded(ancestor, {
            reportError: false,
            throwOnError: true,
          });
          if (!active || !mountedRef.current) {
            return;
          }
        }

        if (
          activeDocumentRef.current &&
          activeDocumentPathRef.current &&
          isPathWithin(resolvedWorkspacePath, activeDocumentPathRef.current)
        ) {
          setSelectedPath(activeDocumentPathRef.current);
          return;
        }

        setActiveDocument(null);
        setActiveDocumentPath(null);
        setSelectedPath(null);
      } catch (error) {
        if (!active || !mountedRef.current) {
          return;
        }
        pushError(
          isPathNotFoundError(error)
            ? `Workspace path does not exist: ${resolvedWorkspacePath}`
            : toErrorMessage(error)
        );
        setActiveDocument(null);
        setActiveDocumentPath(null);
        setSelectedPath(null);
        setExpandedPaths(["/"]);
      }
    }

    void initializeWorkspace();

    return () => {
      active = false;
    };
  }, [resolvedWorkspacePath]);

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
    const directoryEntry = entryIndex[normalizedPath];
    const cycleTarget =
      directoryEntry?.type === "directory"
        ? getSymlinkCycleTarget(directoryEntry.path, directoryEntry.symlinkTarget)
        : null;
    if (cycleTarget) {
      setExpandedPaths((current) =>
        current.filter((entryPath) => entryPath !== normalizedPath)
      );
      return;
    }

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

  async function copyToClipboard(value: string) {
    if (!navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      setCopyState("copied");
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setCopyState("idle");
        copyResetTimeoutRef.current = null;
      }, 1200);
    } catch {
      setCopyState("idle");
    }
  }

  useEffect(() => {
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
      copyResetTimeoutRef.current = null;
    }
    setCopyState("idle");
  }, [activeDocumentPath]);

  function setWorkspacePathValue(path: string) {
    const normalizedPath = normalizeFilePath(path);
    if (controlledWorkspacePath === null) {
      setUncontrolledWorkspacePath(normalizedPath);
    }
    onWorkspacePathChange?.(normalizedPath);
  }

  function openWorkspacePicker() {
    setWorkspaceDraftPath(toDirectoryInputValue(resolvedWorkspacePath));
    setWorkspaceBrowserPath(resolvedWorkspacePath);
    setWorkspacePickerError(null);
    setIsWorkspacePickerOpen(true);
    void showWorkspacePickerDirectory(resolvedWorkspacePath);
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

    setWorkspacePathValue(workspaceDraftPath);
    setIsWorkspacePickerOpen(false);
  }

  const selectedEntry = selectedPath ? entryIndex[selectedPath] ?? null : null;
  const selectedSymlinkDirectory =
    selectedEntry &&
    selectedEntry.type === "directory" &&
    typeof selectedEntry.symlinkTarget === "string" &&
    selectedEntry.symlinkTarget.trim() !== ""
      ? selectedEntry
      : null;
  const selectedSymlinkCycleTarget = selectedSymlinkDirectory
    ? getSymlinkCycleTarget(
        selectedSymlinkDirectory.path,
        selectedSymlinkDirectory.symlinkTarget
      )
    : null;
  const showSymlinkDirectoryDetails =
    selectedSymlinkDirectory !== null &&
    selectedSymlinkCycleTarget !== null &&
    activeDocumentPath !== selectedPath;
  const previewPathBarValue = activeDocument?.path ?? selectedPath;
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
              title={resolvedWorkspacePath}
              type="button"
            >
              <span className="hb-filesystem__workspaceTriggerIcon">
                <WorkspaceIcon />
              </span>
              <span className="hb-filesystem__workspaceTriggerText">
                {toWorkspaceLabel(resolvedWorkspacePath)}
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
          {previewPathBarValue ? (
            <>
              <code className="hb-filesystem__previewPathBar">{previewPathBarValue}</code>
              {activeDocument?.kind === "text" ? (
                <button
                  aria-label="Copy file contents"
                  className="hb-filesystem__copyButton"
                  data-state={copyState}
                  onClick={() => {
                    void copyToClipboard(activeDocument.contents);
                  }}
                  title={copyState === "copied" ? "Copied" : "Copy contents"}
                  type="button"
                >
                  <span className="hb-filesystem__copyIconStack">
                    <span
                      aria-hidden={copyState === "copied" ? "true" : undefined}
                      className="hb-filesystem__copyIcon hb-filesystem__copyIcon--copy"
                    >
                      <CopyIcon />
                    </span>
                    <span
                      aria-hidden={copyState !== "copied" ? "true" : undefined}
                      className="hb-filesystem__copyIcon hb-filesystem__copyIcon--check"
                    >
                      <CheckIcon />
                    </span>
                  </span>
                </button>
              ) : null}
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
            rootPath={resolvedWorkspacePath}
            selectedPath={selectedPath}
          />
        </aside>

        <div className="hb-filesystem__workspace">
          {showSymlinkDirectoryDetails && selectedSymlinkDirectory ? (
            <div className="hb-filesystem__symlinkShell">
              <div className="hb-filesystem__symlinkState">
                <p className="hb-filesystem__previewEyebrow">Symlink Loop</p>
                <p className="hb-filesystem__symlinkHeadline">
                  This folder links back to one of its parent folders.
                </p>
                <p className="hb-filesystem__symlinkDescription">
                  {`It resolves to ${selectedSymlinkCycleTarget}. Expanding it here would repeat the same branch, so expansion is disabled.`}
                </p>
              </div>
            </div>
          ) : (
            <CodeEditorPane document={activeDocument} theme={resolvedTheme} />
          )}
        </div>
      </div>
    </section>
  );
}
