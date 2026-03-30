import { useRef } from "react";
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
  selectedPath: string | null;
};

type VisibleTreeItem = {
  depth: number;
  entry: FileEntry;
};

function buildVisibleItems(
  directoryChildren: Record<string, FileEntry[]>,
  expandedPaths: Set<string>
): VisibleTreeItem[] {
  const items: VisibleTreeItem[] = [
    {
      depth: 0,
      entry: {
        name: "/",
        path: "/",
        type: "directory",
      },
    },
  ];

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

  visit("/", 1);
  return items;
}

function toEntryLabel(entry: FileEntry): string {
  if (entry.path === "/") {
    return "/";
  }
  return entry.name || normalizeFilePath(entry.path);
}

export function FileTree({
  activeFilePath,
  directoryChildren,
  expandedPaths,
  loadingPaths,
  onOpenFile,
  onSelectPath,
  onToggleDirectory,
  selectedPath,
}: FileTreeProps) {
  const expandedPathSet = new Set(expandedPaths);
  const loadingPathSet = new Set(loadingPaths);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visibleItems = buildVisibleItems(directoryChildren, expandedPathSet);

  function focusPath(path: string) {
    rowRefs.current[path]?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
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
        if (item.entry.type === "directory" && expandedPathSet.has(item.entry.path) && !isRootPath(item.entry.path)) {
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
    <div
      aria-label="Filesystem explorer"
      className="hb-filesystem__tree"
      role="tree"
    >
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
              paddingInlineStart: `${item.depth * 14}px`,
            }}
          >
            {isDirectory ? (
              <button
                aria-label={isExpanded ? "Collapse directory" : "Expand directory"}
                className="hb-filesystem__treeToggle"
                onClick={() => onToggleDirectory(item.entry.path)}
                type="button"
              >
                {isExpanded ? "v" : ">"}
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
              tabIndex={selectedPath === item.entry.path || (selectedPath === null && item.entry.path === "/") ? 0 : -1}
              type="button"
            >
              <span className="hb-filesystem__treeBadge">
                {isDirectory ? "DIR" : "FILE"}
              </span>
              <span className="hb-filesystem__treeText">{toEntryLabel(item.entry)}</span>
              {item.entry.symlinkTarget ? (
                <span className="hb-filesystem__treeMeta">
                  LINK {normalizeFilePath(item.entry.symlinkTarget)}
                </span>
              ) : null}
              {isLoading ? (
                <span className="hb-filesystem__treeMeta">Loading…</span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
