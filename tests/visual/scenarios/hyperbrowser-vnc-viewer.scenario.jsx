import React from "react";

const DEFAULT_CONNECT_URL = "https://connect-us-central-1.hyperbrowser.ai";

function HyperbrowserVncViewerDemo({ HyperbrowserVncViewer }) {
  const [draftToken, setDraftToken] = React.useState(
    "PASTE_SESSION_TOKEN_HERE",
  );
  const [draftConnectUrl, setDraftConnectUrl] =
    React.useState(DEFAULT_CONNECT_URL);
  const [token, setToken] = React.useState("PASTE_SESSION_TOKEN_HERE");
  const [connectUrl, setConnectUrl] = React.useState(DEFAULT_CONNECT_URL);
  const [connectAttempt, setConnectAttempt] = React.useState(0);
  const [disableFocusOnConnect, setDisableFocusOnConnect] =
    React.useState(false);
  const [rewriteCmdAsCtrl, setRewriteCmdAsCtrl] = React.useState(false);
  const [useComputerActionClipboard, setUseComputerActionClipboard] =
    React.useState(false);
  const [debugClipboardFlow, setDebugClipboardFlow] = React.useState(false);
  const [viewOnly, setViewOnly] = React.useState(false);

  const applyConnectionValues = () => {
    setToken(draftToken);
    setConnectUrl(draftConnectUrl);
    setConnectAttempt((previous) => previous + 1);
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section
        style={{
          display: "grid",
          gap: "0.75rem",
          background: "#ffffff",
          border: "1px solid #e3e8ef",
          borderRadius: "12px",
          boxShadow: "0 12px 24px rgba(17, 34, 51, 0.05)",
          padding: "1rem",
        }}
      >
        <label style={{ display: "grid", gap: "0.4rem", fontWeight: 600 }}>
          Token
          <input
            value={draftToken}
            onChange={(event) => setDraftToken(event.target.value)}
            type="text"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              font: "inherit",
              padding: "0.55rem 0.65rem",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.4rem", fontWeight: 600 }}>
          Connect URL
          <input
            value={draftConnectUrl}
            onChange={(event) => setDraftConnectUrl(event.target.value)}
            type="text"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              font: "inherit",
              padding: "0.55rem 0.65rem",
            }}
          />
        </label>
        <button
          type="button"
          onClick={applyConnectionValues}
          style={{
            width: "fit-content",
            padding: "0.55rem 0.85rem",
            borderRadius: "8px",
            border: "1px solid #1d4ed8",
            background: "#2563eb",
            color: "#ffffff",
            cursor: "pointer",
            font: "inherit",
            fontWeight: 600,
          }}
        >
          Connect
        </button>
        <label
          style={{
            alignItems: "center",
            display: "inline-flex",
            gap: "0.5rem",
            width: "fit-content",
          }}
        >
          <input
            checked={viewOnly}
            onChange={(event) => setViewOnly(event.target.checked)}
            type="checkbox"
          />
          View only
        </label>
        <label
          style={{
            alignItems: "center",
            display: "inline-flex",
            gap: "0.5rem",
            width: "fit-content",
          }}
        >
          <input
            checked={disableFocusOnConnect}
            onChange={(event) => setDisableFocusOnConnect(event.target.checked)}
            type="checkbox"
          />
          Disable focus on connect
        </label>
        <label
          style={{
            alignItems: "center",
            display: "inline-flex",
            gap: "0.5rem",
            width: "fit-content",
          }}
        >
          <input
            checked={rewriteCmdAsCtrl}
            onChange={(event) => setRewriteCmdAsCtrl(event.target.checked)}
            type="checkbox"
          />
          Rewrite Cmd as Ctrl
        </label>
        <label
          style={{
            alignItems: "center",
            display: "inline-flex",
            gap: "0.5rem",
            width: "fit-content",
          }}
        >
          <input
            checked={useComputerActionClipboard}
            onChange={(event) =>
              setUseComputerActionClipboard(event.target.checked)
            }
            type="checkbox"
          />
          Use computer actions for copy/paste
        </label>
        <label
          style={{
            alignItems: "center",
            display: "inline-flex",
            gap: "0.5rem",
            width: "fit-content",
          }}
        >
          <input
            checked={debugClipboardFlow}
            onChange={(event) => setDebugClipboardFlow(event.target.checked)}
            type="checkbox"
          />
          Debug clipboard flow
        </label>
        <p style={{ color: "#334155", fontSize: "0.92rem", margin: 0 }}>
          Enter a real token and connect URL, then click Connect.
        </p>
      </section>
      <HyperbrowserVncViewer
        key={`${connectAttempt}:${token}:${connectUrl}`}
        token={token}
        connectUrl={connectUrl}
        disableFocusOnConnect={disableFocusOnConnect}
        rewriteCmdAsCtrl={rewriteCmdAsCtrl}
        useComputerActionClipboard={useComputerActionClipboard}
        debugClipboardFlow={debugClipboardFlow}
        viewOnly={viewOnly}
        height={560}
      />
    </div>
  );
}

export const hyperbrowserVncViewerScenario = {
  id: "hyperbrowser-vnc-viewer",
  title: "Hyperbrowser VNC Viewer",
  render({ components }) {
    const HyperbrowserVncViewer = components.HyperbrowserVncViewer;

    if (typeof HyperbrowserVncViewer !== "function") {
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
            HyperbrowserVncViewer export is missing. Build the package after
            adding component exports.
          </p>
        </section>
      );
    }

    return (
      <HyperbrowserVncViewerDemo
        HyperbrowserVncViewer={HyperbrowserVncViewer}
      />
    );
  },
};
