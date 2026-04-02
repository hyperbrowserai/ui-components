import { useRef, type KeyboardEvent } from "react";
import { getDirName, isRootPath, normalizeFilePath } from "./filePath";
import type { FileEntry } from "./types";

type FileTreeProps = {
  activeFilePath: string | null;
  directoryChildren: Record<string, FileEntry[]>;
  expandedPaths: string[];
  loadingPaths: string[];
  onOpenFile: (path: string) => void;
  onSelectPath: (path: string) => void;
  onToggleDirectory: (path: string) => void;
  rootPath: string;
  selectedPath: string | null;
};

type VisibleTreeItem = {
  depth: number;
  entry: FileEntry;
};

function buildVisibleItems(
  directoryChildren: Record<string, FileEntry[]>,
  expandedPaths: Set<string>,
  rootPath: string
): VisibleTreeItem[] {
  const items: VisibleTreeItem[] = [];

  function visit(path: string, depth: number) {
    const children = directoryChildren[path] ?? [];
    for (const child of children) {
      items.push({
        depth,
        entry: child,
      });
      if (child.type === "directory" && expandedPaths.has(child.path)) {
        visit(child.path, depth + 1);
      }
    }
  }

  visit(rootPath, 0);
  return items;
}

function toEntryLabel(entry: FileEntry): string {
  if (entry.path === "/") {
    return "/";
  }
  return entry.name || normalizeFilePath(entry.path);
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="hb-filesystem__treeChevron"
      data-expanded={expanded ? "true" : undefined}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M5.25 4.25L10.25 8L5.25 11.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hb-filesystem__treeSpinner"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle
        className="hb-filesystem__treeSpinnerTrack"
        cx="8"
        cy="8"
        r="5.25"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        className="hb-filesystem__treeSpinnerArc"
        d="M8 2.75a5.25 5.25 0 0 1 5.25 5.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className="hb-filesystem__treeGlyph" viewBox="0 0 16 16" fill="none">
      <path
        d="M1.75 4.75a1.5 1.5 0 0 1 1.5-1.5h2.4l1.1 1.2H12.75a1.5 1.5 0 0 1 1.5 1.5v5.3a1.5 1.5 0 0 1-1.5 1.5H3.25a1.5 1.5 0 0 1-1.5-1.5v-6.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      {open ? (
        <path
          d="M1.75 6h12.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
        />
      ) : null}
    </svg>
  );
}

