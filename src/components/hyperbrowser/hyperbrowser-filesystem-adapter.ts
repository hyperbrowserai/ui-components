import { inferLanguageFromPath } from "../filesystem/fileLanguage";
import { normalizeFilePath } from "../filesystem/filePath";
import type {
  FileDirectoryListing,
  FileEntry,
  FilePreview,
  FileWorkspaceAdapter,
} from "../filesystem/types";

type HyperbrowserRuntimeTarget = {
  baseUrl: string;
  host?: string;
  transport?: string;
};

const DEFAULT_HYPERBROWSER_API_BASE_URL = "https://api.hyperbrowser.ai/api";

export type HyperbrowserRuntimeBrowserAuth = {
  allowedOrigin?: string;
  bootstrapUrl: string;
  bootstrapUrlExpiresAt?: string | null;
  capabilities?: string[];
  runtime: HyperbrowserRuntimeTarget;
};

export type HyperbrowserFilesystemBrowserAuthParams = {
  browserAuthEndpoint?: string;
  sandboxId?: string;
  signal: AbortSignal;
};

export type HyperbrowserFilesystemBrowserAuthResolver = (
  params: HyperbrowserFilesystemBrowserAuthParams
) => Promise<HyperbrowserRuntimeBrowserAuth>;

export type HyperbrowserFilesystemAdapterOptions = {
  apiBaseUrl?: string;
  apiCredentials?: RequestCredentials;
  apiHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  bootstrapUrl?: string;
  browserAuthPath?: string;
  fetch?: typeof fetch;
  getRuntimeBrowserAuth?: HyperbrowserFilesystemBrowserAuthResolver;
  runtimeBaseUrl?: string;
  sandboxId?: string;
};

type HyperbrowserFileInfoWire = {
  group?: string;
  mode?: number;
  modifiedTime?: number;
  name: string;
  owner?: string;
  path: string;
  permissions?: string;
  size?: number;
  symlinkTarget?: string;
  type: string;
};

type HyperbrowserListWireResponse = {
  entries: HyperbrowserFileInfoWire[];
  path: string;
};

type HyperbrowserStatWireResponse = {
  file: HyperbrowserFileInfoWire;
};

type HyperbrowserPreviewWirePayload = {
  content?: string;
  contentType?: string;
  encoding?: string;
  expiresAt?: number;
  kind: string;
  name?: string;
  path: string;
  reason?: string;
  size?: number;
  url?: string;
};

type HyperbrowserPreviewWireResponse = {
  preview: HyperbrowserPreviewWirePayload;
};

class HyperbrowserRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "HyperbrowserRequestError";
    this.status = status;
  }
}

function resolveFetchImplementation(
  fetchImpl: typeof fetch | undefined
): typeof fetch {
  const resolved = fetchImpl ?? globalThis.fetch;
  if (typeof resolved !== "function") {
    throw new Error(
      "Hyperbrowser filesystem transport requires a global fetch implementation."
    );
  }
  return resolved;
}

function resolveUrl(baseUrl: string, path: string): URL {
  const normalizedBaseUrl = new URL(baseUrl);
  if (!normalizedBaseUrl.pathname.endsWith("/")) {
    normalizedBaseUrl.pathname = `${normalizedBaseUrl.pathname}/`;
  }
  return new URL(path.replace(/^\/+/, ""), normalizedBaseUrl);
}

function toQueryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

function normalizeFileType(type: string): FileEntry["type"] {
  return type === "dir" || type === "directory" ? "directory" : "file";
}

function toEntry(entry: HyperbrowserFileInfoWire): FileEntry {
  return {
    group: entry.group,
    language: inferLanguageFromPath(entry.path),
    mode: entry.mode,
    modifiedAt:
      typeof entry.modifiedTime === "number"
        ? new Date(entry.modifiedTime).toISOString()
        : undefined,
    name: entry.name,
    owner: entry.owner,
    path: normalizeFilePath(entry.path),
    permissions: entry.permissions,
    size: entry.size,
    symlinkTarget: entry.symlinkTarget,
    type: normalizeFileType(entry.type),
  };
}

