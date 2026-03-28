import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distStylesDir = path.join(rootDir, "dist", "styles");
const sourceStylesPath = path.join(rootDir, "src", "styles", "terminal.css");
const xtermStylesPath = path.join(
  rootDir,
  "node_modules",
  "@xterm",
  "xterm",
  "css",
  "xterm.css"
);
const terminalStylesPath = path.join(distStylesDir, "terminal.css");

await mkdir(distStylesDir, { recursive: true });

const [xtermStyles, terminalStyles] = await Promise.all([
  readFile(xtermStylesPath, "utf8"),
  readFile(sourceStylesPath, "utf8"),
]);

await writeFile(
  terminalStylesPath,
  `${xtermStyles.trim()}\n\n${terminalStyles.trim()}\n`,
  "utf8"
);
