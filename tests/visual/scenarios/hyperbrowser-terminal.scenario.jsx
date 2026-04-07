import React from "react";

const DEFAULT_API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_COMMAND = "bash";

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

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

async function getResponseErrorMessage(response, fallbackMessage) {
  const text = await response.text();
  if (!text) {
    return fallbackMessage;
  }

  try {
    const payload = JSON.parse(text);
    if (typeof payload?.message === "string" && payload.message) {
      return payload.message;
    }
    if (typeof payload?.error === "string" && payload.error) {
      return payload.error;
    }
    return fallbackMessage;
  } catch {
    return text;
  }
}

async function loadRuntimeAccessFromApi({
  apiBaseUrl,
  apiHeaders,
  sandboxId,
  signal,
}) {
  const response = await fetch(
    `${trimTrailingSlash(apiBaseUrl)}/sandbox/${encodeURIComponent(
      sandboxId,
    )}/runtime/browser-auth`,
    {
      cache: "no-store",
      credentials: "include",
      headers: apiHeaders,
      method: "POST",
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getResponseErrorMessage(
        response,
        `Failed to issue runtime auth (${response.status})`,
      ),
    );
  }

  const runtimeAuth = await response.json();
  if (typeof runtimeAuth?.bootstrapUrl !== "string" || !runtimeAuth.bootstrapUrl) {
    throw new Error("Runtime auth response did not include a bootstrapUrl.");
  }

  const bootstrapResponse = await fetch(runtimeAuth.bootstrapUrl, {
    cache: "no-store",
    credentials: "include",
    method: "GET",
    signal,
  });

  if (!bootstrapResponse.ok) {
    throw new Error(
      await getResponseErrorMessage(
        bootstrapResponse,
        `Failed to prepare runtime (${bootstrapResponse.status})`,
      ),
    );
  }

  const runtimeBaseUrl =
    (typeof runtimeAuth?.runtime?.baseUrl === "string" &&
      runtimeAuth.runtime.baseUrl.trim()) ||
    new URL(runtimeAuth.bootstrapUrl).origin;

  return {
    expiresAt:
      typeof runtimeAuth?.bootstrapUrlExpiresAt === "string"
        ? runtimeAuth.bootstrapUrlExpiresAt
        : null,
    runtimeBaseUrl,
  };
}

async function loadRuntimeAccessFromBootstrap({
  bootstrapUrl,
  runtimeBaseUrl,
  signal,
}) {
  const bootstrapResponse = await fetch(bootstrapUrl, {
    cache: "no-store",
    credentials: "include",
    method: "GET",
    signal,
  });

  if (!bootstrapResponse.ok) {
    throw new Error(
      await getResponseErrorMessage(
        bootstrapResponse,
        `Failed to prepare runtime (${bootstrapResponse.status})`,
      ),
    );
  }

  return {
    expiresAt: null,
    runtimeBaseUrl: runtimeBaseUrl || new URL(bootstrapUrl).origin,
  };
}

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

