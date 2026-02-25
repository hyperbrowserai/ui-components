import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

const DEFAULT_API_BASE_URL = "https://api.hyperbrowser.ai";
const VIDEO_ASSET_NAME_MAX_LENGTH = 128;
const VIDEO_ASSET_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const REWRITTEN_SEGMENT_PATH_PATTERN =
  /^\/api\/session\/[^/]+\/video-segment\/[^/?#]+$/i;

export type HyperbrowserVideoSourceType = "auto" | "hls" | "mp4";

export type UseHyperbrowserHlsPlaybackParams = {
  videoRef: RefObject<HTMLVideoElement | null>;
  source?: string | null;
  enabled?: boolean;
  sourceType?: HyperbrowserVideoSourceType;
  sessionId?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  onLoadedData?: () => void;
  onVideoError?: (error?: unknown) => void;
  onFatalHlsError?: (data: unknown) => void;
  onUnsupportedHls?: () => void;
};

export type UseHyperbrowserHlsPlaybackResult = {
  reloadSource: () => void;
  isHlsSource: boolean;
  usingNativeHls: boolean;
  sourceError: string | null;
};

type HlsInstance = {
  destroy: () => void;
  loadSource: (source: string) => void;
  attachMedia: (media: HTMLMediaElement) => void;
  on: (eventName: string, handler: (event: unknown, data: any) => void) => void;
};

type HlsConstructor = {
  new (config: unknown): HlsInstance;
  isSupported: () => boolean;
  DefaultConfig: {
    loader: new (...args: any[]) => {
      load(context: any, config: any, callbacks: any): void;
    };
  };
  Events: {
    ERROR: string;
  };
};

function getRequestPathname(requestUrl: string): string {
  const trimmed = requestUrl.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed, window.location.origin).pathname;
  } catch {
    return trimmed.split("?")[0]?.split("#")[0] ?? "";
  }
}

function extractVideoAssetNameFromRequestUrl(requestUrl: string): string | null {
  const pathname = getRequestPathname(requestUrl);
  if (
    !pathname ||
    REWRITTEN_SEGMENT_PATH_PATTERN.test(pathname) ||
    pathname.toLowerCase().endsWith(".m3u8")
  ) {
    return null;
  }

  const candidate = pathname.split("/").pop()?.trim();
  if (
    !candidate ||
    candidate.length > VIDEO_ASSET_NAME_MAX_LENGTH ||
    !VIDEO_ASSET_NAME_PATTERN.test(candidate)
  ) {
    return null;
  }

  const lowerCandidate = candidate.toLowerCase();
  if (
    !lowerCandidate.endsWith(".m4s") &&
    !lowerCandidate.endsWith(".mp4")
  ) {
    return null;
  }

  return candidate;
}

