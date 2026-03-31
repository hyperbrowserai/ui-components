import type * as MonacoEditor from "monaco-editor";

type MonacoNamespace = typeof MonacoEditor;
type MonacoWindow = Window & {
  monaco?: MonacoNamespace;
  require?: AMDRequire;
};

type AMDRequire = ((modules: string[], onLoad: () => void, onError?: (error: unknown) => void) => void) & {
  config: (config: { paths: Record<string, string> }) => void;
};

export type MonacoLoaderOptions = {
  vsPath?: string;
};

const DEFAULT_MONACO_VS_PATH = "/dist/monaco/vs";
const SCRIPT_ATTRIBUTE = "data-hb-monaco-loader";

let configuredVsPath = DEFAULT_MONACO_VS_PATH;
let loaderPromise: Promise<MonacoNamespace> | null = null;

function normalizeVsPath(path: string): string {
  return path.replace(/\/+$/, "");
}

function loadAmdLoader(vsPath: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Monaco can only be loaded in a browser environment.")
    );
  }

  const monacoWindow = window as MonacoWindow;
  if (monacoWindow.require) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[${SCRIPT_ATTRIBUTE}="true"]`
  );
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Monaco AMD loader.")),
        { once: true }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `${vsPath}/loader.js`;
    script.setAttribute(SCRIPT_ATTRIBUTE, "true");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load Monaco from ${vsPath}.`)),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

export function configureMonacoLoader(options: MonacoLoaderOptions): void {
  if (!options.vsPath) {
    return;
  }

  configuredVsPath = normalizeVsPath(options.vsPath);
  loaderPromise = null;
}

export function getConfiguredMonacoVsPath(): string {
  return configuredVsPath;
}

export async function loadMonaco(): Promise<MonacoNamespace> {
  if (typeof window === "undefined") {
    throw new Error("Monaco can only be loaded in a browser environment.");
  }

  const monacoWindow = window as MonacoWindow;

  if (monacoWindow.monaco) {
    return monacoWindow.monaco;
  }

  if (!loaderPromise) {
    loaderPromise = (async () => {
      const vsPath = normalizeVsPath(configuredVsPath);
      await loadAmdLoader(vsPath);

      const runtimeWindow = window as MonacoWindow;
      if (typeof runtimeWindow.require !== "function") {
        throw new Error("Monaco AMD loader did not expose window.require.");
      }

      window.MonacoEnvironment = {
        baseUrl: `${vsPath}/`,
      };
      runtimeWindow.require.config({
        paths: {
          vs: vsPath,
        },
      });

      return new Promise<MonacoNamespace>((resolve, reject) => {
        runtimeWindow.require?.(
          ["vs/editor/editor.main"],
          () => {
            const loadedWindow = window as MonacoWindow;
            if (!loadedWindow.monaco) {
              reject(new Error("Monaco loaded without exposing window.monaco."));
              return;
            }
            resolve(loadedWindow.monaco);
          },
          (error) => {
            reject(
              error instanceof Error
                ? error
                : new Error("Failed to load Monaco editor.")
            );
          }
        );
      });
    })();
  }

  return loaderPromise;
}
