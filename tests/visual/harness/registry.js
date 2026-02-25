import React from 'react';
import * as components from '../../../dist/esm/index.js';
import { hyperbrowserVncViewerScenario } from '../scenarios/hyperbrowser-vnc-viewer.scenario.js';
import { hyperbrowserHlsPlaybackScenario } from '../scenarios/hyperbrowser-hls-playback.scenario.js';
import { smokeScenario } from '../scenarios/smoke.example.js';

const scenarios = [smokeScenario, hyperbrowserVncViewerScenario, hyperbrowserHlsPlaybackScenario];

function ScenarioSelector({ selectedId, onChange }) {
  return React.createElement(
    'label',
    {
      style: {
        display: 'grid',
        gap: '0.5rem',
        fontWeight: 600,
        marginBottom: '1rem'
      }
    },
    'Scenario',
    React.createElement(
      'select',
      {
        value: selectedId,
        onChange: (event) => onChange(event.target.value),
        style: {
          border: '1px solid #d0d8e1',
          borderRadius: '10px',
          font: 'inherit',
          padding: '0.6rem'
        }
      },
      scenarios.map((scenario) =>
        React.createElement(
          'option',
          { key: scenario.id, value: scenario.id },
          scenario.title
        )
      )
    )
  );
}

export function VisualHarness() {
  const [selectedScenarioId, setSelectedScenarioId] = React.useState(scenarios[0]?.id ?? '');

  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0] ?? null;

  return React.createElement(
    'main',
    {
      style: {
        boxSizing: 'border-box',
        margin: '0 auto',
        maxWidth: '960px',
        minHeight: '100vh',
        padding: '2rem 1.25rem'
      }
    },
    React.createElement(
      'header',
      { style: { marginBottom: '1.25rem' } },
      React.createElement(
        'h1',
        { style: { fontSize: '1.6rem', margin: '0 0 0.4rem' } },
        'HB UI Components'
      ),
      React.createElement(
        'p',
        { style: { margin: 0, opacity: 0.8 } },
        'Manual visual checks for component render and behavior.'
      )
    ),
    React.createElement(ScenarioSelector, {
      selectedId: selectedScenarioId,
      onChange: setSelectedScenarioId
    }),
    selectedScenario
      ? selectedScenario.render({ components })
      : React.createElement('p', null, 'No visual scenarios registered.')
  );
}
