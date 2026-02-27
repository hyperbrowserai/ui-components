import React from "react";

const DEFAULT_API_BASE_URL = "https://api.hyperbrowser.ai";

function HyperbrowserHlsPlaybackDemo({ useHyperbrowserHlsPlayback }) {
  const videoRef = React.useRef(null);
  const [draftSessionId, setDraftSessionId] = React.useState("PASTE_SESSION_ID_HERE");
  const [draftSessionToken, setDraftSessionToken] = React.useState("PASTE_SESSION_TOKEN_HERE");
  const [draftApiBaseUrl, setDraftApiBaseUrl] = React.useState(DEFAULT_API_BASE_URL);
  const [sourceType, setSourceType] = React.useState("auto");
  const [enabled, setEnabled] = React.useState(true);
  const [sessionId, setSessionId] = React.useState("PASTE_SESSION_ID_HERE");
  const [sessionToken, setSessionToken] = React.useState("PASTE_SESSION_TOKEN_HERE");
  const [apiBaseUrl, setApiBaseUrl] = React.useState(DEFAULT_API_BASE_URL);
  const [lastEvent, setLastEvent] = React.useState("idle");
  const [connectAttempt, setConnectAttempt] = React.useState(0);

  const playback = useHyperbrowserHlsPlayback({
    videoRef,
    enabled,
    sourceType,
    sessionId,
    sessionToken,
    apiBaseUrl,
    onLoadedData: () => setLastEvent("loadeddata"),
    onVideoError: () => setLastEvent("video-error"),
    onFatalHlsError: () => setLastEvent("fatal-hls-error"),
    onUnsupportedHls: () => setLastEvent("unsupported-hls"),
  });

  const applyPlaybackValues = () => {
    setSessionId(draftSessionId);
    setSessionToken(draftSessionToken);
    setApiBaseUrl(draftApiBaseUrl);
    setLastEvent("connecting");
    setConnectAttempt((value) => value + 1);
  };

  return React.createElement(
    "div",
    { style: { display: "grid", gap: "1rem" } },
    React.createElement(
      "section",
      {
        style: {
          display: "grid",
          gap: "0.75rem",
          background: "#ffffff",
          border: "1px solid #e3e8ef",
          borderRadius: "12px",
          boxShadow: "0 12px 24px rgba(17, 34, 51, 0.05)",
          padding: "1rem",
        },
      },
      React.createElement(
        "label",
        { style: { display: "grid", gap: "0.4rem", fontWeight: 600 } },
        "Session ID",
        React.createElement("input", {
          value: draftSessionId,
          onChange: (event) => setDraftSessionId(event.target.value),
          type: "text",
          style: {
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            font: "inherit",
            padding: "0.55rem 0.65rem",
          },
        })
      ),
      React.createElement(
        "label",
        { style: { display: "grid", gap: "0.4rem", fontWeight: 600 } },
        "Session Token",
        React.createElement("input", {
          value: draftSessionToken,
          onChange: (event) => setDraftSessionToken(event.target.value),
          type: "password",
          style: {
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            font: "inherit",
            padding: "0.55rem 0.65rem",
          },
        })
      ),
      React.createElement(
        "label",
        { style: { display: "grid", gap: "0.4rem", fontWeight: 600 } },
        "API Base URL",
        React.createElement("input", {
          value: draftApiBaseUrl,
          onChange: (event) => setDraftApiBaseUrl(event.target.value),
          type: "text",
          style: {
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            font: "inherit",
            padding: "0.55rem 0.65rem",
          },
        })
      ),
      React.createElement(
        "label",
        { style: { display: "grid", gap: "0.4rem", fontWeight: 600, maxWidth: "220px" } },
        "Source Type",
        React.createElement(
          "select",
          {
            value: sourceType,
            onChange: (event) => setSourceType(event.target.value),
            style: {
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              font: "inherit",
              padding: "0.55rem 0.65rem",
            },
          },
          React.createElement("option", { value: "auto" }, "auto"),
          React.createElement("option", { value: "hls" }, "hls"),
          React.createElement("option", { value: "mp4" }, "mp4")
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" } },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: applyPlaybackValues,
            style: {
              width: "fit-content",
              padding: "0.55rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid #1d4ed8",
              background: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 600,
            },
          },
          "Connect"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: playback.reloadSource,
            style: {
              width: "fit-content",
              padding: "0.55rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid #0f766e",
              background: "#0d9488",
              color: "#ffffff",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 600,
            },
          },
          "Reload Source"
        ),
        React.createElement(
          "label",
          {
            style: {
              alignItems: "center",
              display: "inline-flex",
              gap: "0.5rem",
              width: "fit-content",
            },
          },
          React.createElement("input", {
            checked: enabled,
            onChange: (event) => setEnabled(event.target.checked),
            type: "checkbox",
          }),
          "Enabled"
        )
      ),
      React.createElement(
        "div",
        { style: { fontSize: "0.9rem", color: "#334155", lineHeight: 1.5 } },
        React.createElement("div", null, `isHlsSource: ${String(playback.isHlsSource)}`),
        React.createElement("div", null, `usingNativeHls: ${String(playback.usingNativeHls)}`),
        React.createElement("div", null, `lastEvent: ${lastEvent}`),
        React.createElement("div", null, `connectAttempt: ${connectAttempt}`),
        playback.sourceError
          ? React.createElement(
              "div",
              { style: { color: "#b91c1c", fontWeight: 600 } },
              `sourceError: ${playback.sourceError}`
            )
          : null
      )
    ),
    React.createElement(
      "section",
      {
        style: {
          background: "#0f172a",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #1e293b",
        },
      },
      React.createElement("video", {
        key: `${connectAttempt}:${sessionId}:${apiBaseUrl}:${sourceType}:${enabled}`,
        ref: videoRef,
        controls: true,
        playsInline: true,
        preload: "auto",
        style: {
          width: "100%",
          minHeight: "320px",
          display: "block",
          background: "#020617",
        },
      })
    )
  );
}

export const hyperbrowserHlsPlaybackScenario = {
  id: "hyperbrowser-hls-playback",
  title: "Hyperbrowser HLS Playback Hook",
  render({ components }) {
    const useHyperbrowserHlsPlayback = components.useHyperbrowserHlsPlayback;
    if (typeof useHyperbrowserHlsPlayback !== "function") {
      return React.createElement(
        "section",
        {
          style: {
            background: "#ffffff",
            border: "1px solid #e3e8ef",
            borderRadius: "12px",
            boxShadow: "0 12px 24px rgba(17, 34, 51, 0.05)",
            padding: "1rem",
          },
        },
        React.createElement(
          "p",
          { style: { margin: 0 } },
          "useHyperbrowserHlsPlayback export is missing. Build the package after adding exports."
        )
      );
    }

    return React.createElement(HyperbrowserHlsPlaybackDemo, {
      useHyperbrowserHlsPlayback,
    });
  },
};
