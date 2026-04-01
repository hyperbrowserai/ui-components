import type {
  TerminalConnectParams,
  TerminalConnection,
  TerminalExitEvent,
  TerminalSession,
  TerminalSize,
  TerminalUnsubscribe,
} from "../terminal/types";

const DEFAULT_CREATE_RETRY_COUNT = 4;
const DEFAULT_CREATE_RETRY_DELAY_MS = 700;
const DEFAULT_RECONNECT_RETRY_DELAY_MS = 1000;
const DEFAULT_INPUT_BATCH_DELAY_MS = 16;
const DEFAULT_INPUT_BATCH_MAX_BYTES = 8192;
const DEFAULT_TERMINATE_CLEANUP_TIMEOUT_MS = 3000;
const DEFAULT_HYPERBROWSER_API_BASE_URL = "https://api.hyperbrowser.ai/api";

export type HyperbrowserRuntimeBrowserAuth = {
  allowedOrigin?: string;
  bootstrapUrl: string;
  bootstrapUrlExpiresAt?: string | null;
  capabilities?: string[];
};

export type HyperbrowserPtyBrowserAuthParams = {
  browserAuthEndpoint?: string;
  sandboxId?: string;
  signal: AbortSignal;
};

export type HyperbrowserPtyStatus = {
  cols: number;
  command: string;
  cwd: string;
  error?: string;
  exitCode?: number | null;
  finishedAt?: number | null;
  id: string;
  pid?: number | null;
  rows: number;
  running: boolean;
  startedAt: number;
  timedOut?: boolean;
};

export type HyperbrowserPtyBrowserAuthResolver = (
  params: HyperbrowserPtyBrowserAuthParams
) => Promise<HyperbrowserRuntimeBrowserAuth>;

export type HyperbrowserPtyConnectionOptions = {
  apiBaseUrl?: string;
  apiCredentials?: RequestCredentials;
  apiHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  args?: string[];
  bootstrapUrl?: string;
  closeBehavior?: "disconnect" | "terminate";
  command?: string;
  createRetryCount?: number;
  createRetryDelayMs?: number;
  cwd?: string;
  env?: Record<string, string>;
  existingPtyId?: string;
  fetch?: typeof fetch;
  getRuntimeBrowserAuth?: HyperbrowserPtyBrowserAuthResolver;
  inputBatchDelayMs?: number;
  inputBatchMaxBytes?: number;
  killSignal?: string;
  maxReconnectAttempts?: number;
  reconnectRetryDelayMs?: number;
  sandboxId?: string;
  timeoutMs?: number;
  useShell?: boolean;
  webSocketFactory?: (url: string) => WebSocket;
};

type HyperbrowserBrowserAuthResponse = HyperbrowserRuntimeBrowserAuth;

type HyperbrowserPtyApiEnvelope = {
  pty: HyperbrowserPtyStatus;
  success?: boolean;
};

type HyperbrowserPtyOutputEvent = {
  data: string;
  seq: number;
  timestamp?: number;
  type: "output";
};

type HyperbrowserPtyExitEvent = {
  status: HyperbrowserPtyStatus;
  type: "exit";
};

type HyperbrowserPtyServerEvent =
  | HyperbrowserPtyOutputEvent
  | HyperbrowserPtyExitEvent;

type HyperbrowserResolvedRuntimeAccess = {
  bootstrapUrl: string;
  runtimeBaseUrl: string;
};

type HyperbrowserPtyCloseBehavior = NonNullable<
  HyperbrowserPtyConnectionOptions["closeBehavior"]
>;

type RuntimeRequestOptions = {
  allowRetry?: boolean;
  keepalive?: boolean;
  signal?: AbortSignal;
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
    throw new Error("Hyperbrowser PTY transport requires a global fetch implementation.");
  }
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    Reflect.apply(resolved, globalThis, [input, init])) as typeof fetch;
}

