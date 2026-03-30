# Sandbox Filesystem Component Plan

## Goal

Build a React filesystem workspace component in this repo that works well with Hyperbrowser sandboxes while keeping the UI layer reusable and visually polished.

The component should feel like a modern browser devtool:

- a fast file tree on the left
- tabs and editor on the right
- clean theming
- text editing plus file creation, rename, and delete
- room to grow into previews, diffs, and richer file actions later

## Recommendation

Use:

1. `monaco-editor` for the editor pane
2. a separate tree component for the explorer pane
3. a generic filesystem adapter layer, then a Hyperbrowser-specific wrapper on top

Do not use Monaco as the file explorer itself.

Monaco is the best fit for code editing, but it is not a full file explorer or workbench framework. The explorer should be a separate component with its own data model, keyboard behavior, and theming.

## Options Evaluated

### Option 1: Monaco + Headless Tree

This is the recommended path.

Why:

- strong code editing experience
- familiar developer UX
- future support for diff views, decorations, diagnostics, and multi-model editing
- tree can stay lightweight and fully themeable

Good fit for:

- code browsing
- text editing
- future IDE-like features without committing to a full IDE framework

Tradeoffs:

- Monaco integration is heavier than simpler editors
- worker setup and model lifecycle need careful handling
- mobile support is not a strength

### Option 2: CodeMirror 6 + Headless Tree

This is the best lighter-weight alternative.

Why:

- easier integration
- more modular
- easier theming and smaller footprint
- better if we want a simpler editor-first component instead of a VS Code-like experience

Good fit for:

- lighter bundles
- simpler v1 editing
- stronger mobile/accessibility tradeoffs

Tradeoff:

- less desktop-IDE feel than Monaco

### Option 3: Full IDE Framework Such as Theia

Not recommended for this repo.

Why not:

- too heavy for `ui-components`
- introduces a workbench architecture, not just reusable React components
- much larger surface area than we need for file browsing and editing

## Final Call

For this project, I recommend:

1. Monaco for the editor
2. a headless tree for the explorer
3. custom Hyperbrowser styling and layout around both

This gives us a serious editor without forcing the component into full-IDE complexity.

## Decisions

These are fixed for this component plan:

- use Monaco immediately, not a temporary lighter editor
- support create, rename, and delete in v1
- support a modern themed explorer + editor workspace, not a bare utility UI
- keep the generic workspace UI separate from Hyperbrowser runtime auth and endpoint details

## Current Backend Review

The runtime file API already exists in `browserctrl` and is broader than the minimum v1 UI needs.

Important routing split:

- there is no separate control-plane CRUD file API for sandbox contents
- file operations are runtime data-plane routes on the receiver
- the control plane is only relevant for minting runtime/browser auth, not for file reads and writes themselves

Current receiver routes:

- `GET /sandbox/files`
- `GET /sandbox/files/stat`
- `POST /sandbox/files/read`
- `POST /sandbox/files/write`
- `POST|PUT /sandbox/files/upload`
- `GET /sandbox/files/download`
- `POST /sandbox/files/delete`
- `POST /sandbox/files/mkdir`
- `POST /sandbox/files/move`
- `POST /sandbox/files/copy`
- `POST /sandbox/files/chmod`
- `POST /sandbox/files/chown`
- `POST /sandbox/files/watch`
- `GET|DELETE /sandbox/files/watch/{id}`
- `GET /sandbox/files/watch/{id}/ws`
- `GET /sandbox/files/watch/{id}/stream`
- `POST /sandbox/files/presign-upload`
- `POST /sandbox/files/presign-download`
- `PUT|POST /sandbox/files/signed/upload/{token}`
- `GET /sandbox/files/signed/download/{token}`

The receiver registers all of these today, so this is not a proposed surface. It is already live in the runtime data plane.

Current canonical list contract:

- `GET /sandbox/files?path=...&depth=...`
- the current CLI and Node SDK already use `depth`
- older `recursive` / `limit` / `cursor` list references in other docs and older tests are stale and should not guide this component plan

## What Maps Cleanly To The UI

The existing file API maps cleanly to the core workspace actions we want:

- browse directory: `GET /sandbox/files?path=...&depth=1`
- inspect metadata: `GET /sandbox/files/stat?path=...`
- open text file: `POST /sandbox/files/read`
- save text file: `POST /sandbox/files/write`
- create file: `POST /sandbox/files/write` with empty or initial contents
- create folder: `POST /sandbox/files/mkdir`
- rename or move: `POST /sandbox/files/move`
- delete file or folder: `POST /sandbox/files/delete`

