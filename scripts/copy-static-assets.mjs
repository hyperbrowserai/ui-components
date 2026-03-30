import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distStylesDir = path.join(rootDir, "dist", "styles");
const distMonacoDir = path.join(rootDir, "dist", "monaco");
const sourceTerminalStylesPath = path.join(rootDir, "src", "styles", "terminal.css");
const sourceFilesystemStylesPath = path.join(rootDir, "src", "styles", "filesystem.css");
const xtermStylesPath = path.join(
  rootDir,
  "node_modules",
  "@xterm",
  "xterm",
  "css",
  "xterm.css"
);
const monacoVsPath = path.join(rootDir, "node_modules", "monaco-editor", "min", "vs");
const distMonacoVsPath = path.join(distMonacoDir, "vs");
const terminalStylesPath = path.join(distStylesDir, "terminal.css");
const filesystemStylesPath = path.join(distStylesDir, "filesystem.css");

await Promise.all([
  mkdir(distStylesDir, { recursive: true }),
  mkdir(distMonacoDir, { recursive: true }),
]);

const [xtermStyles, terminalStyles, filesystemStyles] = await Promise.all([
  readFile(xtermStylesPath, "utf8"),
  readFile(sourceTerminalStylesPath, "utf8"),
  readFile(sourceFilesystemStylesPath, "utf8"),
]);

await Promise.all([
  writeFile(
    terminalStylesPath,
    `${xtermStyles.trim()}\n\n${terminalStyles.trim()}\n`,
    "utf8"
  ),
  writeFile(filesystemStylesPath, `${filesystemStyles.trim()}\n`, "utf8"),
  cp(monacoVsPath, distMonacoVsPath, { recursive: true }),
]);