function resolveWebSocketFactory(
  webSocketFactory: HyperbrowserPtyConnectionOptions["webSocketFactory"]
): (url: string) => WebSocket {
  if (webSocketFactory) {
    return webSocketFactory;
  }
  if (typeof WebSocket !== "function") {
    throw new Error("Hyperbrowser PTY transport requires a global WebSocket implementation.");
  }
  return (url) => new WebSocket(url);
}

function resolveHeaders(
  input: HyperbrowserPtyConnectionOptions["apiHeaders"]
): Promise<Headers> {
  return Promise.resolve(typeof input === "function" ? input() : input).then(
    (value) => new Headers(value)
  );
}

function resolveUrl(baseUrl: string, path: string): URL {
  const normalizedBaseUrl = new URL(baseUrl);
  if (!normalizedBaseUrl.pathname.endsWith("/")) {
    normalizedBaseUrl.pathname = `${normalizedBaseUrl.pathname}/`;
  }
  return new URL(path.replace(/^\/+/, ""), normalizedBaseUrl);
}

function resolveAbsoluteUrl(input: string): URL {
  try {
    return new URL(input);
  } catch {
    if (typeof window !== "undefined" && window.location) {
      return new URL(input, window.location.href);
    }

    throw new Error("Hyperbrowser PTY bootstrap URL must be absolute outside the browser.");
  }
}

function deriveRuntimeBaseUrl(bootstrapUrl: string): string {
  return resolveAbsoluteUrl(bootstrapUrl).origin;
}

function resolveBrowserAuthEndpoint(
  options: HyperbrowserPtyConnectionOptions
): string | undefined {
  if (!options.sandboxId) {
    return undefined;
  }

  if (options.getRuntimeBrowserAuth) {
    return resolveUrl(
      options.apiBaseUrl ?? DEFAULT_HYPERBROWSER_API_BASE_URL,
      `sandbox/${encodeURIComponent(options.sandboxId)}/runtime/browser-auth`
    ).toString();
  }

  if (!options.apiBaseUrl) {
    return undefined;
  }

  return resolveUrl(
    options.apiBaseUrl,
    `sandbox/${encodeURIComponent(options.sandboxId)}/runtime/browser-auth`
  ).toString();
}

function toWebSocketUrl(baseUrl: string, path: string, query?: URLSearchParams): string {
  const url = resolveUrl(baseUrl, path);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.search = query?.toString() ?? "";
  return url.toString();
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Request aborted", "AbortError"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function shouldRetryInitialCreate(error: unknown): boolean {
  if (!(error instanceof HyperbrowserRequestError)) {
    return false;
  }

  switch (error.status) {
    case 404:
    case 502:
    case 503:
    case 504:
      return true;
    default:
      return false;
  }
}

function toTerminalExitEvent(status: HyperbrowserPtyStatus): TerminalExitEvent {
  return {
    error: status.error || undefined,
    exitCode:
      typeof status.exitCode === "number" ? status.exitCode : undefined,
  };
}

function encodeInputData(data: string | Uint8Array): Uint8Array {
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  return data;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
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
      (typeof payload?.message === "string" && payload.message) ||
      (typeof payload?.error === "string" && payload.error) ||
      `${fallbackMessage} (${response.status})`;
    throw new HyperbrowserRequestError(message, response.status);
  }
  return payload as T;
}

async function fetchRuntimeBrowserAuth(
  options: HyperbrowserPtyConnectionOptions,
  signal: AbortSignal,
  keepalive = false
): Promise<HyperbrowserBrowserAuthResponse> {
  const browserAuthEndpoint = resolveBrowserAuthEndpoint(options);

  if (options.getRuntimeBrowserAuth) {
    return options.getRuntimeBrowserAuth({
      browserAuthEndpoint,
      sandboxId: options.sandboxId,
      signal,
    });
  }

  if (options.bootstrapUrl) {
    return {
      bootstrapUrl: options.bootstrapUrl,
    };
  }

  if (!browserAuthEndpoint) {
    throw new Error(
      "Hyperbrowser PTY transport requires either getRuntimeBrowserAuth, bootstrapUrl, or apiBaseUrl + sandboxId."
    );
  }

  const fetchImpl = resolveFetchImplementation(options.fetch);
  const headers = await resolveHeaders(options.apiHeaders);
  const response = await fetchImpl(browserAuthEndpoint, {
    credentials: options.apiCredentials ?? "include",
    headers,
    keepalive,
    method: "POST",
    signal,
  });

  return readJsonResponse<HyperbrowserBrowserAuthResponse>(
    response,
    "Failed to issue runtime browser auth."
  );
}

