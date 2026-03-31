import React from "react";

const DEFAULT_API_BASE_URL = "https://api.hyperbrowser.ai";

function HyperbrowserHlsPlaybackDemo({ useHyperbrowserHlsPlayback }) {
  const videoRef = React.useRef(null);
  const [draftSessionId, setDraftSessionId] = React.useState("");
  const [draftSessionToken, setDraftSessionToken] = React.useState("");
  const [draftApiBaseUrl, setDraftApiBaseUrl] =
    React.useState(DEFAULT_API_BASE_URL);
  const [sourceType, setSourceType] = React.useState("auto");
  const [enabled, setEnabled] = React.useState(true);
  const [sessionId, setSessionId] = React.useState("");
  const [sessionToken, setSessionToken] = React.useState("");
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
          Session ID
          <input
            autoComplete="off"
            placeholder="Paste session ID"
            value={draftSessionId}
            onChange={(event) => setDraftSessionId(event.target.value)}
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
          Session Token
          <input
            autoComplete="off"
            placeholder="Paste session token"
            value={draftSessionToken}
            onChange={(event) => setDraftSessionToken(event.target.value)}
            type="password"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              font: "inherit",
              padding: "0.55rem 0.65rem",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.4rem", fontWeight: 600 }}>
          API Base URL
          <input
            value={draftApiBaseUrl}
            onChange={(event) => setDraftApiBaseUrl(event.target.value)}
            type="text"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              font: "inherit",
              padding: "0.55rem 0.65rem",
            }}
          />
        </label>
        <label
          style={{
            display: "grid",
            gap: "0.4rem",
            fontWeight: 600,
            maxWidth: "220px",
          }}
        >
          Source Type
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value)}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              font: "inherit",
              padding: "0.55rem 0.65rem",
            }}
          >
            <option value="auto">auto</option>
            <option value="hls">hls</option>
            <option value="mp4">mp4</option>
          </select>
        </label>
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={applyPlaybackValues}
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
          <button
            type="button"
            onClick={playback.reloadSource}
            style={{
              width: "fit-content",
              padding: "0.55rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid #0f766e",
              background: "#0d9488",
              color: "#ffffff",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 600,
            }}
          >
            Reload Source
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
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              type="checkbox"
            />
            Enabled
          </label>
        </div>
        <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.5 }}>
          <div>{`isHlsSource: ${String(playback.isHlsSource)}`}</div>
          <div>{`usingNativeHls: ${String(playback.usingNativeHls)}`}</div>
          <div>{`lastEvent: ${lastEvent}`}</div>
          <div>{`connectAttempt: ${connectAttempt}`}</div>
          {playback.sourceError ? (
            <div style={{ color: "#b91c1c", fontWeight: 600 }}>
              {`sourceError: ${playback.sourceError}`}
            </div>
          ) : null}
        </div>
      </section>
      <section
        style={{
          background: "#0f172a",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #1e293b",
        }}
      >
        <video
          key={`${connectAttempt}:${sessionId}:${apiBaseUrl}:${sourceType}:${enabled}`}
          ref={videoRef}
          controls={true}
          playsInline={true}
          preload="auto"
          style={{
            width: "100%",
            minHeight: "320px",
            display: "block",
            background: "#020617",
          }}
        />
      </section>
    </div>
  );
}

export const hyperbrowserHlsPlaybackScenario = {
  id: "hyperbrowser-hls-playback",
  title: "Hyperbrowser HLS Playback Hook",
  render({ components }) {
    const useHyperbrowserHlsPlayback = components.useHyperbrowserHlsPlayback;
    if (typeof useHyperbrowserHlsPlayback !== "function") {
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
            useHyperbrowserHlsPlayback export is missing. Build the package
            after adding exports.
          </p>
        </section>
      );
    }

    return (
      <HyperbrowserHlsPlaybackDemo
        useHyperbrowserHlsPlayback={useHyperbrowserHlsPlayback}
      />
    );
  },
};