function HyperbrowserCustomShell({
  appearance,
  connectionOptions,
  preset,
  useHyperbrowserRuntime,
  useSandboxTerminalConnection,
  useTerminal,
}) {
  const { ensureRuntimeAccess } = useHyperbrowserRuntime();
  const connection = useSandboxTerminalConnection({
    ...connectionOptions,
    getRuntimeAccess: ensureRuntimeAccess,
  });
  const shell =
    appearance === "dark"
      ? {
          background: "#111827",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          chrome: "#e5e7eb",
          chromeMuted: "#9ca3af",
          panel: "#0b1220",
          panelBorder: "1px solid rgba(148, 163, 184, 0.18)",
        }
      : {
          background: "#f7f3ea",
          border: "1px solid rgba(154, 92, 36, 0.16)",
          chrome: "#302518",
          chromeMuted: "#736148",
          panel: "#fff8ea",
          panelBorder: "1px solid rgba(154, 92, 36, 0.18)",
        };
  const { errorMessage, status, terminal, viewportRef } = useTerminal({
    appearance,
    autoFocus: false,
    connection,
    preset,
    terminalTheme:
      appearance === "dark"
        ? {
            cursor: "#f8b84e",
            selectionBackground: "rgba(248, 184, 78, 0.18)",
          }
        : {
            cursor: "#9a5c24",
            selectionBackground: "rgba(154, 92, 36, 0.14)",
          },
  });

  return (
    <section
      style={{
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        minHeight: "580px",
        borderRadius: "18px",
        overflow: "hidden",
        background: shell.background,
        border: shell.border,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.9rem 1rem",
          borderBottom: shell.border,
        }}
      >
        <div style={{ display: "grid", gap: "0.18rem" }}>
          <strong
            style={{
              color: shell.chrome,
              fontSize: "0.98rem",
            }}
          >
            Custom Shell via useSandboxTerminalConnection
          </strong>
          <span style={{ color: shell.chromeMuted, fontSize: "0.86rem" }}>
            Status: {status}
          </span>
        </div>
        <button
          type="button"
          onClick={() => terminal?.focus()}
          style={{
            ...buttonStyle,
            border: shell.panelBorder,
            background: shell.panel,
            color: shell.chrome,
          }}
        >
          Focus terminal
        </button>
      </header>
      <div
        style={{
          minHeight: 0,
          padding: "1rem",
        }}
      >
        <div
          ref={viewportRef}
          className="hb-terminal-base"
          style={{
            height: "100%",
            borderRadius: "12px",
            background: shell.panel,
            outline: shell.panelBorder,
          }}
        />
      </div>
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.85rem 1rem",
          borderTop: shell.border,
          color: shell.chrome,
          fontSize: "0.84rem",
        }}
      >
        <span>
          {errorMessage ||
            "This panel uses the sandbox connection hook plus useTerminal."}
        </span>
        <span>
          Auth bootstrap and runtime cookies are still handled by the transport.
        </span>
      </footer>
    </section>
  );
}

