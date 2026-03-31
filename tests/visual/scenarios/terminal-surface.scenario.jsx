import React from "react";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PROMPT = "atlas@ui-components:~$ ";

function toBytes(value) {
  return encoder.encode(value);
}

function createPaletteOutput() {
  return [
    "\u001b[1mANSI palette\u001b[0m",
    "\u001b[31mred\u001b[0m  \u001b[32mgreen\u001b[0m  \u001b[33myellow\u001b[0m  \u001b[34mblue\u001b[0m",
    "\u001b[35mmagenta\u001b[0m  \u001b[36mcyan\u001b[0m  \u001b[37mwhite\u001b[0m",
    "\u001b[90mbright black\u001b[0m  \u001b[91mbright red\u001b[0m  \u001b[92mbright green\u001b[0m",
    "\u001b[93mbright yellow\u001b[0m  \u001b[94mbright blue\u001b[0m  \u001b[95mbright magenta\u001b[0m",
    "\u001b[96mbright cyan\u001b[0m  \u001b[97mbright white\u001b[0m",
  ].join("\r\n");
}

function createLongOutput() {
  return Array.from({ length: 28 }, (_, index) => {
    const lineNumber = String(index + 1).padStart(2, "0");
    return `${lineNumber}  Resize the panel or switch themes to verify fit and redraw behavior.`;
  }).join("\r\n");
}

export function createMockTerminalConnection() {
  let nextSessionId = 1;

  return {
    async connect({ cols, rows, signal }) {
      if (signal.aborted) {
        throw new Error("Terminal bootstrap aborted.");
      }

      const sessionId = nextSessionId;
      nextSessionId += 1;

      let closed = false;
      let lineBuffer = "";
      let size = { cols, rows };
      const outputListeners = new Set();
      const exitListeners = new Set();

      const emitOutput = (value) => {
        if (closed) {
          return;
        }

        const payload = typeof value === "string" ? toBytes(value) : value;
        outputListeners.forEach((listener) => listener(payload));
      };

      const emitExit = (event) => {
        if (closed) {
          return;
        }

        closed = true;
        exitListeners.forEach((listener) => listener(event));
      };

      const printPrompt = () => {
        emitOutput(PROMPT);
      };

      const printBanner = () => {
        emitOutput(
          [
            "\u001b[1mHyperbrowser Terminal Surface Demo\u001b[0m",
            `Session ${sessionId} ready at ${new Date().toLocaleTimeString()}.`,
            `Viewport starts at ${size.cols} cols x ${size.rows} rows.`,
            "Type \u001b[36mhelp\u001b[0m for commands.",
          ].join("\r\n") + "\r\n\r\n",
        );
        printPrompt();
      };

      const runCommand = (input) => {
        const command = input.trim();

        if (!command) {
          printPrompt();
          return;
        }

        if (command === "help") {
          emitOutput(
            [
              "Available commands:",
              "  help    show this list",
              "  status  print session metadata",
              "  palette show ANSI colors",
              "  long    fill the viewport to test scrolling",
              "  clear   clear the screen",
              "  exit    close the mock session",
            ].join("\r\n") + "\r\n",
          );
          printPrompt();
          return;
        }

        if (command === "status") {
          emitOutput(
            [
              `sessionId: ${sessionId}`,
              `size: ${size.cols} cols x ${size.rows} rows`,
              `userAgent: ${navigator.userAgent}`,
            ].join("\r\n") + "\r\n",
          );
          printPrompt();
          return;
        }

        if (command === "palette") {
          emitOutput(createPaletteOutput() + "\r\n");
          printPrompt();
          return;
        }

        if (command === "long") {
          emitOutput(createLongOutput() + "\r\n");
          printPrompt();
          return;
        }

        if (command === "clear") {
          emitOutput("\u001bc");
          printPrompt();
          return;
        }

        if (command === "exit") {
          emitOutput("logout\r\n");
          emitExit({ exitCode: 0 });
          return;
        }

        emitOutput(`command not found: ${command}\r\n`);
        printPrompt();
      };

      const handleInput = (value) => {
        const text = typeof value === "string" ? value : decoder.decode(value);

        for (const character of text) {
          if (character === "\r") {
            emitOutput("\r\n");
            const command = lineBuffer;
            lineBuffer = "";
            runCommand(command);
            continue;
          }

          if (character === "\u007f") {
            if (!lineBuffer) {
              continue;
            }

            lineBuffer = lineBuffer.slice(0, -1);
            emitOutput("\b \b");
            continue;
          }

          if (character === "\u0003") {
            lineBuffer = "";
            emitOutput("^C\r\n");
            printPrompt();
            continue;
          }

          if (character === "\u000c") {
            lineBuffer = "";
            emitOutput("\u001bc");
            printPrompt();
            continue;
          }

          if (character < " ") {
            continue;
          }

          lineBuffer += character;
          emitOutput(character);
        }
      };

      const handleAbort = () => {
        closed = true;
      };

      signal.addEventListener("abort", handleAbort, { once: true });

      const bannerTimer = window.setTimeout(printBanner, 120);

      return {
        async writeInput(value) {
          if (!closed) {
            handleInput(value);
          }
        },
        async resize(nextSize) {
          if (closed) {
            return;
          }

          size = nextSize;
          emitOutput(`\r\n[viewport ${size.cols} x ${size.rows}]\r\n`);
          printPrompt();
        },
        async close() {
          window.clearTimeout(bannerTimer);
          signal.removeEventListener("abort", handleAbort);
          closed = true;
        },
        onOutput(listener) {
          outputListeners.add(listener);
          return () => {
            outputListeners.delete(listener);
          };
        },
        onExit(listener) {
          exitListeners.add(listener);
          return () => {
            exitListeners.delete(listener);
          };
        },
      };
    },
  };
}

