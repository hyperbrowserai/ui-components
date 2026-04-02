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
const sourceFilesystemStylesPath = path.join(
  rootDir,
  "src",
  "styles",
  "filesystem.css"
);
const xtermStylesPath = path.join(
  rootDir,
  "node_modules",
  "@xterm",
  "xterm",
  "css",
  "xterm.css"
);
const terminalCoreBundle = (xtermStyles, terminalCoreStyles) =>
  `${xtermStyles.trim()}\n\n${terminalCoreStyles.trim()}\n`;
const terminalBundle = (xtermStyles, terminalCoreStyles, terminalStyles) =>
  `${terminalCoreBundle(xtermStyles, terminalCoreStyles).trim()}\n\n${terminalStyles.trim()}\n`;
const fullStylesBundle = (
  xtermStyles,
  terminalCoreStyles,
  terminalStyles,
  filesystemStyles
) => `${terminalBundle(xtermStyles, terminalCoreStyles, terminalStyles).trim()}\n\n${filesystemStyles.trim()}\n`;

await mkdir(distStylesDir, { recursive: true });

const [xtermStyles, terminalCoreStyles, terminalStyles, filesystemStyles] =
  await Promise.all([
    readFile(xtermStylesPath, "utf8"),
    readFile(sourceTerminalCoreStylesPath, "utf8"),
    readFile(sourceTerminalStylesPath, "utf8"),
    readFile(sourceFilesystemStylesPath, "utf8"),
  ]);

await Promise.all([
  writeFile(
    path.join(distStylesDir, "terminal-core.css"),
    terminalCoreBundle(xtermStyles, terminalCoreStyles),
    "utf8"
  ),
  writeFile(
    path.join(distStylesDir, "terminal.css"),
    terminalBundle(xtermStyles, terminalCoreStyles, terminalStyles),
    "utf8"
  ),
  writeFile(
    path.join(distStylesDir, "filesystem.css"),
    `${filesystemStyles.trim()}\n`,
    "utf8"
  ),
  writeFile(
    path.join(distStylesDir, "styles.css"),
    fullStylesBundle(
      xtermStyles,
      terminalCoreStyles,
      terminalStyles,
      filesystemStyles
    ),
    "utf8"
  ),
]);