function HyperbrowserTerminalDemo({
  HyperbrowserRuntimeProvider,
  HyperbrowserTerminal,
  terminalPresets,
  useHyperbrowserRuntime,
  useSandboxTerminalConnection,
  useTerminal,
}) {
  const [mode, setMode] = React.useState("api");
  const [preset, setPreset] = React.useState("atlas");
  const [appearance, setAppearance] = React.useState("dark");
  const [sandboxId, setSandboxId] = React.useState("");
  const [apiBaseUrl, setApiBaseUrl] = React.useState(DEFAULT_API_BASE_URL);
  const [apiToken, setApiToken] = React.useState("");
  const [bootstrapUrl, setBootstrapUrl] = React.useState("");
  const [command, setCommand] = React.useState(DEFAULT_COMMAND);
  const [cwd, setCwd] = React.useState("");
  const [closeBehavior, setCloseBehavior] = React.useState("disconnect");
  const [appliedConfig, setAppliedConfig] = React.useState(null);
  const [launchCount, setLaunchCount] = React.useState(0);
  const [latestEvent, setLatestEvent] = React.useState("Idle.");

  React.useEffect(() => {
    setApiBaseUrl(DEFAULT_API_BASE_URL);
  }, []);

  const runtimeConfig = React.useMemo(() => {
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
        mode: "api",
        sandboxId: appliedConfig.sandboxId,
      };
    }

    const runtimeBaseUrl = (() => {
      try {
        return new URL(appliedConfig.bootstrapUrl).origin;
      } catch {
        return "";
      }
    })();

    return {
      bootstrapUrl: appliedConfig.bootstrapUrl,
      mode: "runtime",
      runtimeBaseUrl,
      sandboxId: runtimeBaseUrl || "direct-runtime",
    };
  }, [appliedConfig]);

  const terminalConfig = React.useMemo(() => {
    if (!appliedConfig) {
      return null;
    }

    return {
      closeBehavior: appliedConfig.closeBehavior,
      command: appliedConfig.command,
      cwd: appliedConfig.cwd || undefined,
    };
  }, [appliedConfig]);

  const loadRuntimeAccess = React.useMemo(() => {
    if (!runtimeConfig) {
      return null;
    }

    if (runtimeConfig.mode === "api") {
      return ({ sandboxId: requestedSandboxId, signal }) =>
        loadRuntimeAccessFromApi({
          apiBaseUrl: runtimeConfig.apiBaseUrl,
          apiHeaders: runtimeConfig.apiHeaders,
          sandboxId: requestedSandboxId,
          signal,
        });
    }

    return ({ signal }) =>
      loadRuntimeAccessFromBootstrap({
        bootstrapUrl: runtimeConfig.bootstrapUrl,
        runtimeBaseUrl: runtimeConfig.runtimeBaseUrl,
        signal,
      });
  }, [runtimeConfig]);

  const presetNames = Object.keys(terminalPresets ?? {});
  const canLaunch =
    mode === "api"
      ? Boolean(sandboxId.trim() && apiBaseUrl.trim())
      : Boolean(bootstrapUrl.trim());

  const applyConnectionValues = () => {
    if (!canLaunch) {
      return;
    }

    setLatestEvent("Connecting...");
    setAppliedConfig({
      apiBaseUrl: apiBaseUrl.trim(),
      apiToken: apiToken.trim(),
      appearance,
      bootstrapUrl: bootstrapUrl.trim(),
      closeBehavior,
      command: command.trim() || DEFAULT_COMMAND,
      cwd: cwd.trim(),
      mode,
      preset,
      sandboxId: sandboxId.trim(),
    });
    setLaunchCount((value) => value + 1);
  };

  const resetForm = () => {
    setMode("api");
    setPreset("atlas");
    setAppearance("dark");
    setSandboxId("");
    setApiBaseUrl(DEFAULT_API_BASE_URL);
    setApiToken("");
    setBootstrapUrl("");
    setCommand(DEFAULT_COMMAND);
    setCwd("");
    setCloseBehavior("disconnect");
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
            Preset
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
              style={inputStyle}
            >
              {presetNames.map((presetName) => (
                <option key={presetName} value={presetName}>
                  {terminalPresets[presetName].label}
                </option>
              ))}
            </select>
          </ControlLabel>
          <ControlLabel>
            Appearance
            <select
              value={appearance}
              onChange={(event) => setAppearance(event.target.value)}
              style={inputStyle}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </ControlLabel>
          <ControlLabel>
            Close behavior
            <select
              value={closeBehavior}
              onChange={(event) => setCloseBehavior(event.target.value)}
              style={inputStyle}
            >
              <option value="disconnect">Disconnect only</option>
              <option value="terminate">Terminate PTY on unmount</option>
            </select>
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
              gridTemplateColumns: "minmax(260px, 1fr)",
            }}
          >
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
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <ControlLabel>
            Command
            <input
              autoComplete="off"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder={DEFAULT_COMMAND}
              style={inputStyle}
              type="text"
            />
          </ControlLabel>
          <ControlLabel>
            Working directory
            <input
              autoComplete="off"
              value={cwd}
              onChange={(event) => setCwd(event.target.value)}
              placeholder="/home/hyperuser"
              style={inputStyle}
              type="text"
            />
          </ControlLabel>
        </div>
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
            {launchCount > 0 ? "Reconnect terminal" : "Launch terminal"}
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
            API mode calls `/sandbox/:id/runtime/browser-auth`, then bootstraps
            runtime auth. Runtime mode only needs a bootstrap URL.
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
                : `Bootstrap ${appliedConfig.bootstrapUrl}`
              : "Edit the fields above, then click Launch terminal to apply a stable connection snapshot."}
          </div>
          <div style={{ fontSize: "0.92rem" }}>
            {mode === "api"
              ? "API mode needs a reachable control-plane API and auth via bearer token or browser cookies."
              : "Runtime mode skips the control-plane API. Paste the bootstrap URL from an already-running sandbox."}
          </div>
        </div>
        <p style={{ color: "#475569", fontSize: "0.92rem", margin: 0 }}>
          {`Latest event: ${latestEvent}`}
        </p>
      </Card>
      {runtimeConfig && terminalConfig && loadRuntimeAccess ? (
        <HyperbrowserRuntimeProvider
          key={`${runtimeConfig.sandboxId}:${launchCount}`}
          loadRuntimeAccess={loadRuntimeAccess}
          sandboxId={runtimeConfig.sandboxId}
        >
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            }}
          >
            <div style={{ minHeight: "580px" }}>
              <HyperbrowserTerminal
                {...terminalConfig}
                appearance={appliedConfig.appearance}
                autoFocus={false}
                key={`${launchCount}:${appliedConfig.preset}:${appliedConfig.appearance}:turnkey`}
                onConnectionError={(message) =>
                  setLatestEvent(`Turnkey connection error: ${message}`)
                }
                onExit={(event) =>
                  setLatestEvent(
                    event.error
                      ? `Turnkey exited with error: ${event.error}`
                      : `Turnkey exited with code ${event.exitCode ?? 0}`,
                  )
                }
                preset={appliedConfig.preset}
                style={{ height: "100%" }}
                title="Hyperbrowser PTY Terminal"
              />
            </div>
            <HyperbrowserCustomShell
              appearance={appliedConfig.appearance}
              connectionOptions={terminalConfig}
              key={`${launchCount}:${appliedConfig.preset}:${appliedConfig.appearance}:custom`}
              preset={appliedConfig.preset}
              useHyperbrowserRuntime={useHyperbrowserRuntime}
              useSandboxTerminalConnection={useSandboxTerminalConnection}
              useTerminal={useTerminal}
            />
          </div>
        </HyperbrowserRuntimeProvider>
      ) : (
        <Card>
          <p style={{ margin: 0 }}>
            Enter runtime details above and launch the terminal to exercise the
            browser-auth bootstrap and PTY websocket flow.
          </p>
        </Card>
      )}
    </div>
  );
}

