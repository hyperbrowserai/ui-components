import React from "react";
import { createMockTerminalConnection } from "./terminal-surface.scenario.jsx";

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

function BaseTerminalPanel({
  appearance,
  BaseTerminal,
  createTerminalTheme,
  preset,
  readOnly,
}) {
  const connection = React.useMemo(() => createMockTerminalConnection(), []);
  const terminalConfig = React.useMemo(
    () =>
      createTerminalTheme(preset, {
        appearance,
        terminalTheme:
          appearance === "dark"
            ? {
                cursor: "#f8b84e",
                selectionBackground: "rgba(248, 184, 78, 0.18)",
              }
            : {
                cursor: "#0f766e",
                selectionBackground: "rgba(15, 118, 110, 0.14)",
              },
      }),
    [appearance, createTerminalTheme, preset],
  );

  return (
    <section
      style={{
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        minHeight: 0,
        border: "1px solid #d8e0eb",
        borderRadius: "16px",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(247, 249, 252, 0.98), rgba(236, 241, 247, 0.96))",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.95rem 1rem",
          borderBottom: "1px solid #d8e0eb",
        }}
      >
        <div style={{ display: "grid", gap: "0.18rem" }}>
          <strong
            style={{
              color: "#0f172a",
              fontSize: "0.98rem",
            }}
          >
            Customer Shell via BaseTerminal
          </strong>
          <span style={{ color: "#475569", fontSize: "0.86rem" }}>
            Library owns xterm + transport, customer owns surrounding chrome.
          </span>
        </div>
        <span
          style={{
            color: "#334155",
            fontSize: "0.78rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {readOnly ? "Read only" : "Interactive"}
        </span>
      </header>
      <div
        style={{
          minHeight: 0,
          padding: "1rem",
          background: "linear-gradient(180deg, #0f172a, #111827)",
        }}
      >
        <BaseTerminal
          {...terminalConfig}
          autoFocus={false}
          connection={connection}
          readOnly={readOnly}
          style={{
            height: "100%",
            borderRadius: "12px",
            background: "#050816",
            outline: "1px solid rgba(148, 163, 184, 0.22)",
          }}
        />
      </div>
    </section>
  );
}

function HookTerminalPanel({ appearance, preset, readOnly, useTerminal }) {
  const connection = React.useMemo(() => createMockTerminalConnection(), []);
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
    readOnly,
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
        minHeight: 0,
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
            Customer Shell via useTerminal
          </strong>
          <span style={{ color: shell.chromeMuted, fontSize: "0.86rem" }}>
            Status: {status}
          </span>
        </div>
        <button
          type="button"
          onClick={() => terminal?.focus()}
          style={{
            borderRadius: "999px",
            border: shell.panelBorder,
            background: shell.panel,
            color: shell.chrome,
            cursor: "pointer",
            font: "inherit",
            fontWeight: 600,
            padding: "0.55rem 0.8rem",
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
            "Toolbar, layout, and status text are fully customer-defined."}
        </span>
        <span>
          {readOnly
            ? "Input disabled"
            : "Try: help, status, palette, long, clear, exit"}
        </span>
      </footer>
    </section>
  );
}

function TerminalPrimitivesDemo({
  BaseTerminal,
  createTerminalTheme,
  terminalPresets,
  useTerminal,
}) {
  const [preset, setPreset] = React.useState("atlas");
  const [appearance, setAppearance] = React.useState("dark");
  const [readOnly, setReadOnly] = React.useState(false);
  const [height, setHeight] = React.useState(520);
  const [sessionSeed, setSessionSeed] = React.useState(0);
  const presetNames = Object.keys(terminalPresets ?? {});

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card>
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <ControlLabel>
            Preset
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                font: "inherit",
                padding: "0.65rem",
              }}
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
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                font: "inherit",
                padding: "0.65rem",
              }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </ControlLabel>
          <ControlLabel>
            Height
            <input
              type="range"
              min={360}
              max={700}
              step={10}
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
            />
            <span style={{ fontWeight: 500, opacity: 0.75 }}>{height}px</span>
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
            onClick={() => setSessionSeed((value) => value + 1)}
            style={{
              border: "1px solid #0f766e",
              borderRadius: "999px",
              background: "#0f766e",
              color: "#ffffff",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 600,
              padding: "0.65rem 0.95rem",
            }}
          >
            Restart sessions
          </button>
          <label
            style={{
              alignItems: "center",
              display: "inline-flex",
              gap: "0.45rem",
            }}
          >
            <input
              type="checkbox"
              checked={readOnly}
              onChange={(event) => setReadOnly(event.target.checked)}
            />
            Read only
          </label>
          <span style={{ color: "#334155", fontSize: "0.92rem" }}>
            Both panels below use the same terminal engine. Only the outer shell
            changes.
          </span>
        </div>
      </Card>
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          minHeight: `${height}px`,
        }}
      >
        <BaseTerminalPanel
          appearance={appearance}
          BaseTerminal={BaseTerminal}
          createTerminalTheme={createTerminalTheme}
          key={`base:${sessionSeed}`}
          preset={preset}
          readOnly={readOnly}
        />
        <HookTerminalPanel
          appearance={appearance}
          key={`hook:${sessionSeed}`}
          preset={preset}
          readOnly={readOnly}
          useTerminal={useTerminal}
        />
      </div>
    </div>
  );
}

export const terminalPrimitivesScenario = {
  id: "terminal-primitives",
  title: "Terminal Primitives",
  render({ components }) {
    const BaseTerminal = components.BaseTerminal;
    const createTerminalTheme = components.createTerminalTheme;
    const terminalPresets = components.terminalPresets;
    const useTerminal = components.useTerminal;

    if (
      typeof BaseTerminal !== "function" ||
      typeof createTerminalTheme !== "function" ||
      typeof useTerminal !== "function" ||
      !terminalPresets
    ) {
      return (
        <Card>
          <p style={{ margin: 0 }}>
            Terminal primitive exports are missing. Build the package after
            adding BaseTerminal and useTerminal.
          </p>
        </Card>
      );
    }

    return (
      <TerminalPrimitivesDemo
        BaseTerminal={BaseTerminal}
        createTerminalTheme={createTerminalTheme}
        terminalPresets={terminalPresets}
        useTerminal={useTerminal}
      />
    );
  },
};
