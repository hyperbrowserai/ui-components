import { useMemo } from "react";
import { FileWorkspace } from "../filesystem/FileWorkspace";
import type { FileWorkspaceProps } from "../filesystem/types";
import {
  createHyperbrowserFilesystemAdapter,
  type HyperbrowserFilesystemAdapterOptions,
  type HyperbrowserFilesystemBrowserAuthParams,
  type HyperbrowserFilesystemBrowserAuthResolver,
  type HyperbrowserRuntimeBrowserAuth,
} from "./hyperbrowser-filesystem-adapter";

export type HyperbrowserFileWorkspaceProps = Omit<FileWorkspaceProps, "adapter"> &
  HyperbrowserFilesystemAdapterOptions;

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
  type HyperbrowserFilesystemBrowserAuthParams,
  type HyperbrowserFilesystemBrowserAuthResolver,
  type HyperbrowserRuntimeBrowserAuth,
};

export function HyperbrowserFileWorkspace(
  props: HyperbrowserFileWorkspaceProps
) {
  const adapter = useMemo(
    () => createHyperbrowserFilesystemAdapter(createAdapterOptions(props)),
    [
      props.apiBaseUrl,
      props.apiCredentials,
      props.apiHeaders,
      props.bootstrapUrl,
      props.browserAuthPath,
      props.fetch,
      props.getRuntimeBrowserAuth,
      props.runtimeBaseUrl,
      props.sandboxId,
    ]
  );

  return (
    <FileWorkspace
      adapter={adapter}
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
