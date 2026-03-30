import React from "react";

const DEFAULT_API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_INITIAL_PATH = "/";

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  font: "inherit",
  padding: "0.65rem",
};

const buttonStyle = {
  borderRadius: "999px",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 600,
  padding: "0.65rem 0.95rem",
};

function Card({ children }) {
  return (
    <section
      style={{
        display: "grid",
        gap: "0.9rem",
        background: "#ffffff",
        border: "1px solid #e3e8ef",
        borderRadius: "14px",
        boxShadow: "0 12px 24px rgba(17, 34, 51, 0.05)",
        padding: "1rem",
      }}
    >
      {children}
    </section>
  );
}

function ControlLabel({ children }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.4rem",
        fontWeight: 600,
      }}
    >
      {children}
    </label>
  );
}

function HyperbrowserFileWorkspaceDemo({
  HyperbrowserFileWorkspace,
  configureMonacoLoader,
  fileWorkspaceThemePresets,
}) {
  const [mode, setMode] = React.useState("api");
  const [theme, setTheme] = React.useState("atlas");
  const [sandboxId, setSandboxId] = React.useState("");
  const [apiBaseUrl, setApiBaseUrl] = React.useState(DEFAULT_API_BASE_URL);
  const [apiToken, setApiToken] = React.useState("");
  const [runtimeBaseUrl, setRuntimeBaseUrl] = React.useState("");
  const [bootstrapUrl, setBootstrapUrl] = React.useState("");
  const [initialPath, setInitialPath] = React.useState(DEFAULT_INITIAL_PATH);
  const [appliedConfig, setAppliedConfig] = React.useState(null);
  const [launchCount, setLaunchCount] = React.useState(0);
  const [latestEvent, setLatestEvent] = React.useState("Idle.");

  React.useEffect(() => {
    setApiBaseUrl(DEFAULT_API_BASE_URL);
    configureMonacoLoader?.({ vsPath: "/dist/monaco/vs" });
  }, [configureMonacoLoader]);

  const activeConfig = React.useMemo(() => {
    if (!appliedConfig) {
      return null;
    }

    if (appliedConfig.mode === "api") {
      return {
        apiBaseUrl: appliedConfig.apiBaseUrl,
        apiHeaders: appliedConfig.apiToken
          ? {
              Authorization: `Bearer ${appliedConfig.apiToken}`,
            }
          : undefined,
        initialPath: appliedConfig.initialPath || DEFAULT_INITIAL_PATH,
        sandboxId: appliedConfig.sandboxId,
      };
    }

    return {
      bootstrapUrl: appliedConfig.bootstrapUrl,
      initialPath: appliedConfig.initialPath || DEFAULT_INITIAL_PATH,
      runtimeBaseUrl: appliedConfig.runtimeBaseUrl,
    };
  }, [appliedConfig]);

  const themeNames = Object.keys(fileWorkspaceThemePresets ?? {});
  const canLaunch =
    mode === "api"
      ? Boolean(sandboxId.trim() && apiBaseUrl.trim())
      : Boolean(runtimeBaseUrl.trim() && bootstrapUrl.trim());

  const applyConnectionValues = () => {
    if (!canLaunch) {
      return;
    }

    setLatestEvent("Connecting...");
    setAppliedConfig({
      apiBaseUrl: apiBaseUrl.trim(),
      apiToken: apiToken.trim(),
      bootstrapUrl: bootstrapUrl.trim(),
      initialPath: initialPath.trim() || DEFAULT_INITIAL_PATH,
      mode,
      runtimeBaseUrl: runtimeBaseUrl.trim(),
      sandboxId: sandboxId.trim(),
      theme,
    });
    setLaunchCount((value) => value + 1);
  };

  const resetForm = () => {
    setMode("api");
    setTheme("atlas");
    setSandboxId("");
    setApiBaseUrl(DEFAULT_API_BASE_URL);
    setApiToken("");
    setRuntimeBaseUrl("");
    setBootstrapUrl("");
    setInitialPath(DEFAULT_INITIAL_PATH);
    setAppliedConfig(null);
    setLaunchCount(0);
    setLatestEvent("Idle.");
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card>
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <ControlLabel>
            Connection mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              style={inputStyle}
            >
              <option value="api">Control plane API</option>
              <option value="runtime">Direct runtime bootstrap</option>
            </select>
          </ControlLabel>
          <ControlLabel>
            Theme
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              style={inputStyle}
            >
              {themeNames.map((themeName) => (
                <option key={themeName} value={themeName}>
                  {fileWorkspaceThemePresets[themeName].label}
                </option>
              ))}
            </select>
          </ControlLabel>
          <ControlLabel>
            Initial path
            <input
              autoComplete="off"
              value={initialPath}
              onChange={(event) => setInitialPath(event.target.value)}
              placeholder="/"
              style={inputStyle}
              type="text"
            />
          </ControlLabel>
        </div>
        {mode === "api" ? (
          <div
            style={{
              display: "grid",
              gap: "0.9rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <ControlLabel>
              API base URL
              <input
                autoComplete="off"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                placeholder="http://localhost:8080/api"
                style={inputStyle}
                type="text"
              />
            </ControlLabel>
            <ControlLabel>
              Sandbox ID
              <input
                autoComplete="off"
                value={sandboxId}
                onChange={(event) => setSandboxId(event.target.value)}
                placeholder="sandbox UUID"
                style={inputStyle}
                type="text"
              />
            </ControlLabel>
            <ControlLabel>
              API bearer token
              <input
                autoComplete="off"
                value={apiToken}
                onChange={(event) => setApiToken(event.target.value)}
                placeholder="Optional if your backend auth uses cookies"
                style={inputStyle}
                type="password"
              />
            </ControlLabel>
            <div
              style={{
                alignItems: "end",
                display: "flex",
                gap: "0.6rem",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode("api");
                  setApiBaseUrl(DEFAULT_API_BASE_URL);
                }}
                style={{
                  ...buttonStyle,
                  background: "#e2e8f0",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                }}
              >
                Reset to default API
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "0.9rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <ControlLabel>
              Runtime base URL
              <input
                autoComplete="off"
                value={runtimeBaseUrl}
                onChange={(event) => setRuntimeBaseUrl(event.target.value)}
                placeholder="https://<session>.<region>.hyperbrowser.run"
                style={inputStyle}
                type="text"
              />
            </ControlLabel>
            <ControlLabel>
              Bootstrap URL
              <input
                autoComplete="off"
                value={bootstrapUrl}
                onChange={(event) => setBootstrapUrl(event.target.value)}
                placeholder="https://<session>.../_hb/runtime-auth?grant=..."
                style={inputStyle}
                type="text"
              />
            </ControlLabel>
          </div>
        )}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <button
            type="button"
            disabled={!canLaunch}
            onClick={applyConnectionValues}
            style={{
              ...buttonStyle,
              border: "1px solid #0f766e",
              background: canLaunch ? "#0f766e" : "#94a3b8",
              color: "#ffffff",
              cursor: canLaunch ? "pointer" : "not-allowed",
            }}
          >
            {launchCount > 0 ? "Reconnect workspace" : "Launch workspace"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            style={{
              ...buttonStyle,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
            }}
          >
            Reset form
          </button>
          <span style={{ color: "#334155", fontSize: "0.92rem" }}>
            API mode calls `/sandbox/:id/runtime/browser-auth`. Runtime mode
            needs a live runtime base URL plus a bootstrap URL.
          </span>
        </div>
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            color: "#334155",
            display: "grid",
            gap: "0.45rem",
            padding: "0.85rem 1rem",
          }}
        >
          <strong>{appliedConfig ? "Applied connection" : "Draft only"}</strong>
          <div
            style={{
              color: "#0f172a",
              fontFamily: "monospace",
              fontSize: "0.9rem",
            }}
          >
            {`Compiled default API base: ${DEFAULT_API_BASE_URL}`}
          </div>
          <div>
            {appliedConfig
              ? appliedConfig.mode === "api"
                ? `API ${appliedConfig.apiBaseUrl} -> sandbox ${appliedConfig.sandboxId}`
                : `Runtime ${appliedConfig.runtimeBaseUrl}`
              : "Edit the fields above, then click Launch workspace to apply a stable connection snapshot."}
          </div>
          <div style={{ fontSize: "0.92rem" }}>
            {mode === "api"
              ? "API mode needs a reachable control-plane API and auth via bearer token or browser cookies."
              : "Runtime mode skips the control-plane API. Paste the runtime base URL and bootstrap URL from an already-running sandbox."}
          </div>
        </div>
        <p style={{ color: "#475569", fontSize: "0.92rem", margin: 0 }}>
          {`Latest event: ${latestEvent}`}
        </p>
      </Card>
      {activeConfig ? (
        <div
          style={{
            minHeight: "780px",
          }}
        >
          {
            <HyperbrowserFileWorkspace
              {...activeConfig}
              key={`${launchCount}:${appliedConfig.theme}:${appliedConfig.initialPath}`}
              onCreateDirectory={(path) =>
                setLatestEvent(`Created directory: ${path}`)
              }
              onCreateFile={(path) => setLatestEvent(`Created file: ${path}`)}
              onDelete={(path) => setLatestEvent(`Deleted: ${path}`)}
              onError={(message) => setLatestEvent(`Error: ${message}`)}
              onOpenFile={(path) => setLatestEvent(`Opened: ${path}`)}
              onRename={(path, nextPath) =>
                setLatestEvent(`Renamed ${path} -> ${nextPath}`)
              }
              onSaveFile={(path) => setLatestEvent(`Saved: ${path}`)}
              style={{ minHeight: "780px" }}
              theme={appliedConfig.theme}
              title="Hyperbrowser File Workspace"
            />
          }
        </div>
      ) : (
        <Card>
          <p style={{ margin: 0 }}>
            Enter runtime details above and launch the workspace to exercise the
            browser-auth bootstrap and live sandbox filesystem routes.
          </p>
        </Card>
      )}
    </div>
  );
}

export const hyperbrowserFileWorkspaceScenario = {
  id: "hyperbrowser-file-workspace",
  title: "Hyperbrowser File Workspace",
  render({ components }) {
    const HyperbrowserFileWorkspace = components.HyperbrowserFileWorkspace;
    const configureMonacoLoader = components.configureMonacoLoader;
    const fileWorkspaceThemePresets = components.fileWorkspaceThemePresets;

    if (
      typeof HyperbrowserFileWorkspace !== "function" ||
      typeof configureMonacoLoader !== "function" ||
      !fileWorkspaceThemePresets
    ) {
      return (
        <Card>
          <p style={{ margin: 0 }}>
            HyperbrowserFileWorkspace exports are missing. Build the package
            after adding the filesystem wrapper.
          </p>
        </Card>
      );
    }

    return (
      <HyperbrowserFileWorkspaceDemo
        HyperbrowserFileWorkspace={HyperbrowserFileWorkspace}
        configureMonacoLoader={configureMonacoLoader}
        fileWorkspaceThemePresets={fileWorkspaceThemePresets}
      />
    );
  },
};
