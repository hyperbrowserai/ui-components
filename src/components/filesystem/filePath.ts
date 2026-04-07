export function normalizeFilePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }

  const segments: string[] = [];
  for (const segment of trimmed.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return `/${segments.join("/")}` || "/";
}

export function isRootPath(path: string): boolean {
  return normalizeFilePath(path) === "/";
}

export function getBaseName(path: string): string {
  const normalizedPath = normalizeFilePath(path);
  if (normalizedPath === "/") {
    return "/";
  }
  return normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
}

export function getDirName(path: string): string {
  const normalizedPath = normalizeFilePath(path);
  if (normalizedPath === "/") {
    return "/";
  }

  const slashIndex = normalizedPath.lastIndexOf("/");
  if (slashIndex <= 0) {
    return "/";
  }
  return normalizedPath.slice(0, slashIndex) || "/";
}

export function joinFilePath(basePath: string, nextPart: string): string {
  if (nextPart.startsWith("/")) {
    return normalizeFilePath(nextPart);
  }
  if (isRootPath(basePath)) {
    return normalizeFilePath(`/${nextPart}`);
  }
  return normalizeFilePath(`${basePath}/${nextPart}`);
}

export function getAncestorPaths(path: string): string[] {
  const normalizedPath = normalizeFilePath(path);
  if (normalizedPath === "/") {
    return ["/"];
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  const paths = ["/"];
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    paths.push(currentPath);
  }
  return paths;
}

export function isPathWithin(basePath: string, candidatePath: string): boolean {
  const normalizedBasePath = normalizeFilePath(basePath);
  const normalizedCandidatePath = normalizeFilePath(candidatePath);
  if (normalizedBasePath === "/") {
    return true;
  }
  return (
    normalizedCandidatePath === normalizedBasePath ||
    normalizedCandidatePath.startsWith(`${normalizedBasePath}/`)
  );
}

export function getSymlinkCycleTarget(
  path: string,
  symlinkTarget: string | undefined
): string | null {
  if (!symlinkTarget || !symlinkTarget.trim()) {
    return null;
  }

  const normalizedPath = normalizeFilePath(path);
  const normalizedTarget = normalizeFilePath(symlinkTarget);
  if (!isPathWithin(normalizedTarget, normalizedPath)) {
    return null;
  }

  return normalizedTarget;
}