function resolveApiBaseUrl(value: string | undefined): string {
  const rawBase = (value ?? DEFAULT_API_BASE_URL).trim();
  if (!rawBase) {
    throw new Error("Expected apiBaseUrl to be a non-empty string.");
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(rawBase)
    ? rawBase
    : `https://${rawBase}`;
  const parsed = new URL(withProtocol);
  const normalizedPath =
    parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.host}${normalizedPath}`;
}

function buildRewrittenVideoAssetUrl(
  requestUrl: string,
  sessionId: string,
  apiBaseUrl: string
): string | null {
  const assetName = extractVideoAssetNameFromRequestUrl(requestUrl);
  if (!assetName) {
    return null;
  }

  return `${apiBaseUrl}/api/session/${encodeURIComponent(
    sessionId
  )}/video-segment/${encodeURIComponent(assetName)}`;
}

function buildRewrittenPlaylistUrl(sessionId: string, apiBaseUrl: string): string {
  return `${apiBaseUrl}/api/session/${encodeURIComponent(
    sessionId
  )}/video-playlist.m3u8`;
}

function resolveSourceType(
  source: string | null,
  sourceType: HyperbrowserVideoSourceType,
  sessionId: string | undefined
): "hls" | "mp4" {
  if (sourceType === "hls" || sourceType === "mp4") {
    return sourceType;
  }

  if (!source) {
    return sessionId?.trim() ? "hls" : "mp4";
  }

  const lowerSource = source.toLowerCase();
  return lowerSource.includes(".m3u8") ? "hls" : "mp4";
}

export function useHyperbrowserHlsPlayback({
  videoRef,
  source,
  enabled = true,
  sourceType = "auto",
  sessionId,
  apiKey,
  apiBaseUrl,
  onLoadedData,
  onVideoError,
  onFatalHlsError,
  onUnsupportedHls,
}: UseHyperbrowserHlsPlaybackParams): UseHyperbrowserHlsPlaybackResult {
  const hlsRef = useRef<HlsInstance | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const onLoadedDataRef = useRef<UseHyperbrowserHlsPlaybackParams["onLoadedData"]>(
    onLoadedData
  );
  const onVideoErrorRef = useRef<UseHyperbrowserHlsPlaybackParams["onVideoError"]>(
    onVideoError
  );
  const onFatalHlsErrorRef =
    useRef<UseHyperbrowserHlsPlaybackParams["onFatalHlsError"]>(onFatalHlsError);
  const onUnsupportedHlsRef = useRef<
    UseHyperbrowserHlsPlaybackParams["onUnsupportedHls"]
  >(onUnsupportedHls);
  const trimmedSource = source?.trim() ?? null;

  const resolvedMode = useMemo(
    () => resolveSourceType(trimmedSource, sourceType, sessionId),
    [trimmedSource, sessionId, sourceType]
  );
  const isHlsSource = resolvedMode === "hls";

  useEffect(() => {
    onLoadedDataRef.current = onLoadedData;
    onVideoErrorRef.current = onVideoError;
    onFatalHlsErrorRef.current = onFatalHlsError;
    onUnsupportedHlsRef.current = onUnsupportedHls;
  }, [onFatalHlsError, onLoadedData, onUnsupportedHls, onVideoError]);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const reloadSource = useCallback(() => {
    destroyHls();
    setReloadNonce((value) => value + 1);
    if (videoRef.current && !isHlsSource) {
      videoRef.current.load();
    }
  }, [destroyHls, isHlsSource, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) {
      destroyHls();
      if (!enabled) {
        setSourceError(null);
      }
      return;
    }

    let isCancelled = false;
    const trimmedSessionId = sessionId?.trim() ?? "";
    const trimmedApiKey = apiKey?.trim() ?? "";
    const handleLoaded = () => {
      onLoadedDataRef.current?.();
    };
    const handleError = () => {
      onVideoErrorRef.current?.();
    };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("error", handleError);

    const failEarly = (message: string, callbackError?: unknown) => {
      setSourceError(message);
      destroyHls();
      onVideoErrorRef.current?.(callbackError ?? new Error(message));
    };

    const startPlayback = async () => {
      setSourceError(null);
      if (!isHlsSource) {
        if (!trimmedSource) {
          failEarly("MP4 playback requires a source URL.");
          return;
        }
        video.src = trimmedSource;
        return;
      }

      if (!trimmedSessionId) {
        failEarly("HLS playback requires a sessionId.");
        return;
      }
      if (!trimmedApiKey) {
        failEarly("HLS playback requires an apiKey.");
        return;
      }

      let resolvedApiBaseUrl: string;
      try {
        resolvedApiBaseUrl = resolveApiBaseUrl(apiBaseUrl);
      } catch (error) {
        failEarly("Unable to resolve apiBaseUrl for HLS segment rewriting.", error);
        return;
      }

      const resolvedPlaybackSource = buildRewrittenPlaylistUrl(
        trimmedSessionId,
        resolvedApiBaseUrl
      );

      // @ts-ignore hls.js is resolved from package runtime dependencies.
      const hlsModule = await import("hls.js");
      if (isCancelled) {
        return;
      }

      const HlsCtor = hlsModule.default as HlsConstructor | undefined;
      if (!HlsCtor || !HlsCtor.isSupported()) {
        const unsupportedMessage =
          "This browser does not support hls.js playback for API-key authenticated streams.";
        setSourceError(unsupportedMessage);
        onUnsupportedHlsRef.current?.();
        onVideoErrorRef.current?.(new Error(unsupportedMessage));
        return;
      }

      const HlsLoader = HlsCtor.DefaultConfig.loader;
      class SegmentRewriteLoader extends HlsLoader {
        load(context: { url?: string }, config: unknown, callbacks: unknown) {
          if (context && typeof context.url === "string") {
            const rewrittenUrl = buildRewrittenVideoAssetUrl(
              context.url,
              trimmedSessionId,
              resolvedApiBaseUrl
            );
            if (rewrittenUrl) {
              context.url = rewrittenUrl;
            }
          }
          super.load(context, config, callbacks);
        }
      }

      const apiKeyHeaderName = "x-api-key";
      const hls = new HlsCtor({
        enableWorker: true,
        lowLatencyMode: false,
        loader: SegmentRewriteLoader as typeof HlsLoader,
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.withCredentials = false;
          xhr.setRequestHeader(apiKeyHeaderName, trimmedApiKey);
        },
        fetchSetup: async (_context: unknown, initParams: RequestInit = {}) => ({
          ...initParams,
          credentials: "omit",
          headers: {
            ...(initParams.headers ?? {}),
            [apiKeyHeaderName]: trimmedApiKey,
          },
        }),
      });

      if (isCancelled) {
        hls.destroy();
        return;
      }

      hlsRef.current = hls;
      hls.loadSource(resolvedPlaybackSource);
      hls.attachMedia(video);
      hls.on(HlsCtor.Events.ERROR, (_event: unknown, data: { fatal?: boolean }) => {
        if (!data?.fatal) {
          return;
        }

        setSourceError("Fatal HLS playback error.");
        if (onFatalHlsErrorRef.current) {
          onFatalHlsErrorRef.current(data);
          return;
        }
        onVideoErrorRef.current?.(data);
      });
    };

    void startPlayback();

    return () => {
      isCancelled = true;
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("error", handleError);
      destroyHls();
    };
  }, [
    apiBaseUrl,
    apiKey,
    destroyHls,
    enabled,
    isHlsSource,
    reloadNonce,
    sessionId,
    trimmedSource,
    videoRef,
  ]);

  return {
    reloadSource,
    isHlsSource,
    usingNativeHls: false,
    sourceError,
  };
}
