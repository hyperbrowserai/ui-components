import React from 'react';

function createMockFilesystemAdapter() {
  const directories = new Set([
    '/',
    '/workspace',
    '/workspace/src',
    '/workspace/src/lib',
    '/workspace/assets',
    '/tmp'
  ]);

  const files = new Map([
    [
      '/workspace/README.md',
      {
        contentType: 'text/markdown',
        contents: '# Workspace Demo\n\nThis visual scenario exercises the filesystem workspace.\n',
        encoding: 'utf8',
        type: 'file'
      }
    ],
    [
      '/workspace/src/index.ts',
      {
        contentType: 'application/typescript',
        contents: [
          "import { bootstrap } from './lib/bootstrap';",
          '',
          'export async function main() {',
          "  const result = await bootstrap('sandbox-fs');",
          "  console.log('ready', result);",
          '}',
          '',
          'void main();'
        ].join('\n'),
        encoding: 'utf8',
        type: 'file'
      }
    ],
    [
      '/workspace/src/lib/bootstrap.ts',
      {
        contentType: 'application/typescript',
        contents: [
          'export async function bootstrap(target: string) {',
          '  return {',
          '    target,',
          "    loadedAt: new Date('2026-03-29T12:00:00Z').toISOString()",
          '  };',
          '}'
        ].join('\n'),
        encoding: 'utf8',
        type: 'file'
      }
    ],
    [
      '/workspace/src/bootstrap-link.ts',
      {
        contentType: 'application/typescript',
        contents: [
          "export { bootstrap } from './lib/bootstrap';"
        ].join('\n'),
        encoding: 'utf8',
        type: 'file'
      }
    ],
    [
      '/workspace/src/large.log',
      {
        contentType: 'text/plain',
        contents: Array.from(
          { length: 64 },
          (_, index) => `line ${String(index + 1).padStart(2, '0')} sandbox log payload`
        ).join('\n'),
        encoding: 'utf8',
        truncated: true,
        type: 'file'
      }
    ],
    [
      '/workspace/assets/logo.png',
      {
        contentType: 'image/png',
        contents: '',
        encoding: 'base64',
        readOnlyReason: 'Binary file preview is not available in the visual harness.',
        type: 'file'
      }
    ],
    [
      '/tmp/notes.txt',
      {
        contentType: 'text/plain',
        contents: 'Temporary scratch pad.\n',
        encoding: 'utf8',
        type: 'file'
      }
    ]
  ]);

  const entryMeta = new Map([
    ['/', { name: '/', path: '/', type: 'directory' }],
    ['/workspace', { name: 'workspace', path: '/workspace', type: 'directory' }],
    ['/workspace/src', { name: 'src', path: '/workspace/src', type: 'directory' }],
    ['/workspace/src/lib', { name: 'lib', path: '/workspace/src/lib', type: 'directory' }],
    ['/workspace/assets', { name: 'assets', path: '/workspace/assets', type: 'directory' }],
    ['/tmp', { name: 'tmp', path: '/tmp', type: 'directory' }],
    ['/workspace/README.md', { name: 'README.md', path: '/workspace/README.md', type: 'file' }],
    ['/workspace/src/index.ts', { name: 'index.ts', path: '/workspace/src/index.ts', type: 'file' }],
    ['/workspace/src/lib/bootstrap.ts', { name: 'bootstrap.ts', path: '/workspace/src/lib/bootstrap.ts', type: 'file' }],
    ['/workspace/src/large.log', { name: 'large.log', path: '/workspace/src/large.log', type: 'file' }],
    ['/workspace/assets/logo.png', { name: 'logo.png', path: '/workspace/assets/logo.png', type: 'file' }],
    ['/tmp/notes.txt', { name: 'notes.txt', path: '/tmp/notes.txt', type: 'file' }],
    [
      '/workspace/src/bootstrap-link.ts',
      {
        name: 'bootstrap-link.ts',
        path: '/workspace/src/bootstrap-link.ts',
        symlinkTarget: '/workspace/src/lib/bootstrap.ts',
        type: 'file'
      }
    ]
  ]);

  const normalizePath = (input) => {
    if (!input || input === '/') {
      return '/';
    }

    const path = `/${String(input).trim()}`.replace(/\/+/g, '/');
    return path.length > 1 ? path.replace(/\/+$/, '') : path;
  };

  const getParentPath = (input) => {
    const path = normalizePath(input);
    if (path === '/') {
      return '/';
    }
    const index = path.lastIndexOf('/');
    return index <= 0 ? '/' : path.slice(0, index);
  };

  const getBaseName = (input) => {
    const path = normalizePath(input);
    if (path === '/') {
      return '/';
    }
    const index = path.lastIndexOf('/');
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
      truncated: fileRecord?.truncated
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
        return left.type === 'directory' ? -1 : 1;
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
      const nextPath = path === fromPath || path.startsWith(`${fromPath}/`)
        ? `${toPath}${path.slice(fromPath.length)}`
        : path;
      nextEntryMeta.set(nextPath, {
        ...value,
        name: nextPath === '/' ? '/' : getBaseName(nextPath),
        path: nextPath
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
          : path
      );
    }
    directories.clear();
    for (const path of nextDirectories.values()) {
      directories.add(path);
    }

    const nextFiles = new Map();
    for (const [path, value] of files.entries()) {
      const nextPath = path === fromPath || path.startsWith(`${fromPath}/`)
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
        path: normalizedPath
      };
    },
    async stat(path) {
      return cloneEntry(normalizePath(path));
    },
    async readFile(path) {
      const normalizedPath = normalizePath(path);
      ensureFile(normalizedPath);
      const record = files.get(normalizedPath);
      const isBinary = record.contentType && !record.contentType.startsWith('text/') && record.contentType !== 'application/typescript';
      if (isBinary) {
        return {
          contentType: record.contentType,
          contents: '',
          encoding: record.encoding,
          path: normalizedPath,
          readOnly: true,
          readOnlyReason: record.readOnlyReason
        };
      }
      return {
        contentType: record.contentType,
        contents: record.contents,
        encoding: record.encoding,
        path: normalizedPath,
        readOnly: Boolean(record.truncated),
        readOnlyReason: record.truncated
          ? 'This file exceeds the runtime read limit and is read-only in v1.'
          : undefined,
        truncated: Boolean(record.truncated)
      };
    },
    async writeFile(path, contents) {
      const normalizedPath = normalizePath(path);
      ensureFile(normalizedPath);
      const current = files.get(normalizedPath);
      files.set(normalizedPath, {
        ...current,
        contents,
        truncated: false
      });
    },
    async createFile(path, contents = '') {
      const normalizedPath = normalizePath(path);
      const parentPath = getParentPath(normalizedPath);
      ensureDirectory(parentPath);
      files.set(normalizedPath, {
        contentType: 'text/plain',
        contents,
        encoding: 'utf8',
        type: 'file'
      });
      entryMeta.set(normalizedPath, {
        name: getBaseName(normalizedPath),
        path: normalizedPath,
        type: 'file'
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
        type: 'directory'
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
          throw new Error('Recursive delete is required for directories.');
        }
        for (const entryPath of Array.from(files.keys())) {
          if (entryPath.startsWith(`${normalizedPath}/`)) {
            files.delete(entryPath);
            entryMeta.delete(entryPath);
          }
        }
        for (const directoryPath of Array.from(directories.values())) {
          if (directoryPath === normalizedPath || directoryPath.startsWith(`${normalizedPath}/`)) {
            directories.delete(directoryPath);
            if (directoryPath !== '/') {
              entryMeta.delete(directoryPath);
            }
          }
        }
        return;
      }

      ensureFile(normalizedPath);
      files.delete(normalizedPath);
      entryMeta.delete(normalizedPath);
    }
  };
}