function parsePreviewKind(kind: string): FilePreview["kind"] {
  switch (kind) {
    case "text":
    case "image":
    case "audio":
    case "video":
    case "pdf":
    case "binary":
      return kind;
    default:
      throw new HyperbrowserRequestError(`Unsupported preview kind: ${kind}`);
  }
}

function toPreview(
  preview: HyperbrowserPreviewWirePayload,
  fallbackPath: string
): FilePreview {
  const normalizedPath = normalizeFilePath(preview.path || fallbackPath);
  const kind = parsePreviewKind(preview.kind);

  if (kind === "text") {
    if (typeof preview.content !== "string") {
      throw new HyperbrowserRequestError(
        `Text preview for ${normalizedPath} did not include content.`
      );
    }

    return {
      contentType: preview.contentType,
      contents: preview.content,
      encoding: preview.encoding,
      kind,
      language: inferLanguageFromPath(normalizedPath),
      path: normalizedPath,
      size: preview.size,
    };
  }

  if (kind === "image" || kind === "audio" || kind === "video" || kind === "pdf") {
    if (typeof preview.url !== "string" || preview.url.length === 0) {
      throw new HyperbrowserRequestError(
        `${kind} preview for ${normalizedPath} did not include a URL.`
      );
    }
    try {
      new URL(preview.url);
    } catch {
      throw new HyperbrowserRequestError(
        `${kind} preview for ${normalizedPath} did not include an absolute URL.`
      );
    }

    return {
      contentType: preview.contentType,
      expiresAt: preview.expiresAt,
      kind,
      name: preview.name,
      path: normalizedPath,
      size: preview.size,
      url: preview.url,
    };
  }

  return {
    contentType: preview.contentType,
    kind: "binary",
    name: preview.name,
    path: normalizedPath,
    reason: preview.reason,
    size: preview.size,
  };
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!response.ok) {
        throw new HyperbrowserRequestError(text, response.status);
      }
      throw new HyperbrowserRequestError(
        `Invalid JSON response from server. ${fallbackMessage}`,
        response.status
      );
    }
  }

  if (!response.ok) {
    const message =
      (typeof payload.error === "string" && payload.error) ||
      `${fallbackMessage} (${response.status})`;
    throw new HyperbrowserRequestError(message, response.status);
  }

  return payload as T;
}

function resolveHeaders(
  input: HyperbrowserFilesystemAdapterOptions["apiHeaders"]
): Promise<Headers> {
  return Promise.resolve(typeof input === "function" ? input() : input).then(
    (value) => new Headers(value)
  );
}

function resolveBrowserAuthEndpoint(
  options: HyperbrowserFilesystemAdapterOptions
): string | undefined {
  if (!options.sandboxId) {
    return undefined;
  }

  return resolveUrl(
    options.apiBaseUrl ?? DEFAULT_HYPERBROWSER_API_BASE_URL,
    options.browserAuthPath ??
      `sandbox/${encodeURIComponent(options.sandboxId)}/runtime/browser-auth`
  ).toString();
}

async function fetchRuntimeBrowserAuth(
  options: HyperbrowserFilesystemAdapterOptions,
  signal: AbortSignal
): Promise<HyperbrowserRuntimeBrowserAuth> {
  const browserAuthEndpoint = resolveBrowserAuthEndpoint(options);

  if (options.getRuntimeBrowserAuth) {
    return options.getRuntimeBrowserAuth({
      browserAuthEndpoint,
      sandboxId: options.sandboxId,
      signal,
    });
  }

  if (options.runtimeBaseUrl && options.bootstrapUrl) {
    return {
      bootstrapUrl: options.bootstrapUrl,
      runtime: {
        baseUrl: options.runtimeBaseUrl,
      },
    };
  }

  if (!browserAuthEndpoint) {
    throw new Error(
      "Hyperbrowser filesystem transport requires either getRuntimeBrowserAuth, runtimeBaseUrl + bootstrapUrl, or apiBaseUrl + sandboxId."
    );
  }

  const fetchImpl = resolveFetchImplementation(options.fetch);
  const headers = await resolveHeaders(options.apiHeaders);
  const response = await fetchImpl(browserAuthEndpoint, {
    credentials: options.apiCredentials ?? "include",
    headers,
    method: "POST",
    signal,
  });

  return readJsonResponse<HyperbrowserRuntimeBrowserAuth>(
    response,
    "Failed to issue runtime browser auth."
  );
}