class HyperbrowserPtySession implements TerminalSession {
  private readonly abortSignal: AbortSignal;
  private readonly closeBehavior: HyperbrowserPtyCloseBehavior;
  private readonly createRetryCount: number;
  private readonly createRetryDelayMs: number;
  private closePromise: Promise<void> | null = null;
  private createdPtyDuringStart = false;
  private readonly fetchImpl: typeof fetch;
  private readonly inputBatchDelayMs: number;
  private readonly inputBatchMaxBytes: number;
  private readonly options: HyperbrowserPtyConnectionOptions;
  private readonly outputListeners = new Set<(data: Uint8Array) => void>();
  private readonly exitListeners = new Set<(event: TerminalExitEvent) => void>();
  private readonly reconnectRetryDelayMs: number;
  private readonly webSocketFactory: (url: string) => WebSocket;
  private explicitClose = false;
  private flushTimerId: number | null = null;
  private hasEmittedExit = false;
  private lastSeq = 0;
  private pendingInput: Uint8Array[] = [];
  private pendingInputBytes = 0;
  private ptyId: string | null;
  private reconnectAttempts = 0;
  private reconnectTimerId: number | null = null;
  private runtimeAccess: HyperbrowserResolvedRuntimeAccess | null = null;
  private size: TerminalSize;
  private socket: WebSocket | null = null;
  private terminated = false;

  constructor(
    options: HyperbrowserPtyConnectionOptions,
    connectParams: TerminalConnectParams
  ) {
    this.abortSignal = connectParams.signal;
    this.closeBehavior = options.closeBehavior ?? "disconnect";
    this.createRetryCount = options.createRetryCount ?? DEFAULT_CREATE_RETRY_COUNT;
    this.createRetryDelayMs =
      options.createRetryDelayMs ?? DEFAULT_CREATE_RETRY_DELAY_MS;
    this.fetchImpl = resolveFetchImplementation(options.fetch);
    this.inputBatchDelayMs =
      options.inputBatchDelayMs ?? DEFAULT_INPUT_BATCH_DELAY_MS;
    this.inputBatchMaxBytes =
      options.inputBatchMaxBytes ?? DEFAULT_INPUT_BATCH_MAX_BYTES;
    this.options = options;
    this.ptyId = options.existingPtyId ?? null;
    this.reconnectRetryDelayMs =
      options.reconnectRetryDelayMs ?? DEFAULT_RECONNECT_RETRY_DELAY_MS;
    this.size = { cols: connectParams.cols, rows: connectParams.rows };
    this.webSocketFactory = resolveWebSocketFactory(options.webSocketFactory);
  }

  async start(): Promise<this> {
    try {
      if (!this.ptyId) {
        await this.createPtyWithRetry();
      } else {
        await this.bootstrapRuntimeAuth();
      }

      await this.openSocket(this.lastSeq);
      return this;
    } catch (error) {
      this.beginShutdown();

      if (this.shouldTerminateCreatedPtyOnStartFailure()) {
        try {
          await this.runTerminateCleanup();
        } catch {
          // Ignore cleanup failures when start aborts after PTY creation.
        }
      }

      throw error;
    }
  }

  writeInput(data: string | Uint8Array): void {
    if (this.terminated || this.hasEmittedExit) {
      return;
    }

    const encoded = encodeInputData(data);
    if (!encoded.length) {
      return;
    }

    this.pendingInput.push(encoded);
    this.pendingInputBytes += encoded.length;

    if (this.pendingInputBytes >= this.inputBatchMaxBytes) {
      this.flushInputQueue();
      return;
    }

    if (this.flushTimerId !== null) {
      return;
    }

    this.flushTimerId = window.setTimeout(() => {
      this.flushTimerId = null;
      void this.flushInputQueue();
    }, this.inputBatchDelayMs);
  }

