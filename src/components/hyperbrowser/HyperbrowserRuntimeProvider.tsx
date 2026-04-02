"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type {
  HyperbrowserRuntimeAccess,
  HyperbrowserRuntimeAccessResolver,
  HyperbrowserRuntimeLoader,
} from "./hyperbrowser-runtime";

const RUNTIME_REFRESH_BUFFER_MS = 15_000;

type HyperbrowserRuntimeContextValue = {
  ensureRuntimeAccess: HyperbrowserRuntimeAccessResolver;
  invalidateRuntimeAccess: () => void;
  sandboxId: string;
};

type HyperbrowserRuntimeProviderProps = {
  children: ReactNode;
  loadRuntimeAccess: HyperbrowserRuntimeLoader;
  sandboxId: string;
};

type RuntimeProviderState = {
  cachedAccess: HyperbrowserRuntimeAccess | null;
  inFlightAccess: Promise<HyperbrowserRuntimeAccess> | null;
  sandboxId: string;
};

const HyperbrowserRuntimeContext =
  createContext<HyperbrowserRuntimeContextValue | null>(null);

function createAbortError(): DOMException {
  return new DOMException("Request aborted", "AbortError");
}

function withAbortSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };

    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function isRuntimeAccessFresh(
  runtimeAccess: HyperbrowserRuntimeAccess | null,
): runtimeAccess is HyperbrowserRuntimeAccess {
  if (!runtimeAccess) {
    return false;
  }

  const expiresAtMs = runtimeAccess.expiresAt
    ? Date.parse(runtimeAccess.expiresAt)
    : Number.NaN;
  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }

  return expiresAtMs - RUNTIME_REFRESH_BUFFER_MS > Date.now();
}

export function HyperbrowserRuntimeProvider({
  children,
  loadRuntimeAccess,
  sandboxId,
}: HyperbrowserRuntimeProviderProps) {
  const stateRef = useRef<RuntimeProviderState>({
    cachedAccess: null,
    inFlightAccess: null,
    sandboxId,
  });

  if (stateRef.current.sandboxId !== sandboxId) {
    stateRef.current = {
      cachedAccess: null,
      inFlightAccess: null,
      sandboxId,
    };
  }

  const invalidateRuntimeAccess = useCallback(() => {
    stateRef.current.cachedAccess = null;
    stateRef.current.inFlightAccess = null;
  }, []);

  const ensureRuntimeAccess = useCallback<HyperbrowserRuntimeAccessResolver>(
    async ({ forceRefresh = false, signal }) => {
      if (
        !forceRefresh &&
        isRuntimeAccessFresh(stateRef.current.cachedAccess)
      ) {
        return stateRef.current.cachedAccess;
      }

      if (!forceRefresh && stateRef.current.inFlightAccess) {
        return withAbortSignal(stateRef.current.inFlightAccess, signal);
      }

      const requestSandboxId = sandboxId;
      const controller = new AbortController();
      const runtimeAccessPromise = loadRuntimeAccess({
        sandboxId: requestSandboxId,
        signal: controller.signal,
      })
        .then((runtimeAccess) => {
          if (stateRef.current.sandboxId === requestSandboxId) {
            stateRef.current.cachedAccess = runtimeAccess;
          }
          return runtimeAccess;
        })
        .catch((error) => {
          if (stateRef.current.sandboxId === requestSandboxId) {
            stateRef.current.cachedAccess = null;
            stateRef.current.inFlightAccess = null;
          }
          throw error;
        })
        .finally(() => {
          if (
            stateRef.current.sandboxId === requestSandboxId &&
            stateRef.current.inFlightAccess === runtimeAccessPromise
          ) {
            stateRef.current.inFlightAccess = null;
          }
        });

      stateRef.current.inFlightAccess = runtimeAccessPromise;
      return withAbortSignal(runtimeAccessPromise, signal);
    },
    [loadRuntimeAccess, sandboxId],
  );

  const contextValue = useMemo<HyperbrowserRuntimeContextValue>(
    () => ({
      ensureRuntimeAccess,
      invalidateRuntimeAccess,
      sandboxId,
    }),
    [ensureRuntimeAccess, invalidateRuntimeAccess, sandboxId],
  );

  return (
    <HyperbrowserRuntimeContext.Provider value={contextValue}>
      {children}
    </HyperbrowserRuntimeContext.Provider>
  );
}

export function useHyperbrowserRuntime(): HyperbrowserRuntimeContextValue {
  const value = useContext(HyperbrowserRuntimeContext);
  if (!value) {
    throw new Error(
      "Hyperbrowser runtime context missing. Wrap this subtree in HyperbrowserRuntimeProvider.",
    );
  }
  return value;
}