So yes: the current backend surface is enough for list/read/write/create/rename/delete without any receiver expansion.

## Important Runtime Semantics

The UI should be designed around the current behavior, not an idealized file API.

### Directory listing shape

`GET /sandbox/files` does not return a nested tree object.

It returns a flat list of entries under `path`, sorted by absolute path, with a required `path` query param and `depth >= 1`.

`depth` does support recursive traversal:

- `depth=1` returns immediate children
- `depth>1` walks deeper descendants up to that level

But even when recursion is used, the payload is still flat and the frontend still needs to construct the nested tree itself.

Practical implication:

- the frontend should build the tree structure itself
- the explorer should load directory children lazily, one directory at a time
- use `depth=1` for normal tree expansion instead of deep recursive fetches
- cache per-directory results and patch the tree locally after create/rename/delete when possible

This is the right fit for a file explorer anyway.

This `depth` contract is the current canonical one for the runtime, CLI, and SDK.

### Read behavior

`POST /sandbox/files/read` supports:

- `path`
- `offset`
- `length`
- `encoding = utf8 | base64`

The response also reports:

- `bytesRead`
- `truncated`
- `contentType`

Practical implication:

- text editing works cleanly
- binary files can be detected and handled separately
- large files need a read policy because reads are bounded by runtime limits

V1 policy:

- if `truncated=true`, open the file read-only and disable save
- if the file appears to be binary or non-text, open it read-only and disable save
- v1 does not attempt partial-edit save behavior for truncated files

### Write behavior

`POST /sandbox/files/write` supports:

- single-file write via `path + data`
- batch write via `files[]`
- `encoding = utf8 | base64`
- `append`
- `mode`

The file manager auto-creates parent directories for writes.

Practical implication:

- creating a new file is straightforward
- save and save-as are straightforward
- we can add multi-file writes later if we want optimistic batch saves

### Create / rename / delete behavior

Current semantics are good for a UI:

- `mkdir` reports whether it actually created the directory
- `move` handles rename/move and returns the resulting entry
- `delete` is idempotent for missing paths
- recursive delete is explicit for directories

Practical implication:

- create / rename / delete all fit well in v1
- folder deletion should surface a confirmation step when `recursive=true`

### Symlink behavior

The runtime preserves symlink metadata in list/stat and avoids expanding symlink loops during listing and copy.

However, the current path resolver is not a strict jailed “stay under one root” abstraction. The receiver follows existing ancestor symlinks when resolving paths.

Practical implication:

- do not describe this UI as operating inside a stricter virtual filesystem boundary than the sandbox OS itself
- the UI should treat runtime paths as real sandbox paths, not a synthetic project-only root
- symlinks should be shown as first-class entries in the tree with link metadata, not hidden or flattened away
- because v1 will show the real sandbox root by default, symlinked directories can expand in place like a normal filesystem explorer

### Large/binary transfer behavior

The runtime also has:

- raw upload/download endpoints
- presigned upload/download URLs

These are useful for large files and binary transfer, but they are not required for the first editor-focused version.

### File watching

The runtime has watch creation, watch status, and websocket streaming with cursor replay.

This is useful later for:

- external change detection
- auto-refresh
- live collaboration or background process updates

It is not required for the first workspace version.

## Backend Constraints That Matter For The UI

Current file API constraints worth planning around:

- listing is capped by a receiver-side max entry limit
- reads are capped by a receiver-side max read size and can be truncated
- uploads are capped by a receiver-side max upload size
- watch concurrency is capped
- file routes currently use runtime bearer auth only

The first three affect UX directly. The last one is the main integration blocker for customer-facing browser use.

## Browser Auth Status

Unlike PTY, the runtime file routes do not yet have a browser cookie/bootstrap flow.

Current state:

- PTY routes have browser bootstrap support through the runtime host
- file routes are still classified as bearer-only at the regional proxy

That means:

- CLI and server-side callers can use files today
- a browser-native filesystem component will need the same browser-safe runtime auth work we just did for PTY, extended to file capabilities

Recommendation:

- do not create a second cookie by default
- reuse the same runtime browser cookie model
- for v1, have `POST /sandbox/:id/runtime/browser-auth` mint one fixed browser grant for terminal + filesystem routes
- do not add per-request capability negotiation in this first cut

Fixed v1 capability set:

- `pty`
- `fs.read`
- `fs.write`
- `fs.manage`

Then regional-proxy can enforce capabilities per route without minting a second filesystem-specific cookie.

