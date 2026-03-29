import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultEntry = '/tests/visual/harness/index.html';
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const defaultHost = process.env.HOST ?? 'localhost';

function parseHostArg(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--host') {
      return argv[index + 1];
    }

    if (value.startsWith('--host=')) {
      return value.slice('--host='.length);
    }
  }

  return null;
}

const host = parseHostArg(process.argv.slice(2)) ?? defaultHost;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function resolvePath(urlPath) {
  const relativePath = urlPath.replace(/^[/\\]+/, '');
  const normalizedPath = path.normalize(relativePath);
  return path.join(rootDir, normalizedPath);
}

async function resolveFilePath(requestPath) {
  const filePath = resolvePath(requestPath);
  const relativeToRoot = path.relative(rootDir, filePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  const entry = await stat(filePath).catch(() => null);
  if (entry?.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    const indexEntry = await stat(indexPath).catch(() => null);
    return indexEntry?.isFile() ? indexPath : null;
  }

  if (entry?.isFile()) {
    return filePath;
  }

  if (!path.extname(filePath)) {
    const candidates = ['.js', '.mjs', '.cjs'];
    for (const extension of candidates) {
      const candidatePath = `${filePath}${extension}`;
      const candidateEntry = await stat(candidatePath).catch(() => null);
      if (candidateEntry?.isFile()) {
        return candidatePath;
      }
    }
  }

  return null;
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const requestPath = requestUrl.pathname === '/' ? defaultEntry : requestUrl.pathname;

  const filePath = await resolveFilePath(requestPath);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] ?? 'application/octet-stream';
  const body = await readFile(filePath).catch(() => null);

  if (!body) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Unable to read file');
    return;
  }

  res.writeHead(200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Type': contentType,
    Pragma: 'no-cache'
  });
  res.end(body);
});

server.listen(port, host, () => {
  console.log(`Visual harness running at http://${host}:${port}${defaultEntry}`);
});
