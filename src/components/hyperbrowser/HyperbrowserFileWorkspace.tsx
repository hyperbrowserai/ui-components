import { useMemo } from "react";
import { FileWorkspace } from "../filesystem/FileWorkspace";
import type { FileWorkspaceProps } from "../filesystem/types";
import {
  createHyperbrowserFilesystemAdapter,
  type HyperbrowserFilesystemAdapterOptions,
} from "./hyperbrowser-filesystem-adapter";
import { useHyperbrowserRuntime } from "./HyperbrowserRuntimeProvider";

export type HyperbrowserFileWorkspaceProps = Omit<
  FileWorkspaceProps,
  "adapter"
> &
  Pick<HyperbrowserFilesystemAdapterOptions, "fetch">;

function createAdapterOptions(
  props: HyperbrowserFileWorkspaceProps,
  getRuntimeAccess: HyperbrowserFilesystemAdapterOptions["getRuntimeAccess"],
): HyperbrowserFilesystemAdapterOptions {
  return {
    fetch: props.fetch,
    getRuntimeAccess,
  };
}

export {
  createHyperbrowserFilesystemAdapter,
  type HyperbrowserFilesystemAdapterOptions,
};

export function HyperbrowserFileWorkspace(
  props: HyperbrowserFileWorkspaceProps,
) {
  const { ensureRuntimeAccess } = useHyperbrowserRuntime();
  const adapter = useMemo(
    () =>
      createHyperbrowserFilesystemAdapter(
        createAdapterOptions(props, ensureRuntimeAccess),
      ),
    [props.fetch, ensureRuntimeAccess],
  );

  return (
    <FileWorkspace
      adapter={adapter}
      appearance={props.appearance}
      className={props.className}
      chromeTheme={props.chromeTheme}
      editorTheme={props.editorTheme}
      onCreateDirectory={props.onCreateDirectory}
      onCreateFile={props.onCreateFile}
      onDelete={props.onDelete}
      onError={props.onError}
      onOpenFile={props.onOpenFile}
      onRename={props.onRename}
      onSaveFile={props.onSaveFile}
      onWorkspacePathChange={props.onWorkspacePathChange}
      preset={props.preset}
      readOnly={props.readOnly}
      style={props.style}
      theme={props.theme}
      title={props.title ?? "Hyperbrowser Filesystem"}
      workspacePath={props.workspacePath}
    />
  );
}
