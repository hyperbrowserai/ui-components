export type HyperbrowserRuntimeAccess = {
  expiresAt?: string | null;
  runtimeBaseUrl: string;
};

export type HyperbrowserRuntimeAccessParams = {
  forceRefresh?: boolean;
  signal: AbortSignal;
};

export type HyperbrowserRuntimeAccessResolver = (
  params: HyperbrowserRuntimeAccessParams,
) => Promise<HyperbrowserRuntimeAccess>;

export type HyperbrowserRuntimeLoaderParams = {
  sandboxId: string;
  signal: AbortSignal;
};

export type HyperbrowserRuntimeLoader = (
  params: HyperbrowserRuntimeLoaderParams,
) => Promise<HyperbrowserRuntimeAccess>;
