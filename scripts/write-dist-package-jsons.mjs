import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esmDir = path.join(rootDir, 'dist', 'esm');
const cjsDir = path.join(rootDir, 'dist', 'cjs');

await Promise.all([
  mkdir(esmDir, { recursive: true }),
  mkdir(cjsDir, { recursive: true })
]);

await Promise.all([
  writeFile(path.join(esmDir, 'package.json'), '{\n  "type": "module"\n}\n', 'utf8'),
  writeFile(path.join(cjsDir, 'package.json'), '{\n  "type": "commonjs"\n}\n', 'utf8')
]);
