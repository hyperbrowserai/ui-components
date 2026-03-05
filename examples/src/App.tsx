import React from "react";
import {
  HyperbrowserVncViewer,
  useHyperbrowserHlsPlayback,
  type HyperbrowserVideoSourceType,
} from "@hyperbrowser/ui";

const DEFAULT_CONNECT_URL = "https://connect-us-central-1.hyperbrowser.ai";
const DEFAULT_API_BASE_URL = "https://api.hyperbrowser.ai";

type Panel = "hls" | "vnc";

function HlsPlaybackPanel() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [draftSessionId, setDraftSessionId] = React.useState("PASTE_SESSION_ID_HERE");
  const [draftSessionToken, setDraftSessionToken] = React.useState(
    "PASTE_SESSION_TOKEN_HERE"
  );
  const [draftApiBaseUrl, setDraftApiBaseUrl] = React.useState(DEFAULT_API_BASE_URL);
  const [sourceType, setSourceType] = React.useState<HyperbrowserVideoSourceType>("auto");
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

  return (
    <div className="panel-grid">
      <section className="panel card">
        <h2>HLS Playback Hook</h2>
        <label>
          <span>Session ID</span>
          <input
            value={draftSessionId}
            onChange={(event) => setDraftSessionId(event.target.value)}
            type="text"
          />
        </label>
        <label>
          <span>Session Token</span>
          <input
            value={draftSessionToken}
            onChange={(event) => setDraftSessionToken(event.target.value)}
            type="password"
          />
        </label>
        <label>
          <span>API Base URL</span>
          <input
            value={draftApiBaseUrl}
            onChange={(event) => setDraftApiBaseUrl(event.target.value)}
            type="text"
          />
        </label>
        <label>
          <span>Source Type</span>
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as HyperbrowserVideoSourceType)}
          >
            <option value="auto">auto</option>
            <option value="hls">hls</option>
            <option value="mp4">mp4</option>
          </select>
        </label>
        <div className="row">
          <button type="button" onClick={applyPlaybackValues}>
            Connect
          </button>
          <button type="button" className="secondary" onClick={playback.reloadSource}>
            Reload Source
          </button>
          <label className="inline-toggle">
            <input
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              type="checkbox"
            />
            Enabled
          </label>
        </div>
        <div className="status-block">
          <div>isHlsSource: {String(playback.isHlsSource)}</div>
          <div>usingNativeHls: {String(playback.usingNativeHls)}</div>
          <div>lastEvent: {lastEvent}</div>
          <div>connectAttempt: {connectAttempt}</div>
          {playback.sourceError ? (
            <div className="error-text">sourceError: {playback.sourceError}</div>
          ) : null}
        </div>
      </section>
      <section className="video-card">
        <video
          key={`${connectAttempt}:${sessionId}:${apiBaseUrl}:${sourceType}:${enabled}`}
          ref={videoRef}
          controls
          playsInline
          preload="auto"
        />
      </section>
    </div>
  );
}

function VncPanel() {
  const [draftToken, setDraftToken] = React.useState("PASTE_SESSION_TOKEN_HERE");
  const [draftConnectUrl, setDraftConnectUrl] = React.useState(DEFAULT_CONNECT_URL);
  const [token, setToken] = React.useState("PASTE_SESSION_TOKEN_HERE");
  const [connectUrl, setConnectUrl] = React.useState(DEFAULT_CONNECT_URL);
  const [connectAttempt, setConnectAttempt] = React.useState(0);
  const [disableFocusOnConnect, setDisableFocusOnConnect] = React.useState(false);
  const [rewriteCmdAsCtrl, setRewriteCmdAsCtrl] = React.useState(false);
  const [useComputerActionClipboard, setUseComputerActionClipboard] = React.useState(false);
  const [debugClipboardFlow, setDebugClipboardFlow] = React.useState(false);
  const [viewOnly, setViewOnly] = React.useState(false);

  const applyConnectionValues = () => {
    setToken(draftToken);
    setConnectUrl(draftConnectUrl);
    setConnectAttempt((value) => value + 1);
  };

  return (
    <div className="panel-grid">
      <section className="panel card">
        <h2>VNC Viewer</h2>
        <label>
          <span>Session Token</span>
          <input
            value={draftToken}
            onChange={(event) => setDraftToken(event.target.value)}
            type="text"
          />
        </label>
        <label>
          <span>Connect URL</span>
          <input
            value={draftConnectUrl}
            onChange={(event) => setDraftConnectUrl(event.target.value)}
            type="text"
          />
        </label>
        <button type="button" onClick={applyConnectionValues}>
          Connect
        </button>
        <label className="inline-toggle">
          <input
            checked={viewOnly}
            onChange={(event) => setViewOnly(event.target.checked)}
            type="checkbox"
          />
          View only
        </label>
        <label className="inline-toggle">
          <input
            checked={disableFocusOnConnect}
            onChange={(event) => setDisableFocusOnConnect(event.target.checked)}
            type="checkbox"
          />
          Disable focus on connect
        </label>
        <label className="inline-toggle">
          <input
            checked={rewriteCmdAsCtrl}
            onChange={(event) => setRewriteCmdAsCtrl(event.target.checked)}
            type="checkbox"
          />
          Rewrite Cmd as Ctrl
        </label>
        <label className="inline-toggle">
          <input
            checked={useComputerActionClipboard}
            onChange={(event) => setUseComputerActionClipboard(event.target.checked)}
            type="checkbox"
          />
          Use computer actions for copy/paste
        </label>
        <label className="inline-toggle">
          <input
            checked={debugClipboardFlow}
            onChange={(event) => setDebugClipboardFlow(event.target.checked)}
            type="checkbox"
          />
          Debug clipboard flow
        </label>
      </section>
      <section className="vnc-card">
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
      </section>
    </div>
  );
}

export function App() {
  const [panel, setPanel] = React.useState<Panel>("hls");

  return (
    <main>
      <header>
        <h1>Hyperbrowser UI SDK Smoke App</h1>
        <p>Reuses the SDK visual smoke scenarios for quick manual validation.</p>
      </header>

      <div className="tab-row">
        <button type="button" onClick={() => setPanel("hls")} className={panel === "hls" ? "active" : ""}>
          HLS Playback
        </button>
        <button type="button" onClick={() => setPanel("vnc")} className={panel === "vnc" ? "active" : ""}>
          VNC Viewer
        </button>
      </div>

      {panel === "hls" ? <HlsPlaybackPanel /> : <VncPanel />}
    </main>
  );
}
