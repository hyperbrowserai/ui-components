import "@xterm/xterm/css/xterm.css";
import "../../../src/styles/terminal-core.css";
import "../../../src/styles/terminal.css";
import "../../../src/styles/filesystem.css";
import { createRoot } from "react-dom/client";
import { VisualHarness } from "./registry.jsx";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app root node for visual harness.");
}

const root = createRoot(rootElement);
root.render(<VisualHarness />);
