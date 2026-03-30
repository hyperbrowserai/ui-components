import { getBaseName } from "./filePath";

const extensionToLanguage: Record<string, string> = {
  cjs: "javascript",
  css: "css",
  go: "go",
  html: "html",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "javascript",
  md: "markdown",
  mjs: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "shell",
  sql: "sql",
  ts: "typescript",
  tsx: "typescript",
  txt: "plaintext",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};

const fileNameToLanguage: Record<string, string> = {
  "Dockerfile": "dockerfile",
  "README": "markdown",
  "README.md": "markdown",
  "package-lock.json": "json",
  "package.json": "json",
  "tsconfig.base.json": "json",
  "tsconfig.cjs.json": "json",
  "tsconfig.esm.json": "json",
  "tsconfig.json": "json",
  "tsconfig.types.json": "json",
};

export function inferLanguageFromPath(path: string): string | undefined {
  const fileName = getBaseName(path);
  if (fileNameToLanguage[fileName]) {
    return fileNameToLanguage[fileName];
  }

  const extensionIndex = fileName.lastIndexOf(".");
  if (extensionIndex <= 0 || extensionIndex === fileName.length - 1) {
    return undefined;
  }

  const extension = fileName.slice(extensionIndex + 1).toLowerCase();
  return extensionToLanguage[extension];
}

export function isTextLikeContentType(contentType?: string): boolean {
  if (!contentType) {
    return true;
  }

  const normalizedContentType = contentType.toLowerCase();
  return (
    normalizedContentType.startsWith("text/") ||
    normalizedContentType.includes("json") ||
    normalizedContentType.includes("javascript") ||
    normalizedContentType.includes("typescript") ||
    normalizedContentType.includes("xml") ||
    normalizedContentType.includes("yaml") ||
    normalizedContentType.includes("toml") ||
    normalizedContentType.includes("shell") ||
    normalizedContentType.includes("markdown")
  );
}
