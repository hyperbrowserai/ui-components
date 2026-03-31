import { inferLanguageFromPath, isTextLikeContentType } from "../filesystem/fileLanguage";
import { normalizeFilePath } from "../filesystem/filePath";
import type {
  FileDirectoryListing,
  FileDocument,
  FileEntry,
  FileWorkspaceAdapter,
} from "../filesystem/types";

type HyperbrowserRuntimeTarget = {
  baseUrl: string;
  host?: string;
  transport?: string;
};

export type HyperbrowserRuntimeBrowserAuth = {
  allowedOrigin?: string;
  bootstrapUrl: string;
  bootstrapUrlExpiresAt?: string | null;
  capabilities?: string[];
  runtime: HyperbrowserRuntimeTarget;
};

export type HyperbrowserFilesystemBrowserAuthResolver = (params: {
  signal: AbortSignal;
}) => Promise<HyperbrowserRuntimeBrowserAuth>;

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

type HyperbrowserReadWireResponse = {
  bytesRead: number;
  content: string;
  contentType?: string;
  encoding?: string;
  truncated?: boolean;
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

async function fetchRuntimeBrowserAuth(
  options: HyperbrowserFilesystemAdapterOptions,
  signal: AbortSignal
): Promise<HyperbrowserRuntimeBrowserAuth> {
  if (options.getRuntimeBrowserAuth) {
    return options.getRuntimeBrowserAuth({ signal });
  }

  if (options.runtimeBaseUrl && options.bootstrapUrl) {
    return {
      bootstrapUrl: options.bootstrapUrl,
      runtime: {
        baseUrl: options.runtimeBaseUrl,
      },
    };
  }

  if (!options.apiBaseUrl || !options.sandboxId) {
    throw new Error(
      "Hyperbrowser filesystem transport requires either getRuntimeBrowserAuth, runtimeBaseUrl + bootstrapUrl, or apiBaseUrl + sandboxId."
    );
  }

  const fetchImpl = resolveFetchImplementation(options.fetch);
  const headers = await resolveHeaders(options.apiHeaders);
  const endpoint = resolveUrl(
    options.apiBaseUrl,
    options.browserAuthPath ??
      `sandbox/${encodeURIComponent(options.sandboxId)}/runtime/browser-auth`
  );
  const response = await fetchImpl(endpoint.toString(), {
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

  async function ensureRuntimeBaseUrl(): Promise<string> {
    if (!runtimeBaseUrlPromise) {
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
        if (!bootstrapResponse.ok) {
          throw new HyperbrowserRequestError(
            "Failed to bootstrap runtime browser auth.",
            bootstrapResponse.status
          );
        }
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
    query?: Record<string, string | number | undefined>
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
    return readJsonResponse<T>(response, `Request failed for ${path}.`);
  }

  return {
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

    async readFile(path: string): Promise<FileDocument> {
      const normalizedPath = normalizeFilePath(path);
      const response = await requestJson<HyperbrowserReadWireResponse>(
        "/sandbox/files/read",
        {
          body: JSON.stringify({
            encoding: "utf8",
            path: normalizedPath,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      );

      const isTextDocument = isTextLikeContentType(response.contentType);
      if (!isTextDocument) {
        return {
          contentType: response.contentType,
          contents: "",
          encoding: response.encoding,
          language: inferLanguageFromPath(normalizedPath),
          path: normalizedPath,
          readOnly: true,
          readOnlyReason: "Binary file preview is not available in v1.",
          truncated: Boolean(response.truncated),
        };
      }

      return {
        contentType: response.contentType,
        contents: response.content,
        encoding: response.encoding,
        language: inferLanguageFromPath(normalizedPath),
        path: normalizedPath,
        readOnly: Boolean(response.truncated),
        readOnlyReason: response.truncated
          ? "This file exceeded the runtime read limit and is read-only in v1."
          : undefined,
        truncated: Boolean(response.truncated),
      };
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
}
