import React from "react";

function createMockFilesystemAdapter() {
  const directories = new Set([
    "/",
    "/workspace",
    "/workspace/src",
    "/workspace/src/lib",
    "/workspace/assets",
    "/tmp",
  ]);

  const files = new Map([
    [
      "/workspace/README.md",
      {
        contentType: "text/markdown",
        contents:
          "# Workspace Demo\n\nThis visual scenario exercises the filesystem workspace.\n",
        encoding: "utf8",
        type: "file",
      },
    ],
    [
      "/workspace/src/index.ts",
      {
        contentType: "application/typescript",
        contents: [
          "import { bootstrap } from './lib/bootstrap';",
          "",
          "export async function main() {",
          "  const result = await bootstrap('sandbox-fs');",
          "  console.log('ready', result);",
          "}",
          "",
          "void main();",
        ].join("\n"),
        encoding: "utf8",
        type: "file",
      },
    ],
    [
      "/workspace/src/lib/bootstrap.ts",
      {
        contentType: "application/typescript",
        contents: [
          "export async function bootstrap(target: string) {",
          "  return {",
          "    target,",
          "    loadedAt: new Date('2026-03-29T12:00:00Z').toISOString()",
          "  };",
          "}",
        ].join("\n"),
        encoding: "utf8",
        type: "file",
      },
    ],
    [
      "/workspace/src/bootstrap-link.ts",
      {
        contentType: "application/typescript",
        contents: ["export { bootstrap } from './lib/bootstrap';"].join("\n"),
        encoding: "utf8",
        type: "file",
      },
    ],
    [
      "/workspace/src/large.log",
      {
        contentType: "text/plain",
        contents: Array.from(
          { length: 64 },
          (_, index) =>
            `line ${String(index + 1).padStart(2, "0")} sandbox log payload`,
        ).join("\n"),
        encoding: "utf8",
        truncated: true,
        type: "file",
      },
    ],
    [
      "/workspace/assets/logo.png",
      {
        contentType: "image/png",
        previewKind: "image",
        type: "file",
        url:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0jUAAAAASUVORK5CYII=",
      },
    ],
    [
      "/workspace/assets/archive.zip",
      {
        contentType: "application/zip",
        previewKind: "binary",
        readOnlyReason: "Archive previews are intentionally disabled in the visual harness.",
        type: "file",
      },
    ],
    [
      "/tmp/notes.txt",
      {
        contentType: "text/plain",
        contents: "Temporary scratch pad.\n",
        encoding: "utf8",
        type: "file",
      },
    ],
  ]);

  const entryMeta = new Map([
    ["/", { name: "/", path: "/", type: "directory" }],
    [
      "/workspace",
      { name: "workspace", path: "/workspace", type: "directory" },
    ],
    [
      "/workspace/src",
      { name: "src", path: "/workspace/src", type: "directory" },
    ],
    [
      "/workspace/src/lib",
      { name: "lib", path: "/workspace/src/lib", type: "directory" },
    ],
    [
      "/workspace/assets",
      { name: "assets", path: "/workspace/assets", type: "directory" },
    ],
    ["/tmp", { name: "tmp", path: "/tmp", type: "directory" }],
    [
      "/workspace/README.md",
      { name: "README.md", path: "/workspace/README.md", type: "file" },
    ],
    [
      "/workspace/src/index.ts",
      { name: "index.ts", path: "/workspace/src/index.ts", type: "file" },
    ],
    [
      "/workspace/src/lib/bootstrap.ts",
      {
        name: "bootstrap.ts",
        path: "/workspace/src/lib/bootstrap.ts",
        type: "file",
      },
    ],
    [
      "/workspace/src/large.log",
      { name: "large.log", path: "/workspace/src/large.log", type: "file" },
    ],
    [
      "/workspace/assets/logo.png",
      { name: "logo.png", path: "/workspace/assets/logo.png", type: "file" },
    ],
    [
      "/workspace/assets/archive.zip",
      { name: "archive.zip", path: "/workspace/assets/archive.zip", type: "file" },
    ],
    [
      "/tmp/notes.txt",
      { name: "notes.txt", path: "/tmp/notes.txt", type: "file" },
    ],
    [
      "/workspace/src/bootstrap-link.ts",
      {
        name: "bootstrap-link.ts",
        path: "/workspace/src/bootstrap-link.ts",
        symlinkTarget: "/workspace/src/lib/bootstrap.ts",
        type: "file",
      },
    ],
  ]);

  const normalizePath = (input) => {
    if (!input || input === "/") {
      return "/";
    }

    const path = `/${String(input).trim()}`.replace(/\/+/g, "/");
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
  };

  const getParentPath = (input) => {
    const path = normalizePath(input);
    if (path === "/") {
      return "/";
    }
    const index = path.lastIndexOf("/");
    return index <= 0 ? "/" : path.slice(0, index);
  };

  const getBaseName = (input) => {
    const path = normalizePath(input);
    if (path === "/") {
      return "/";
    }
    const index = path.lastIndexOf("/");
    return index === -1 ? path : path.slice(index + 1);
  };

  const cloneEntry = (path) => {
    const baseEntry = entryMeta.get(path);
    if (!baseEntry) {
      throw new Error(`Path not found: ${path}`);
    }

    const fileRecord = files.get(path);
    return {
      ...baseEntry,
      contentType: fileRecord?.contentType,
      encoding: fileRecord?.encoding,
      truncated: fileRecord?.truncated,
    };
  };

  const listChildren = (directoryPath) => {
    const normalizedPath = normalizePath(directoryPath);
    const seen = new Set();
    const entries = [];

    for (const path of entryMeta.keys()) {
      if (path === normalizedPath) {
        continue;
      }
      if (getParentPath(path) !== normalizedPath) {
        continue;
      }
      if (seen.has(path)) {
        continue;
      }
      seen.add(path);
      entries.push(cloneEntry(path));
    }

    return entries.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "directory" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  };

  const ensureDirectory = (path) => {
    if (!directories.has(path)) {
      throw new Error(`Directory not found: ${path}`);
    }
  };

  const ensureFile = (path) => {
    if (!files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
  };

  const moveNestedEntries = (fromPath, toPath) => {
    const nextEntryMeta = new Map();
    for (const [path, value] of entryMeta.entries()) {
      const nextPath =
        path === fromPath || path.startsWith(`${fromPath}/`)
          ? `${toPath}${path.slice(fromPath.length)}`
          : path;
      nextEntryMeta.set(nextPath, {
        ...value,
        name: nextPath === "/" ? "/" : getBaseName(nextPath),
        path: nextPath,
      });
    }
    entryMeta.clear();
    for (const [path, value] of nextEntryMeta.entries()) {
      entryMeta.set(path, value);
    }

    const nextDirectories = new Set();
    for (const path of directories.values()) {
      nextDirectories.add(
        path === fromPath || path.startsWith(`${fromPath}/`)
          ? `${toPath}${path.slice(fromPath.length)}`
          : path,
      );
    }
    directories.clear();
    for (const path of nextDirectories.values()) {
      directories.add(path);
    }

    const nextFiles = new Map();
    for (const [path, value] of files.entries()) {
      const nextPath =
        path === fromPath || path.startsWith(`${fromPath}/`)
          ? `${toPath}${path.slice(fromPath.length)}`
          : path;
      nextFiles.set(nextPath, value);
    }
    files.clear();
    for (const [path, value] of nextFiles.entries()) {
      files.set(path, value);
    }
  };

  return {
    async listDirectory(path) {
      const normalizedPath = normalizePath(path);
      ensureDirectory(normalizedPath);
      return {
        entries: listChildren(normalizedPath),
        path: normalizedPath,
      };
    },
    async stat(path) {
      return cloneEntry(normalizePath(path));
    },
    async previewFile(path) {
      const normalizedPath = normalizePath(path);
      ensureFile(normalizedPath);
      const record = files.get(normalizedPath);
      if (record.previewKind === "image") {
        return {
          contentType: record.contentType,
          kind: "image",
          path: normalizedPath,
          url: record.url,
        };
      }
      if (record.previewKind === "binary") {
        return {
          contentType: record.contentType,
          kind: "binary",
          path: normalizedPath,
          reason: record.readOnlyReason,
        };
      }
      return {
        contentType: record.contentType,
        contents: record.contents,
        encoding: record.encoding,
        kind: "text",
        path: normalizedPath,
        readOnly: Boolean(record.truncated),
        readOnlyReason: record.truncated
          ? "This file exceeds the runtime read limit and is read-only in v1."
          : undefined,
        truncated: Boolean(record.truncated),
      };
    },
    async writeFile(path, contents) {
      const normalizedPath = normalizePath(path);
      ensureFile(normalizedPath);
      const current = files.get(normalizedPath);
      files.set(normalizedPath, {
        ...current,
        contents,
        truncated: false,
      });
    },
    async createFile(path, contents = "") {
      const normalizedPath = normalizePath(path);
      const parentPath = getParentPath(normalizedPath);
      ensureDirectory(parentPath);
      files.set(normalizedPath, {
        contentType: "text/plain",
        contents,
        encoding: "utf8",
        type: "file",
      });
      entryMeta.set(normalizedPath, {
        name: getBaseName(normalizedPath),
        path: normalizedPath,
        type: "file",
      });
    },
    async createDirectory(path) {
      const normalizedPath = normalizePath(path);
      const parentPath = getParentPath(normalizedPath);
      ensureDirectory(parentPath);
      directories.add(normalizedPath);
      entryMeta.set(normalizedPath, {
        name: getBaseName(normalizedPath),
        path: normalizedPath,
        type: "directory",
      });
    },
    async rename(path, nextPath) {
      const normalizedPath = normalizePath(path);
      const normalizedNextPath = normalizePath(nextPath);
      moveNestedEntries(normalizedPath, normalizedNextPath);
    },
    async delete(path, options) {
      const normalizedPath = normalizePath(path);
      if (directories.has(normalizedPath)) {
        if (!options?.recursive) {
          throw new Error("Recursive delete is required for directories.");
        }
        for (const entryPath of Array.from(files.keys())) {
          if (entryPath.startsWith(`${normalizedPath}/`)) {
            files.delete(entryPath);
            entryMeta.delete(entryPath);
          }
        }
        for (const directoryPath of Array.from(directories.values())) {
          if (
            directoryPath === normalizedPath ||
            directoryPath.startsWith(`${normalizedPath}/`)
          ) {
            directories.delete(directoryPath);
            if (directoryPath !== "/") {
              entryMeta.delete(directoryPath);
            }
          }
        }
        return;
      }

      ensureFile(normalizedPath);
      files.delete(normalizedPath);
      entryMeta.delete(normalizedPath);
    },
  };
}

function Card({ children }) {
  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
      }}
    >
      {children}
    </section>
  );
}

