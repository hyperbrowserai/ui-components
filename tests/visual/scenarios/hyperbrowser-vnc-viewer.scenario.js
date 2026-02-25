import React from 'react';

const DEFAULT_CONNECT_URL = 'https://connect-us-central-1.hyperbrowser.ai';

function HyperbrowserVncViewerDemo({ HyperbrowserVncViewer }) {
  const [draftToken, setDraftToken] = React.useState('PASTE_SESSION_TOKEN_HERE');
  const [draftConnectUrl, setDraftConnectUrl] = React.useState(DEFAULT_CONNECT_URL);
  const [token, setToken] = React.useState('PASTE_SESSION_TOKEN_HERE');
  const [connectUrl, setConnectUrl] = React.useState(DEFAULT_CONNECT_URL);
  const [connectAttempt, setConnectAttempt] = React.useState(0);
  const [disableFocusOnConnect, setDisableFocusOnConnect] = React.useState(false);
  const [viewOnly, setViewOnly] = React.useState(false);

  const applyConnectionValues = () => {
    setToken(draftToken);
    setConnectUrl(draftConnectUrl);
    setConnectAttempt((previous) => previous + 1);
  };

  return React.createElement(
    'div',
    { style: { display: 'grid', gap: '1rem' } },
    React.createElement(
      'section',
      {
        style: {
          display: 'grid',
          gap: '0.75rem',
          background: '#ffffff',
          border: '1px solid #e3e8ef',
          borderRadius: '12px',
          boxShadow: '0 12px 24px rgba(17, 34, 51, 0.05)',
          padding: '1rem'
        }
      },
      React.createElement(
        'label',
        { style: { display: 'grid', gap: '0.4rem', fontWeight: 600 } },
        'Token',
        React.createElement('input', {
          value: draftToken,
          onChange: (event) => setDraftToken(event.target.value),
          type: 'text',
          style: {
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            font: 'inherit',
            padding: '0.55rem 0.65rem'
          }
        })
      ),
      React.createElement(
        'label',
        { style: { display: 'grid', gap: '0.4rem', fontWeight: 600 } },
        'Connect URL',
        React.createElement('input', {
          value: draftConnectUrl,
          onChange: (event) => setDraftConnectUrl(event.target.value),
          type: 'text',
          style: {
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            font: 'inherit',
            padding: '0.55rem 0.65rem'
          }
        })
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: applyConnectionValues,
          style: {
            width: 'fit-content',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #1d4ed8',
            background: '#2563eb',
            color: '#ffffff',
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: 600
          }
        },
        'Connect'
      ),
      React.createElement(
        'label',
        {
          style: {
            alignItems: 'center',
            display: 'inline-flex',
            gap: '0.5rem',
            width: 'fit-content'
          }
        },
        React.createElement('input', {
          checked: viewOnly,
          onChange: (event) => setViewOnly(event.target.checked),
          type: 'checkbox'
        }),
        'View only'
      ),
      React.createElement(
        'label',
        {
          style: {
            alignItems: 'center',
            display: 'inline-flex',
            gap: '0.5rem',
            width: 'fit-content'
          }
        },
        React.createElement('input', {
          checked: disableFocusOnConnect,
          onChange: (event) => setDisableFocusOnConnect(event.target.checked),
          type: 'checkbox'
        }),
        'Disable focus on connect'
      ),
      React.createElement(
        'p',
        { style: { color: '#334155', fontSize: '0.92rem', margin: 0 } },
        'Enter a real token and connect URL, then click Connect.'
      )
    ),
    React.createElement(HyperbrowserVncViewer, {
      key: `${connectAttempt}:${token}:${connectUrl}`,
      token,
      connectUrl,
      disableFocusOnConnect,
      viewOnly,
      height: 560
    })
  );
}

export const hyperbrowserVncViewerScenario = {
  id: 'hyperbrowser-vnc-viewer',
  title: 'Hyperbrowser VNC Viewer',
  render({ components }) {
    const HyperbrowserVncViewer = components.HyperbrowserVncViewer;

    if (typeof HyperbrowserVncViewer !== 'function') {
      return React.createElement(
        'section',
        {
          style: {
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            boxShadow: '0 12px 24px rgba(17, 34, 51, 0.05)',
            padding: '1rem'
          }
        },
        React.createElement(
          'p',
          { style: { margin: 0 } },
          'HyperbrowserVncViewer export is missing. Build the package after adding component exports.'
        )
      );
    }

    return React.createElement(HyperbrowserVncViewerDemo, {
      HyperbrowserVncViewer
    });
  }
};