function Card({ children }) {
  return React.createElement(
    'section',
    {
      style: {
        display: 'grid',
        gap: '1rem'
      }
    },
    children
  );
}

function ControlLabel({ children }) {
  return React.createElement(
    'label',
    {
      style: {
        display: 'grid',
        gap: '0.4rem',
        fontWeight: 600
      }
    },
    children
  );
}

function FilesystemWorkspaceDemo({ components }) {
  const adapterRef = React.useRef(null);
  const [theme, setTheme] = React.useState('atlas');
  const [initialPath, setInitialPath] = React.useState('/workspace/src/index.ts');
  const [eventLog, setEventLog] = React.useState('Ready.');

  if (!adapterRef.current) {
    adapterRef.current = createMockFilesystemAdapter();
  }

  React.useEffect(() => {
    components.configureMonacoLoader?.({ vsPath: '/dist/monaco/vs' });
  }, [components]);

  return React.createElement(
    'div',
    { style: { display: 'grid', gap: '1rem' } },
    React.createElement(
      Card,
      null,
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gap: '0.9rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '16px',
            boxShadow: '0 14px 30px rgba(17, 34, 51, 0.05)',
            padding: '1rem'
          }
        },
        React.createElement(
          ControlLabel,
          null,
          'Theme',
          React.createElement(
            'select',
            {
              value: theme,
              onChange: (event) => setTheme(event.target.value),
              style: {
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                font: 'inherit',
                padding: '0.6rem'
              }
            },
            Object.entries(components.fileWorkspaceThemePresets ?? {}).map(([themeName, value]) =>
              React.createElement('option', { key: themeName, value: themeName }, value.label)
            )
          )
        ),
        React.createElement(
          ControlLabel,
          null,
          'Initial path',
          React.createElement(
            'select',
            {
              value: initialPath,
              onChange: (event) => setInitialPath(event.target.value),
              style: {
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                font: 'inherit',
                padding: '0.6rem'
              }
            },
            React.createElement('option', { value: '/workspace/src/index.ts' }, '/workspace/src/index.ts'),
            React.createElement('option', { value: '/workspace/src/large.log' }, '/workspace/src/large.log'),
            React.createElement('option', { value: '/workspace/assets/logo.png' }, '/workspace/assets/logo.png'),
            React.createElement('option', { value: '/tmp' }, '/tmp')
          )
        ),
        React.createElement(
          'div',
          {
            style: {
              alignContent: 'start',
              color: '#526173',
              display: 'grid',
              fontSize: '0.92rem',
              gap: '0.45rem'
            }
          },
          React.createElement('strong', { style: { color: '#132238' } }, 'Event log'),
          React.createElement('span', null, eventLog),
          React.createElement(
            'span',
            null,
            'Open `large.log` and `logo.png` to confirm the read-only v1 rules.'
          )
        )
      )
    ),
    React.createElement(components.FileWorkspace, {
      adapter: adapterRef.current,
      initialPath,
      key: `${theme}:${initialPath}`,
      onCreateDirectory: (path) => setEventLog(`Created directory ${path}`),
      onCreateFile: (path) => setEventLog(`Created file ${path}`),
      onDelete: (path) => setEventLog(`Deleted ${path}`),
      onOpenFile: (path) => setEventLog(`Opened ${path}`),
      onRename: (path, nextPath) => setEventLog(`Renamed ${path} to ${nextPath}`),
      onSaveFile: (path) => setEventLog(`Saved ${path}`),
      style: { minHeight: '780px' },
      theme,
      title: 'Filesystem Workspace'
    })
  );
}

export const filesystemWorkspaceScenario = {
  id: 'filesystem-workspace',
  title: 'Filesystem Workspace',
  render({ components }) {
    return React.createElement(FilesystemWorkspaceDemo, { components });
  }
};