export function createHyperbrowserFilesystemAdapter(
  options: HyperbrowserFilesystemAdapterOptions
): FileWorkspaceAdapter {
  const fetchImpl = resolveFetchImplementation(options.fetch);
  let runtimeBaseUrlPromise: Promise<string> | null = null;

  async function ensureRuntimeBaseUrl(forceRefresh = false): Promise<string> {
    if (!runtimeBaseUrlPromise || forceRefresh) {
      runtimeBaseUrlPromise = (async () => {
        const controller = new AbortController();
        const runtimeAuth = await fetchRuntimeBrowserAuth(options, controller.signal);
        if (!runtimeAuth.runtime?.baseUrl) {
          throw new Error(
            "Runtime browser auth response did not include a runtime base URL."
          );
        }

        const bootstrapResponse = await fetchImpl(runtimeAuth.bootstrapUrl, {
          credentials: "include",
          method: "GET",
          signal: controller.signal,
        });
        await readJsonResponse<Record<string, never>>(
          bootstrapResponse,
          "Failed to bootstrap runtime browser auth."
        );
        return runtimeAuth.runtime.baseUrl;
      })().catch((error) => {
        runtimeBaseUrlPromise = null;
        throw error;
      });
    }

    return runtimeBaseUrlPromise;
  }

  async function requestJson<T>(
    path: string,
    init: RequestInit,
    query?: Record<string, string | number | undefined>,
    allowRetry = true
  ): Promise<T> {
    const runtimeBaseUrl = await ensureRuntimeBaseUrl();
    const url = resolveUrl(runtimeBaseUrl, path);
    if (query) {
      url.search = toQueryString(query);
    }

    const response = await fetchImpl(url.toString(), {
      credentials: "include",
      ...init,
    });
    if (!response.ok && response.status === 401 && allowRetry) {
      await ensureRuntimeBaseUrl(true);
      return requestJson<T>(path, init, query, false);
    }
    return readJsonResponse<T>(response, `Request failed for ${path}.`);
  }

  const adapter: FileWorkspaceAdapter = {
    async createDirectory(path: string): Promise<void> {
      await requestJson("/sandbox/files/mkdir", {
        body: JSON.stringify({
          path: normalizeFilePath(path),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    },

    async createFile(path: string, contents = ""): Promise<void> {
      await requestJson("/sandbox/files/write", {
        body: JSON.stringify({
          data: contents,
          encoding: "utf8",
          path: normalizeFilePath(path),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    },

    async delete(path: string, runtimeOptions): Promise<void> {
      await requestJson("/sandbox/files/delete", {
        body: JSON.stringify({
          path: normalizeFilePath(path),
          recursive: runtimeOptions?.recursive,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    },

    async listDirectory(path: string): Promise<FileDirectoryListing> {
      const response = await requestJson<HyperbrowserListWireResponse>(
        "/sandbox/files",
        {
          method: "GET",
        },
        {
          depth: 1,
          path: normalizeFilePath(path),
        }
      );
      return {
        entries: response.entries.map(toEntry),
        path: normalizeFilePath(response.path),
      };
    },

    async previewFile(path: string): Promise<FilePreview> {
      const normalizedPath = normalizeFilePath(path);
      const response = await requestJson<HyperbrowserPreviewWireResponse>(
        "/sandbox/files/preview",
        {
          body: JSON.stringify({
            path: normalizedPath,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      );

      return toPreview(response.preview, normalizedPath);
    },

    async rename(path: string, nextPath: string): Promise<void> {
      await requestJson("/sandbox/files/move", {
        body: JSON.stringify({
          from: normalizeFilePath(path),
          to: normalizeFilePath(nextPath),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    },

    async stat(path: string): Promise<FileEntry> {
      const response = await requestJson<HyperbrowserStatWireResponse>(
        "/sandbox/files/stat",
        {
          method: "GET",
        },
        {
          path: normalizeFilePath(path),
        }
      );
      return toEntry(response.file);
    },

    async writeFile(path: string, contents: string): Promise<void> {
      await requestJson("/sandbox/files/write", {
        body: JSON.stringify({
          data: contents,
          encoding: "utf8",
          path: normalizeFilePath(path),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    },
  };

  return adapter;
}