## Required Backend Work Before Browser Filesystem UI

Before `HyperbrowserFileWorkspace` can talk to the runtime directly from the browser, `browserctrl` needs the same browser-safe data-plane treatment PTY now has.

Recommended backend changes:

1. Have `POST /sandbox/:id/runtime/browser-auth` mint a fixed browser grant with:
   - `pty`
   - `fs.read`
   - `fs.write`
   - `fs.manage`
2. Teach `regional-proxy` to accept the runtime browser cookie on direct file HTTP routes as well as PTY routes.
3. Enforce per-route capabilities:
   - list/stat/read/download: `fs.read`
   - write/upload: `fs.write`
   - mkdir/move/delete/copy/chmod/chown: `fs.manage`
4. Add exact-origin credentialed CORS for the file HTTP routes.
5. Keep bearer auth support for CLI and server-side callers.

Explicitly out of scope for browser-cookie auth in v1:

- file watch routes
- presign routes
- signed upload/download routes

## Proposed Architecture

The filesystem UI should follow the same two-layer pattern as terminal:

1. a generic filesystem workspace UI layer
2. a Hyperbrowser-specific sandbox filesystem adapter

## Layer 1: Generic Filesystem Workspace

Responsibility:

- render the file tree
- render tabs and editor panes
- load and display file contents
- track dirty state
- save file edits
- own theming, layout, and user interaction

This layer should not know about:

- Hyperbrowser runtime hosts
- regional-proxy
- sandbox auth bootstrap
- sandbox-specific file endpoints

Suggested exports:

- `FileWorkspace`
- `FileTree`
- `CodeEditorPane`
- `FileWorkspaceTheme`
- filesystem adapter types

Suggested adapter interface:

```ts
export type FileEntry = {
  path: string;
  name: string;
  type: "file" | "directory";
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

export type FileDocument = {
  path: string;
  contents: string;
  contentType?: string;
  encoding?: string;
  language?: string;
  readOnly?: boolean;
  truncated?: boolean;
};

export type FileWorkspaceAdapter = {
  listDirectory(path: string): Promise<FileDirectoryListing>;
  stat(path: string): Promise<FileEntry>;
  readFile(path: string): Promise<FileDocument>;
  writeFile(path: string, contents: string): Promise<void>;
  createFile(path: string, contents?: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  rename(path: string, nextPath: string): Promise<void>;
  delete(path: string, options?: { recursive?: boolean }): Promise<void>;
};
```

Suggested component props:

- `adapter`
- `initialPath`
- `theme`
- `className`
- `style`
- `readOnly`
- `onOpenFile`
- `onSaveFile`
- `onCreateFile`
- `onCreateDirectory`
- `onRename`
- `onDelete`
- `onError`

V1 root behavior:

- `HyperbrowserFileWorkspace` should default `initialPath` to `/`
- v1 should show the real sandbox filesystem root by default
- do not add a scoped tree-root prop in v1
- if we later need an embedded subtree view, add an optional `treeRootPath` prop and document clearly that it is a UI boundary, not a backend security boundary

## Layer 2: Hyperbrowser Sandbox Filesystem Wrapper

Responsibility:

- implement the filesystem adapter for sandbox file APIs
- handle auth bootstrap
- call runtime file endpoints
- later support permissions, retries, and reconnect-safe behavior

Suggested exports:

- `createHyperbrowserFilesystemAdapter`
- `HyperbrowserFileWorkspace`

This wrapper should stay separate from the generic workspace UI so we can test the editor and explorer with mock adapters first.

## UI Composition

Recommended layout:

1. Left explorer rail
2. Center tab strip
3. Main editor pane
4. Optional status bar

For v1, include:

- tree explorer
- tabs for multiple open files
- save shortcut
- dirty indicator
- create file
- create folder
- rename
- delete
- loading and error states

Do not start with:

- split editors
- drag and drop
- search across files
- git decorations
- binary previews
- inline rename everywhere

## Monaco Role

Monaco should power the editor pane only.

Use it for:

- syntax highlighting
- multi-language support
- editor theming
- model/view-state preservation per open file
- future diff editor support
- immediate first-pass production editor behavior, not a placeholder

Important implementation note:

This repo currently builds with plain `tsc` outputs rather than a bundler-driven application shell. Monaco worker setup will need to be handled carefully in this library environment.

Recommended worker packaging direction:

- ship Monaco worker files as package static assets under `dist`
- export a small helper or config entry point for setting `MonacoEnvironment`
- avoid requiring host applications to use a Monaco-specific bundler plugin
- make the visual harness load the same packaged worker assets we intend to publish

