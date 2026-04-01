import React from "react";
import * as components from "../../../dist/esm/index.js";
import { hyperbrowserTerminalScenario } from "../scenarios/hyperbrowser-terminal.scenario.jsx";
import { hyperbrowserVncViewerScenario } from "../scenarios/hyperbrowser-vnc-viewer.scenario.jsx";
import { hyperbrowserHlsPlaybackScenario } from "../scenarios/hyperbrowser-hls-playback.scenario.jsx";
import { filesystemWorkspaceScenario } from "../scenarios/filesystem-workspace.scenario.jsx";
import { hyperbrowserFileWorkspaceScenario } from "../scenarios/hyperbrowser-file-workspace.scenario.jsx";
import { smokeScenario } from "../scenarios/smoke.example.jsx";
import { terminalPrimitivesScenario } from "../scenarios/terminal-primitives.scenario.jsx";
import { terminalSurfaceScenario } from "../scenarios/terminal-surface.scenario.jsx";

const scenarios = [
  smokeScenario,
  terminalPrimitivesScenario,
  terminalSurfaceScenario,
  filesystemWorkspaceScenario,
  hyperbrowserTerminalScenario,
  hyperbrowserFileWorkspaceScenario,
  hyperbrowserVncViewerScenario,
  hyperbrowserHlsPlaybackScenario,
];

function ScenarioSelector({ selectedId, onChange }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.5rem",
        fontWeight: 600,
        marginBottom: "1rem",
      }}
    >
      Scenario
      <select
        value={selectedId}
        onChange={(event) => onChange(event.target.value)}
        style={{
          border: "1px solid #d0d8e1",
          borderRadius: "10px",
          font: "inherit",
          padding: "0.6rem",
        }}
      >
        {scenarios.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VisualHarness() {
  const [selectedScenarioId, setSelectedScenarioId] = React.useState(
    scenarios[0]?.id ?? "",
  );

  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    scenarios[0] ??
    null;

  return (
    <main
      style={{
        boxSizing: "border-box",
        margin: "0 auto",
        maxWidth: "1360px",
        minHeight: "100vh",
        padding: "2rem 1.25rem",
      }}
    >
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.6rem", margin: "0 0 0.4rem" }}>
          HB UI Components
        </h1>
        <p style={{ margin: 0, opacity: 0.8 }}>
          Manual visual checks for component render and behavior.
        </p>
      </header>
      <ScenarioSelector
        selectedId={selectedScenarioId}
        onChange={setSelectedScenarioId}
      />
      {selectedScenario ? (
        selectedScenario.render({ components })
      ) : (
        <p>No visual scenarios registered.</p>
      )}
    </main>
  );
}