  async resize(size: TerminalSize): Promise<void> {
    this.size = size;
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        cols: size.cols,
        rows: size.rows,
        type: "resize",
      })
    );
  }

  async close(): Promise<void> {
    if (!this.closePromise) {
      this.closePromise = this.closeInternal();
    }

    await this.closePromise;
  }

  onOutput(listener: (data: Uint8Array) => void): TerminalUnsubscribe {
    this.outputListeners.add(listener);
    return () => {
      this.outputListeners.delete(listener);
    };
  }

  onExit(listener: (event: TerminalExitEvent) => void): TerminalUnsubscribe {
    this.exitListeners.add(listener);
    return () => {
      this.exitListeners.delete(listener);
    };
  }

  private clearTimers(): void {
    if (this.flushTimerId !== null) {
      window.clearTimeout(this.flushTimerId);
      this.flushTimerId = null;
    }
    if (this.reconnectTimerId !== null) {
      window.clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
  }

  private emitOutput(data: Uint8Array): void {
    this.outputListeners.forEach((listener) => {
      listener(data);
    });
  }

  private emitExit(event: TerminalExitEvent): void {
    if (this.hasEmittedExit) {
      return;
    }

    this.hasEmittedExit = true;
    this.clearTimers();
    this.exitListeners.forEach((listener) => {
      listener(event);
    });
  }

  private beginShutdown(): void {
    this.explicitClose = true;
    this.terminated = true;
    this.clearTimers();

    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.close();
    }
  }

  private async createPtyWithRetry(): Promise<void> {
    let attempt = 0;

    while (true) {
      try {
        await this.bootstrapRuntimeAuth();
        const response = await this.runtimeFetch<HyperbrowserPtyApiEnvelope>(
          resolveUrl(this.getRuntimeBaseUrl(), "sandbox/pty"),
          {
            body: JSON.stringify({
              args: this.options.args,
              cols: this.size.cols,
              command: this.options.command ?? "bash",
              cwd: this.options.cwd,
              env: this.options.env,
              rows: this.size.rows,
              timeoutMs: this.options.timeoutMs,
              useShell: this.options.useShell,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          }
        );
        this.ptyId = response.pty.id;
        this.createdPtyDuringStart = true;
        return;
      } catch (error) {
        attempt += 1;
        if (
          attempt > this.createRetryCount ||
          !shouldRetryInitialCreate(error)
        ) {
          throw error;
        }
      }

      await sleep(this.createRetryDelayMs, this.abortSignal);
    }
  }

  private async killPty(requestOptions: RuntimeRequestOptions = {}): Promise<void> {
    if (!this.ptyId) {
      return;
    }

    await this.runtimeFetch(
      resolveUrl(
        this.getRuntimeBaseUrl(),
        `sandbox/pty/${encodeURIComponent(this.ptyId)}/kill`
      ),
      {
        body: JSON.stringify({
          signal: this.options.killSignal,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      requestOptions
    );
  }

  private async flushInputQueue(): Promise<void> {
    if (this.flushTimerId !== null) {
      window.clearTimeout(this.flushTimerId);
      this.flushTimerId = null;
    }
    if (!this.pendingInput.length) {
      return;
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const combined = new Uint8Array(this.pendingInputBytes);
    let offset = 0;
    for (const chunk of this.pendingInput) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    this.pendingInput = [];
    this.pendingInputBytes = 0;

    this.socket.send(
      JSON.stringify({
        data: encodeBase64(combined),
        encoding: "base64",
        type: "input",
      })
    );
  }

  private getRuntimeBaseUrl(): string {
    if (!this.runtimeAccess?.runtimeBaseUrl) {
      throw new Error("Runtime base URL is unavailable.");
    }
    return this.runtimeAccess.runtimeBaseUrl;
  }

  private handleSocketMessage(event: MessageEvent<string>): void {
    let payload: HyperbrowserPtyServerEvent;
    try {
      payload = JSON.parse(event.data) as HyperbrowserPtyServerEvent;
    } catch (error) {
      this.failSession(
        error instanceof Error ? error : new Error("Invalid PTY websocket payload.")
      );
      return;
    }

    if (payload.type === "output") {
      if (payload.seq > this.lastSeq) {
        this.lastSeq = payload.seq;
      }
      this.emitOutput(decodeBase64(payload.data));
      return;
    }

    this.emitExit(toTerminalExitEvent(payload.status));
  }

  private handleSocketClosed(): void {
    this.socket = null;
    if (this.explicitClose || this.hasEmittedExit || this.terminated) {
      return;
    }

    this.scheduleReconnect();
  }

  private async closeInternal(): Promise<void> {
    this.beginShutdown();

    if (!this.shouldTerminateOnClose()) {
      return;
    }

    try {
      await this.runTerminateCleanup();
    } catch {
      // Ignore cleanup failures when closing a session.
    }
  }

  private async fetchPtyStatus(): Promise<HyperbrowserPtyStatus> {
    if (!this.ptyId) {
      throw new Error("PTY status requested before PTY exists.");
    }

    const response = await this.runtimeFetch<HyperbrowserPtyApiEnvelope>(
      resolveUrl(
        this.getRuntimeBaseUrl(),
        `sandbox/pty/${encodeURIComponent(this.ptyId)}`
      ),
      {
        method: "GET",
      }
    );

    return response.pty;
  }

  private failSession(error: unknown): void {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "PTY session failed.";
    this.emitExit({ error: message });
  }

  private async openSocket(cursor: number): Promise<void> {
    if (!this.ptyId) {
      throw new Error("Cannot open PTY websocket before the PTY exists.");
    }

    const query = new URLSearchParams();
    if (cursor > 0) {
      query.set("cursor", String(cursor));
    }

    const url = toWebSocketUrl(
      this.getRuntimeBaseUrl(),
      `sandbox/pty/${encodeURIComponent(this.ptyId)}/ws`,
      query
    );

    await this.bootstrapRuntimeAuth();

    await new Promise<void>((resolve, reject) => {
      const socket = this.webSocketFactory(url);
      let settled = false;

      const rejectOnce = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        socket.close();
        reject(error);
      };

      const onAbort = () => {
        rejectOnce(new DOMException("Request aborted", "AbortError"));
      };

      const cleanup = () => {
        this.abortSignal.removeEventListener("abort", onAbort);
      };

      socket.addEventListener("error", () => {
        if (!settled) {
          rejectOnce(new Error("PTY websocket connection failed."));
        }
      });

      socket.addEventListener("open", () => {
        if (settled) {
          return;
        }

        settled = true;
        this.socket = socket;
        this.reconnectAttempts = 0;

        socket.addEventListener("message", (event) => {
          this.handleSocketMessage(event as MessageEvent<string>);
        });
        socket.addEventListener("close", () => {
          this.handleSocketClosed();
        });
        socket.addEventListener("error", () => {
          if (socket.readyState !== WebSocket.OPEN) {
            this.handleSocketClosed();
          }
        });

        cleanup();
        void this.resize(this.size);
        void this.flushInputQueue();
        resolve();
      });

      socket.addEventListener("close", () => {
        if (!settled) {
          rejectOnce(new Error("PTY websocket connection closed before it opened."));
          return;
        }
        this.handleSocketClosed();
      });

      if (this.abortSignal.aborted) {
        onAbort();
        return;
      }

      this.abortSignal.addEventListener("abort", onAbort, { once: true });
    });
  }

  private async bootstrapRuntimeAuth(
    signal: AbortSignal = this.abortSignal,
    keepalive = false
  ): Promise<void> {
    const runtimeAuth = await fetchRuntimeBrowserAuth(this.options, signal, keepalive);
    const runtimeBaseUrl = deriveRuntimeBaseUrl(runtimeAuth.bootstrapUrl);

    this.runtimeAccess = {
      bootstrapUrl: runtimeAuth.bootstrapUrl,
      runtimeBaseUrl,
    };

    const response = await this.fetchImpl(runtimeAuth.bootstrapUrl, {
      credentials: "include",
      keepalive,
      method: "GET",
      signal,
    });
    await readJsonResponse<Record<string, never>>(response, "Runtime auth bootstrap failed.");
  }

  private async runtimeFetch<T = Record<string, never>>(
    url: URL,
    init: RequestInit,
    requestOptions: RuntimeRequestOptions = {}
  ): Promise<T> {
    const {
      allowRetry = true,
      keepalive = false,
      signal = this.abortSignal,
    } = requestOptions;
    const response = await this.fetchImpl(url.toString(), {
      ...init,
      credentials: "include",
      keepalive,
      signal,
    });

    if (!response.ok && response.status === 401 && allowRetry) {
      await this.bootstrapRuntimeAuth(signal, keepalive);
      return this.runtimeFetch<T>(url, init, {
        allowRetry: false,
        keepalive,
        signal,
      });
    }

    return readJsonResponse<T>(response, "Runtime request failed.");
  }

  private async runTerminateCleanup(): Promise<void> {
    await this.withTerminateCleanupSignal(async (signal) => {
      if (!this.ptyId) {
        return;
      }

      if (!this.runtimeAccess) {
        await this.bootstrapRuntimeAuth(signal, true);
      }

      await this.killPty({
        keepalive: true,
        signal,
      });
    });
  }

  private shouldTerminateCreatedPtyOnStartFailure(): boolean {
    return (
      this.closeBehavior === "terminate" &&
      this.createdPtyDuringStart &&
      !!this.ptyId &&
      !this.hasEmittedExit
    );
  }

  private shouldTerminateOnClose(): boolean {
    return this.closeBehavior === "terminate" && !!this.ptyId && !this.hasEmittedExit;
  }

  private async withTerminateCleanupSignal(
    callback: (signal: AbortSignal) => Promise<void>
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, DEFAULT_TERMINATE_CLEANUP_TIMEOUT_MS);

    try {
      await callback(controller.signal);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimerId !== null || this.terminated || this.hasEmittedExit) {
      return;
    }

    if (
      typeof this.options.maxReconnectAttempts === "number" &&
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      this.failSession(new Error("PTY connection lost."));
      return;
    }

    this.reconnectTimerId = window.setTimeout(() => {
      this.reconnectTimerId = null;
      void this.reconnect();
    }, this.reconnectRetryDelayMs);
  }

  private async reconnect(): Promise<void> {
    if (this.terminated || this.hasEmittedExit || !this.ptyId) {
      return;
    }

    this.reconnectAttempts += 1;

    try {
      await this.bootstrapRuntimeAuth();
      const status = await this.fetchPtyStatus();
      if (!status.running) {
        this.emitExit(toTerminalExitEvent(status));
        return;
      }
      await this.openSocket(this.lastSeq);
    } catch (error) {
      if (
        typeof this.options.maxReconnectAttempts === "number" &&
        this.reconnectAttempts >= this.options.maxReconnectAttempts
      ) {
        this.failSession(error);
        return;
      }

      this.scheduleReconnect();
    }
  }
}

function normalizeConnectionOptions(
  options: HyperbrowserPtyConnectionOptions
): HyperbrowserPtyConnectionOptions {
  return {
    ...options,
    args: options.args ? [...options.args] : undefined,
    env: options.env ? { ...options.env } : undefined,
  };
}

export function createHyperbrowserPtyConnection(
  options: HyperbrowserPtyConnectionOptions
): TerminalConnection {
  const normalizedOptions = normalizeConnectionOptions(options);

  return {
    async connect(connectParams: TerminalConnectParams): Promise<TerminalSession> {
      const session = new HyperbrowserPtySession(normalizedOptions, connectParams);
      await session.start();
      return session;
    },
  };
}