function ControlLabel({ children }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.45rem",
        fontWeight: 600,
      }}
    >
      {children}
    </label>
  );
}

function TerminalSurfaceDemo({ TerminalSurface, terminalPresets }) {
  const [preset, setPreset] = React.useState("atlas");
  const [appearance, setAppearance] = React.useState("dark");
  const [readOnly, setReadOnly] = React.useState(false);
  const [sessionSeed, setSessionSeed] = React.useState(0);
  const [width, setWidth] = React.useState(100);
  const [height, setHeight] = React.useState(540);
  const [statusMessage, setStatusMessage] = React.useState("No exit yet.");
  const connection = React.useMemo(() => createMockTerminalConnection(), []);

  const presetNames = Object.keys(terminalPresets ?? {});

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
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
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
                padding: "0.6rem",
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
                padding: "0.6rem",
              }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </ControlLabel>
          <ControlLabel>
            Width
            <input
              type="range"
              min={60}
              max={100}
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            />
            <span style={{ fontWeight: 500, opacity: 0.75 }}>
              {width}% of harness width
            </span>
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
            Restart session
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
            Try: help, status, palette, long, clear, exit
          </span>
        </div>
        <p style={{ color: "#475569", fontSize: "0.92rem", margin: 0 }}>
          Latest exit: {statusMessage}
        </p>
      </section>
      <div
        style={{
          margin: "0 auto",
          width: `${width}%`,
          minWidth: "280px",
          height: `${height}px`,
          transition: "width 180ms ease, height 180ms ease",
        }}
      >
        <TerminalSurface
          key={sessionSeed}
          appearance={appearance}
          autoFocus={false}
          connection={connection}
          preset={preset}
          readOnly={readOnly}
          style={{ height: "100%" }}
          title="Generic Terminal Surface"
          onExit={(event) => {
            setStatusMessage(event.error ?? `exit code ${event.exitCode ?? 0}`);
          }}
        />
      </div>
    </div>
  );
}

export const terminalSurfaceScenario = {
  id: "terminal-surface",
  title: "Terminal Surface",
  render({ components }) {
    const TerminalSurface = components.TerminalSurface;
    const terminalPresets = components.terminalPresets;

    if (typeof TerminalSurface !== "function" || !terminalPresets) {
      return (
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e3e8ef",
            borderRadius: "12px",
            boxShadow: "0 12px 24px rgba(17, 34, 51, 0.05)",
            padding: "1rem",
          }}
        >
          <p style={{ margin: 0 }}>
            TerminalSurface exports are missing. Build the package after adding
            terminal exports.
          </p>
        </section>
      );
    }

    return (
      <TerminalSurfaceDemo
        TerminalSurface={TerminalSurface}
        terminalPresets={terminalPresets}
      />
    );
  },
};
