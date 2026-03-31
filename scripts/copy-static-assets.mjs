import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distStylesDir = path.join(rootDir, "dist", "styles");
const sourceTerminalCoreStylesPath = path.join(
  rootDir,
  "src",
  "styles",
  "terminal-core.css"
);
const sourceTerminalStylesPath = path.join(rootDir, "src", "styles", "terminal.css");
const xtermStylesPath = path.join(
  rootDir,
  "node_modules",
  "@xterm",
  "xterm",
  "css",
  "xterm.css"
);
const terminalCoreStylesPath = path.join(distStylesDir, "terminal-core.css");
const terminalStylesPath = path.join(distStylesDir, "terminal.css");

await mkdir(distStylesDir, { recursive: true });

const [xtermStyles, terminalCoreStyles, terminalStyles] = await Promise.all([
  readFile(xtermStylesPath, "utf8"),
  readFile(sourceTerminalCoreStylesPath, "utf8"),
  readFile(sourceTerminalStylesPath, "utf8"),
]);

await Promise.all([
  writeFile(
    terminalCoreStylesPath,
    `${xtermStyles.trim()}\n\n${terminalCoreStyles.trim()}\n`,
    "utf8"
  ),
  writeFile(
    terminalStylesPath,
    `${xtermStyles.trim()}\n\n${terminalCoreStyles.trim()}\n\n${terminalStyles.trim()}\n`,
    "utf8"
  ),
]);