export const hyperbrowserTerminalScenario = {
  id: "hyperbrowser-terminal",
  title: "Hyperbrowser Terminal",
  render({ components }) {
    const HyperbrowserRuntimeProvider = components.HyperbrowserRuntimeProvider;
    const HyperbrowserTerminal = components.HyperbrowserTerminal;
    const terminalPresets = components.terminalPresets;
    const useHyperbrowserRuntime = components.useHyperbrowserRuntime;
    const useSandboxTerminalConnection =
      components.useSandboxTerminalConnection;
    const useTerminal = components.useTerminal;

    if (
      typeof HyperbrowserRuntimeProvider !== "function" ||
      typeof HyperbrowserTerminal !== "function" ||
      typeof useHyperbrowserRuntime !== "function" ||
      typeof useSandboxTerminalConnection !== "function" ||
      typeof useTerminal !== "function" ||
      !terminalPresets
    ) {
      return (
        <Card>
          <p style={{ margin: 0 }}>
            Hyperbrowser terminal exports are missing. Build the package after
            updating the sandbox terminal API.
          </p>
        </Card>
      );
    }

    return (
      <HyperbrowserTerminalDemo
        HyperbrowserRuntimeProvider={HyperbrowserRuntimeProvider}
        HyperbrowserTerminal={HyperbrowserTerminal}
        terminalPresets={terminalPresets}
        useHyperbrowserRuntime={useHyperbrowserRuntime}
        useSandboxTerminalConnection={useSandboxTerminalConnection}
        useTerminal={useTerminal}
      />
    );
  },
};
