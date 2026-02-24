import React from 'react';
import { createRoot } from 'react-dom/client';
import { VisualHarness } from './registry.js';

const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error('Missing #app root node for visual harness.');
}

const root = createRoot(rootElement);
root.render(React.createElement(VisualHarness));
