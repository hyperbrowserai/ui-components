import { useRef } from "react";
import { FileWorkspace } from "../filesystem/FileWorkspace";
import type { FileWorkspaceProps } from "../filesystem/types";
import {
  createHyperbrowserFilesystemAdapter,
  type HyperbrowserFilesystemAdapterOptions,
  type HyperbrowserFilesystemBrowserAuthResolver,
  type HyperbrowserRuntimeBrowserAuth,
} from "./hyperbrowser-filesystem-adapter";

export type HyperbrowserFileWorkspaceProps = Omit<FileWorkspaceProps, "adapter"> &
  HyperbrowserFilesystemAdapterOptions;

type StableAdapterFactory = {
  adapter: ReturnType<typeof createHyperbrowserFilesystemAdapter>;
};

function serializeValue(value: unknown): string {
  if (!value) {
    return "";
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (value instanceof Headers) {
    return JSON.stringify(Array.from(value.entries()));
  }
  if (typeof value === "object") {
    return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
  }
  return String(value);
}

function createAdapterKey(props: HyperbrowserFileWorkspaceProps): string {
  return [
    props.apiBaseUrl ?? "",
    props.bootstrapUrl ?? "",
    props.browserAuthPath ?? "",
    serializeValue(props.apiHeaders),
    props.runtimeBaseUrl ?? "",
    props.sandboxId ?? "",
  ].join("|");
}

function createAdapterOptions(
  props: HyperbrowserFileWorkspaceProps
): HyperbrowserFilesystemAdapterOptions {
  return {
    apiBaseUrl: props.apiBaseUrl,
    apiCredentials: props.apiCredentials,
    apiHeaders: props.apiHeaders,
    bootstrapUrl: props.bootstrapUrl,
    browserAuthPath: props.browserAuthPath,
    fetch: props.fetch,
    getRuntimeBrowserAuth: props.getRuntimeBrowserAuth,
    runtimeBaseUrl: props.runtimeBaseUrl,
    sandboxId: props.sandboxId,
  };
}

export {
  createHyperbrowserFilesystemAdapter,
  type HyperbrowserFilesystemAdapterOptions,
  type HyperbrowserFilesystemBrowserAuthResolver,
  type HyperbrowserRuntimeBrowserAuth,
};

export function HyperbrowserFileWorkspace(
  props: HyperbrowserFileWorkspaceProps
) {
  const adapterFactoryRef = useRef<StableAdapterFactory | null>(null);
  const adapterKeyRef = useRef<string>("");
  const adapterKey = createAdapterKey(props);

  if (!adapterFactoryRef.current || adapterKeyRef.current !== adapterKey) {
    adapterFactoryRef.current = {
      adapter: createHyperbrowserFilesystemAdapter(createAdapterOptions(props)),
    };
    adapterKeyRef.current = adapterKey;
  }

  return (
    <FileWorkspace
      adapter={adapterFactoryRef.current.adapter}
      className={props.className}
      onCreateDirectory={props.onCreateDirectory}
      onCreateFile={props.onCreateFile}
      onDelete={props.onDelete}
      onError={props.onError}
      onOpenFile={props.onOpenFile}
      onRename={props.onRename}
      onSaveFile={props.onSaveFile}
      onWorkspacePathChange={props.onWorkspacePathChange}
      readOnly={props.readOnly}
      style={props.style}
      theme={props.theme}
      title={props.title ?? "Hyperbrowser Filesystem"}
      workspacePath={props.workspacePath}
    />
  );
}