function FileIcon() {
  return (
    <svg aria-hidden="true" className="hb-filesystem__treeGlyph" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 2.5h5l3 3V13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M9 2.5V6h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg aria-hidden="true" className="hb-filesystem__treeMetaIcon" viewBox="0 0 16 16" fill="none">
      <path
        d="M6 10.5 4.75 11.75a2.12 2.12 0 1 1-3-3L3 7.5M10 5.5l1.25-1.25a2.12 2.12 0 1 1 3 3L13 8.5M6 10l4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function FileTree({
  activeFilePath,
  directoryChildren,
  expandedPaths,
  loadingPaths,
  onOpenFile,
  onSelectPath,
  onToggleDirectory,
  rootPath,
  selectedPath,
}: FileTreeProps) {
  const expandedPathSet = new Set(expandedPaths);
  const loadingPathSet = new Set(loadingPaths);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visibleItems = buildVisibleItems(
    directoryChildren,
    expandedPathSet,
    normalizeFilePath(rootPath)
  );
  const selectedPathVisible = selectedPath
    ? visibleItems.some((item) => item.entry.path === selectedPath)
    : false;
  const fallbackFocusablePath = visibleItems[0]?.entry.path ?? null;

  function focusPath(path: string) {
    rowRefs.current[path]?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    item: VisibleTreeItem,
    itemIndex: number
  ) {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const nextItem = visibleItems[itemIndex + 1];
        if (!nextItem) {
          return;
        }
        onSelectPath(nextItem.entry.path);
        focusPath(nextItem.entry.path);
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        const previousItem = visibleItems[itemIndex - 1];
        if (!previousItem) {
          return;
        }
        onSelectPath(previousItem.entry.path);
        focusPath(previousItem.entry.path);
        return;
      }
      case "ArrowRight": {
        if (item.entry.type !== "directory") {
          return;
        }
        event.preventDefault();
        if (!expandedPathSet.has(item.entry.path)) {
          onToggleDirectory(item.entry.path);
          onSelectPath(item.entry.path);
          return;
        }
        const nextItem = visibleItems[itemIndex + 1];
        if (nextItem && getDirName(nextItem.entry.path) === item.entry.path) {
          onSelectPath(nextItem.entry.path);
          focusPath(nextItem.entry.path);
        }
        return;
      }
      case "ArrowLeft": {
        event.preventDefault();
        if (
          item.entry.type === "directory" &&
          expandedPathSet.has(item.entry.path) &&
          !isRootPath(item.entry.path)
        ) {
          onToggleDirectory(item.entry.path);
          return;
        }
        if (isRootPath(item.entry.path)) {
          return;
        }
        const parentPath = getDirName(item.entry.path);
        onSelectPath(parentPath);
        focusPath(parentPath);
        return;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        onSelectPath(item.entry.path);
        if (item.entry.type === "directory") {
          onToggleDirectory(item.entry.path);
        } else {
          onOpenFile(item.entry.path);
        }
      }
    }
  }

  return (
    <div aria-label="Filesystem explorer" className="hb-filesystem__tree" role="tree">
      {visibleItems.map((item, itemIndex) => {
        const isDirectory = item.entry.type === "directory";
        const isExpanded = isDirectory
          ? item.entry.path === "/" || expandedPathSet.has(item.entry.path)
          : false;
        const isLoading = loadingPathSet.has(item.entry.path);
        const isSelected = selectedPath === item.entry.path;
        const isActiveFile = activeFilePath === item.entry.path;

        return (
          <div
            className="hb-filesystem__treeRow"
            data-active={isActiveFile ? "true" : undefined}
            data-selected={isSelected ? "true" : undefined}
            key={item.entry.path}
            role="treeitem"
            style={{
              paddingInlineStart: `${item.depth * 11}px`,
            }}
          >
            {isDirectory ? (
              <button
                aria-label={isExpanded ? "Collapse directory" : "Expand directory"}
                aria-busy={isLoading ? "true" : undefined}
                className="hb-filesystem__treeToggle"
                onClick={() => onToggleDirectory(item.entry.path)}
                type="button"
              >
                {isLoading ? <SpinnerIcon /> : <ChevronIcon expanded={isExpanded} />}
              </button>
            ) : (
              <span className="hb-filesystem__treeTogglePlaceholder" />
            )}

            <button
              aria-expanded={isDirectory ? isExpanded : undefined}
              className="hb-filesystem__treeLabel"
              data-active={isActiveFile ? "true" : undefined}
              data-selected={isSelected ? "true" : undefined}
              onClick={() => {
                onSelectPath(item.entry.path);
                if (!isDirectory) {
                  onOpenFile(item.entry.path);
                }
              }}
              onDoubleClick={() => {
                onSelectPath(item.entry.path);
                if (isDirectory) {
                  onToggleDirectory(item.entry.path);
                } else {
                  onOpenFile(item.entry.path);
                }
              }}
              onKeyDown={(event) => handleKeyDown(event, item, itemIndex)}
              ref={(element) => {
                rowRefs.current[item.entry.path] = element;
              }}
              tabIndex={
                selectedPath === item.entry.path ||
                (!selectedPathVisible && fallbackFocusablePath === item.entry.path)
                  ? 0
                  : -1
              }
              type="button"
            >
              <span className="hb-filesystem__treeIcon">
                {isDirectory ? <FolderIcon open={isExpanded} /> : <FileIcon />}
              </span>
              <span className="hb-filesystem__treeText">{toEntryLabel(item.entry)}</span>
              {item.entry.symlinkTarget ? (
                <span className="hb-filesystem__treeMeta">
                  <LinkIcon />
                  {normalizeFilePath(item.entry.symlinkTarget)}
                </span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
