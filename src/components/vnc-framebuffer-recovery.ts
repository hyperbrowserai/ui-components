const STARTUP_FRAMEBUFFER_REFRESH_DELAYS_MS = [250, 1500, 3500] as const;
const FRAMEBUFFER_REFRESH_THROTTLE_MS = 500;
const FRAMEBUFFER_STALL_MS = 10000;
const FRAMEBUFFER_STALL_REFRESH_LIMIT = 2;
const FRAMEBUFFER_STALL_CHECK_MS = Math.min(
  Math.max(Math.floor(FRAMEBUFFER_STALL_MS / 2), 1000),
  5000
);
const RFB_LOOKUP_RETRY_MS = 25;
const RFB_LOOKUP_ATTEMPT_LIMIT = 40;
const RFB_MAX_DIMENSION = 0xffff;

type InternalRawSocket = {
  addEventListener?: (type: "message" | "close", listener: EventListener) => void;
  removeEventListener?: (
    type: "message" | "close",
    listener: EventListener
  ) => void;
  send?: (data: ArrayBufferView) => void;
};

type InternalRfbSocket = {
  readyState?: string;
  _websocket?: InternalRawSocket | null;
};

export type InternalRfbFramebufferController = {
  _fbWidth?: number;
  _fbHeight?: number;
  _rfbConnectionState?: string;
  _sock?: InternalRfbSocket | null;
};

export type FramebufferRefreshRecovery = {
  start: () => void;
  stop: () => void;
};

export type FramebufferRefreshRuntime = {
  now: () => number;
  setTimeout: (callback: () => void, delayMs: number) => number;
  clearTimeout: (timer: number) => void;
  setInterval: (callback: () => void, delayMs: number) => number;
  clearInterval: (timer: number) => void;
};

function createBrowserRuntime(): FramebufferRefreshRuntime {
  return {
    now: () => performance.now(),
    setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimeout: (timer) => window.clearTimeout(timer),
    setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
    clearInterval: (timer) => window.clearInterval(timer),
  };
}

function isRfbDimension(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= RFB_MAX_DIMENSION
  );
}

function buildFullFramebufferUpdateRequest(
  width: number,
  height: number
): Uint8Array {
  const message = new Uint8Array(10);
  message[0] = 3;
  message[1] = 0;
  message[6] = (width >> 8) & 0xff;
  message[7] = width & 0xff;
  message[8] = (height >> 8) & 0xff;
  message[9] = height & 0xff;
  return message;
}

export function requestFullFramebufferRefresh(
  rfb: InternalRfbFramebufferController | null
): boolean {
  if (!rfb || rfb._rfbConnectionState !== "connected") {
    return false;
  }

  const { _fbWidth: width, _fbHeight: height, _sock: sock } = rfb;
  const rawSocket = sock?._websocket;
  if (
    !isRfbDimension(width) ||
    !isRfbDimension(height) ||
    sock?.readyState !== "open" ||
    !rawSocket?.send
  ) {
    return false;
  }

  try {
    rawSocket.send(buildFullFramebufferUpdateRequest(width, height));
    return true;
  } catch {
    // Recovery must never break the underlying noVNC connection.
    return false;
  }
}

export function createFramebufferRefreshRecovery(
  getRfb: () => InternalRfbFramebufferController | null,
  runtime: FramebufferRefreshRuntime = createBrowserRuntime()
): FramebufferRefreshRecovery {
  let activeRfb: InternalRfbFramebufferController | null = null;
  let setupTimer: number | null = null;
  let startupTimers: number[] = [];
  let stallInterval: number | null = null;
  let detachSocketListeners: (() => void) | null = null;
  let lastRefreshAt = Number.NEGATIVE_INFINITY;
  let lastInboundAt = 0;
  let lastStallBucket = 0;
  let stallRefreshCount = 0;

  const stop = () => {
    if (setupTimer !== null) {
      runtime.clearTimeout(setupTimer);
      setupTimer = null;
    }

    for (const timer of startupTimers.splice(0)) {
      runtime.clearTimeout(timer);
    }

    if (stallInterval !== null) {
      runtime.clearInterval(stallInterval);
      stallInterval = null;
    }

    detachSocketListeners?.();
    detachSocketListeners = null;
    activeRfb = null;
  };

  const requestBoundedRefresh = () => {
    const now = runtime.now();
    if (now - lastRefreshAt < FRAMEBUFFER_REFRESH_THROTTLE_MS) {
      return false;
    }

    if (!requestFullFramebufferRefresh(activeRfb)) {
      return false;
    }

    lastRefreshAt = now;
    return true;
  };

  const attachSocketTracking = (rfb: InternalRfbFramebufferController) => {
    const rawSocket = rfb._sock?._websocket;
    if (!rawSocket?.addEventListener || !rawSocket.removeEventListener) {
      return false;
    }

    const recordInboundMessage: EventListener = () => {
      lastInboundAt = runtime.now();
      lastStallBucket = 0;
    };
    const handleSocketClose: EventListener = () => stop();

    try {
      rawSocket.addEventListener("message", recordInboundMessage);
      rawSocket.addEventListener("close", handleSocketClose);
    } catch {
      rawSocket.removeEventListener("message", recordInboundMessage);
      rawSocket.removeEventListener("close", handleSocketClose);
      return false;
    }

    detachSocketListeners = () => {
      rawSocket.removeEventListener?.("message", recordInboundMessage);
      rawSocket.removeEventListener?.("close", handleSocketClose);
    };
    return true;
  };

  const initialize = (rfb: InternalRfbFramebufferController) => {
    activeRfb = rfb;
    lastRefreshAt = Number.NEGATIVE_INFINITY;
    lastInboundAt = runtime.now();
    lastStallBucket = 0;
    stallRefreshCount = 0;

    const canTrackInboundMessages = attachSocketTracking(rfb);
    startupTimers = STARTUP_FRAMEBUFFER_REFRESH_DELAYS_MS.map((delayMs) =>
      runtime.setTimeout(requestBoundedRefresh, delayMs)
    );

    if (!canTrackInboundMessages) {
      return;
    }

    stallInterval = runtime.setInterval(() => {
      const idleMs = runtime.now() - lastInboundAt;
      if (idleMs < FRAMEBUFFER_STALL_MS) {
        lastStallBucket = 0;
        return;
      }

      const bucket = idleMs >= 30000 ? 30 : idleMs >= 15000 ? 15 : 10;
      if (bucket === lastStallBucket) {
        return;
      }
      lastStallBucket = bucket;

      if (
        stallRefreshCount < FRAMEBUFFER_STALL_REFRESH_LIMIT &&
        requestBoundedRefresh()
      ) {
        stallRefreshCount += 1;
      }
    }, FRAMEBUFFER_STALL_CHECK_MS);
  };

  const start = () => {
    stop();
    let lookupAttempts = 0;

    const initializeWhenRefIsReady = () => {
      setupTimer = null;
      const rfb = getRfb();
      if (rfb?._rfbConnectionState === "connected") {
        initialize(rfb);
        return;
      }

      lookupAttempts += 1;
      if (lookupAttempts < RFB_LOOKUP_ATTEMPT_LIMIT) {
        setupTimer = runtime.setTimeout(
          initializeWhenRefIsReady,
          RFB_LOOKUP_RETRY_MS
        );
      }
    };

    // react-vnc updates its imperative ref just after invoking onConnect.
    setupTimer = runtime.setTimeout(initializeWhenRefIsReady, 0);
  };

  return { start, stop };
}