function ControlLabel({ children }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.4rem",
        fontWeight: 600,
      }}
    >
      {children}
    </label>
  );
}

function FilesystemWorkspaceDemo({ components }) {
  const adapterRef = React.useRef(null);
  const [preset, setPreset] = React.useState("atlas");
  const [appearance, setAppearance] = React.useState("light");
  const [workspacePath, setWorkspacePath] = React.useState("/workspace");
  const [eventLog, setEventLog] = React.useState("Ready.");
  const fileWorkspacePresets =
    components.fileWorkspacePresets ?? components.fileWorkspaceThemePresets ?? {};
  const filesystemTheme =
    typeof components.createFileWorkspaceTheme === "function"
      ? components.createFileWorkspaceTheme(preset, { appearance })
      : { appearance, preset };

  if (!adapterRef.current) {
    adapterRef.current = createMockFilesystemAdapter();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card>
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            background: "#ffffff",
            border: "1px solid #e3e8ef",
            borderRadius: "16px",
            boxShadow: "0 14px 30px rgba(17, 34, 51, 0.05)",
            padding: "1rem",
          }}
        >
          <ControlLabel>
            Preset
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                font: "inherit",
                padding: "0.6rem",
              }}
            >
              {Object.entries(fileWorkspacePresets).map(
                ([themeName, value]) => (
                  <option key={themeName} value={themeName}>
                    {value.label}
                  </option>
                ),
              )}
            </select>
          </ControlLabel>
          <ControlLabel>
            Appearance
            <select
              value={appearance}
              onChange={(event) => setAppearance(event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                font: "inherit",
                padding: "0.6rem",
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </ControlLabel>
          <ControlLabel>
            Workspace path
            <select
              value={workspacePath}
              onChange={(event) => {
                const nextWorkspacePath = event.target.value;
                setWorkspacePath(nextWorkspacePath);
                setEventLog(`Workspace: ${nextWorkspacePath}`);
              }}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                font: "inherit",
                padding: "0.6rem",
              }}
            >
              <option value="/">/</option>
              <option value="/workspace">/workspace</option>
              <option value="/workspace/src">/workspace/src</option>
              <option value="/tmp">/tmp</option>
            </select>
          </ControlLabel>
          <div
            style={{
              alignContent: "start",
              color: "#526173",
              display: "grid",
              fontSize: "0.92rem",
              gap: "0.45rem",
            }}
          >
            <strong style={{ color: "#132238" }}>Event log</strong>
            <span>{eventLog}</span>
            <span>
              Open `large.log`, `logo.png`, and `archive.zip` to exercise text,
              image, and binary preview states.
            </span>
          </div>
        </div>
      </Card>
      <components.FileWorkspace
        adapter={adapterRef.current}
        onOpenFile={(path) => setEventLog(`Opened ${path}`)}
        onWorkspacePathChange={(path) => {
          setWorkspacePath(path);
          setEventLog(`Workspace: ${path}`);
        }}
        style={{ minHeight: "780px" }}
        {...filesystemTheme}
        title="Filesystem Browser"
        workspacePath={workspacePath}
      />
    </div>
  );
}

export const filesystemWorkspaceScenario = {
  id: "filesystem-workspace",
  title: "Filesystem Workspace",
  render({ components }) {
    return <FilesystemWorkspaceDemo components={components} />;
  },
};