## Explorer Role

The explorer should be a separate tree implementation, not a Monaco feature.

Requirements:

- directory expansion and collapse
- keyboard navigation
- selected and active file states
- lazy loading of directories
- compact density
- icons and badges
- room for context actions later

Recommended direction:

- use a headless tree primitive or a minimal accessibility-focused tree base
- own the actual visual styling ourselves
- support inline create and rename interactions in the tree
- support destructive actions from a context menu or action row

## Visual Direction

The filesystem component should look modern and intentional, not like a default admin panel.

Visual goals:

- dense but calm left rail
- refined surface layering
- subtle separators instead of heavy boxes
- themeable tabs
- active file treatment with clear hierarchy
- polished empty/loading/error states

Recommended styling system:

- CSS variables for workspace chrome
- separate theme tokens for tree, tabs, and editor container
- Monaco theme derived from the outer workspace theme

Core theme areas:

- workspace background
- panel background
- border and divider colors
- active row and hover row
- tab background and active tab
- typography and icon color
- status, dirty, and read-only states

## Runtime Auth Direction

When this moves onto real sandbox runtime routes, the browser auth model should follow the same overall approach as terminal.

Recommendation:

- reuse the same runtime browser cookie
- use a fixed v1 runtime browser grant rather than minting a separate filesystem cookie or adding per-request capability negotiation

Fixed v1 capability model:

- `pty`
- `fs.read`
- `fs.write`
- `fs.manage`

Then route enforcement stays capability-based:

- PTY routes require `pty`
- file read routes require `fs.read`
- file write routes require `fs.write`
- create/rename/delete routes require `fs.manage`

Out of browser-cookie scope in v1:

- file watch routes
- presign routes
- signed upload/download routes

Do not add a second filesystem-specific cookie unless policy needs diverge later.

## Suggested Files

```text
src/components/filesystem/FileWorkspace.tsx
src/components/filesystem/FileTree.tsx
src/components/filesystem/CodeEditorPane.tsx
src/components/filesystem/fileWorkspaceThemes.ts
src/components/filesystem/types.ts

src/components/hyperbrowser/HyperbrowserFileWorkspace.tsx
src/components/hyperbrowser/hyperbrowser-filesystem-adapter.ts
```

Also required:

- exports from `src/index.ts`
- package CSS export for filesystem styles
- visual harness scenario for manual verification

## Phased Implementation Plan

### Phase 1: Generic Filesystem Abstractions

- define filesystem adapter types
- define file tree and document models
- define workspace theme tokens

### Phase 2: Generic Workspace UI

- build `FileWorkspace`
- build tree explorer shell
- build tab strip
- build Monaco-backed editor pane
- track dirty state
- add save behavior
- add create file / folder flows
- add rename flow
- add delete flow

### Phase 3: Mock Adapter and Manual Validation

- add in-memory filesystem adapter
- add visual scenario with nested folders and editable files
- verify theming, keyboard navigation, dirty state, save, create, rename, and delete

### Phase 4: Hyperbrowser Adapter

- add sandbox filesystem adapter
- connect to runtime file endpoints
- add browser auth support in `browserctrl` for direct file CRUD/editor routes using the same runtime browser cookie model
- add retry and error handling

### Phase 5: Hardening

- preserve editor view state per file
- improve large-file loading and read-only messaging
- refine symlink presentation and metadata display
- add file watch integration for external change detection

## V1 Scope

V1 should include:

- browse directories
- open a text file
- edit text file
- save text file
- create file
- create directory
- rename file or directory
- delete file or directory
- tabs for multiple open files
- dirty state
- keyboard save shortcut
- read-only fallback for truncated files
- read-only fallback for binary or non-text files
- loading and error states
- theme support

V1 should not require:

- diff editor
- binary preview
- drag and drop
- search panel
- git integration
- browser-cookie auth for watch or presigned transfer routes
- full workbench behaviors

## Recommended Next Step

Start with the generic layer first:

1. adapter types
2. `FileWorkspace` shell
3. headless tree with create/rename/delete actions
4. Monaco editor pane
5. mock in-memory visual scenario

Then move to backend integration in this order:

1. extend runtime browser auth in `browserctrl` from PTY-only to filesystem capabilities
2. implement `createHyperbrowserFilesystemAdapter`
3. connect the workspace UI to real runtime file routes
4. validate the canonical `depth`-based list/read/write/create/rename/delete flow against the local backend
