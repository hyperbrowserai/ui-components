import React from 'react';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001/api';
const DEFAULT_COMMAND = 'bash';

function Card({ children }) {
  return React.createElement(
    'section',
    {
      style: {
        display: 'grid',
        gap: '0.9rem',
        background: '#ffffff',
        border: '1px solid #e3e8ef',
        borderRadius: '14px',
        boxShadow: '0 12px 24px rgba(17, 34, 51, 0.05)',
        padding: '1rem'
      }
    },
    children
  );
}

function ControlLabel({ children }) {
  return React.createElement(
    'label',
    {
      style: {
        display: 'grid',
        gap: '0.4rem',
        fontWeight: 600
      }
    },
    children
  );
}

function HyperbrowserTerminalDemo({ HyperbrowserTerminal, terminalThemePresets }) {
  const [mode, setMode] = React.useState('api');
  const [theme, setTheme] = React.useState('atlas');
  const [sandboxId, setSandboxId] = React.useState('');
  const [apiBaseUrl, setApiBaseUrl] = React.useState(DEFAULT_API_BASE_URL);
  const [apiToken, setApiToken] = React.useState('');
  const [runtimeBaseUrl, setRuntimeBaseUrl] = React.useState('');
  const [bootstrapUrl, setBootstrapUrl] = React.useState('');
  const [command, setCommand] = React.useState(DEFAULT_COMMAND);
  const [cwd, setCwd] = React.useState('');
  const [closeBehavior, setCloseBehavior] = React.useState('disconnect');
  const [launchCount, setLaunchCount] = React.useState(0);
  const [latestEvent, setLatestEvent] = React.useState('Idle.');

  const activeConfig = React.useMemo(() => {
    if (launchCount === 0) {
      return null;
    }

    if (mode === 'api') {
      return {
        apiBaseUrl,
        apiHeaders: apiToken
          ? {
              Authorization: `Bearer ${apiToken}`
            }
          : undefined,
        closeBehavior,
        command,
        cwd: cwd || undefined,
        sandboxId
      };
    }

    return {
      bootstrapUrl,
      closeBehavior,
      command,
      cwd: cwd || undefined,
      runtimeBaseUrl
    };
  }, [
    apiBaseUrl,
    apiToken,
    bootstrapUrl,
    closeBehavior,
    command,
    cwd,
    launchCount,
    mode,
    runtimeBaseUrl,
    sandboxId
  ]);

  const themeNames = Object.keys(terminalThemePresets ?? {});
  const canLaunch =
    mode === 'api'
      ? Boolean(sandboxId.trim() && apiBaseUrl.trim())
      : Boolean(runtimeBaseUrl.trim() && bootstrapUrl.trim());

  return React.createElement(
    'div',
    { style: { display: 'grid', gap: '1rem' } },
    React.createElement(
      Card,
      null,
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gap: '0.9rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          }
        },
        React.createElement(
          ControlLabel,
          null,
          'Connection mode',
          React.createElement(
            'select',
            {
              value: mode,
              onChange: (event) => setMode(event.target.value),
              style: {
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                font: 'inherit',
                padding: '0.6rem'
              }
            },
            React.createElement('option', { value: 'api' }, 'Control plane API'),
            React.createElement('option', { value: 'runtime' }, 'Direct runtime bootstrap')
          )
        ),
        React.createElement(
          ControlLabel,
          null,
          'Theme',
          React.createElement(
            'select',
            {
              value: theme,
              onChange: (event) => setTheme(event.target.value),
              style: {
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                font: 'inherit',
                padding: '0.6rem'
              }
            },
            themeNames.map((themeName) =>
              React.createElement(
                'option',
                { key: themeName, value: themeName },
                terminalThemePresets[themeName].label
              )
            )
          )
        ),
        React.createElement(
          ControlLabel,
          null,
          'Close behavior',
          React.createElement(
            'select',
            {
              value: closeBehavior,
              onChange: (event) => setCloseBehavior(event.target.value),
              style: {
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                font: 'inherit',
                padding: '0.6rem'
              }
            },
            React.createElement('option', { value: 'disconnect' }, 'Disconnect only'),
            React.createElement('option', { value: 'terminate' }, 'Terminate PTY on unmount')
          )
        )
      ),
      mode === 'api'
        ? React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gap: '0.9rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
              }
            },
            React.createElement(
              ControlLabel,
              null,
              'API base URL',
              React.createElement('input', {
                value: apiBaseUrl,
                onChange: (event) => setApiBaseUrl(event.target.value),
                placeholder: 'http://127.0.0.1:3001/api',
                style: {
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  font: 'inherit',
                  padding: '0.65rem'
                },
                type: 'text'
              })
            ),
            React.createElement(
              ControlLabel,
              null,
              'Sandbox ID',
              React.createElement('input', {
                value: sandboxId,
                onChange: (event) => setSandboxId(event.target.value),
                placeholder: 'sandbox UUID',
                style: {
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  font: 'inherit',
                  padding: '0.65rem'
                },
                type: 'text'
              })
            ),
            React.createElement(
              ControlLabel,
              null,
              'API bearer token',
              React.createElement('input', {
                value: apiToken,
                onChange: (event) => setApiToken(event.target.value),
                placeholder: 'Optional if your backend auth uses cookies',
                style: {
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  font: 'inherit',
                  padding: '0.65rem'
                },
                type: 'text'
              })
            )
          )
        : React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gap: '0.9rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
              }
            },
            React.createElement(
              ControlLabel,
              null,
              'Runtime base URL',
              React.createElement('input', {
                value: runtimeBaseUrl,
                onChange: (event) => setRuntimeBaseUrl(event.target.value),
                placeholder: 'https://<session>.<region>.hyperbrowser.run',
                style: {
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  font: 'inherit',
                  padding: '0.65rem'
                },
                type: 'text'
              })
            ),
            React.createElement(
              ControlLabel,
              null,
              'Bootstrap URL',
              React.createElement('input', {
                value: bootstrapUrl,
                onChange: (event) => setBootstrapUrl(event.target.value),
                placeholder: 'https://<session>.../_hb/runtime-auth?grant=...',
                style: {
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  font: 'inherit',
                  padding: '0.65rem'
                },
                type: 'text'
              })
            )
          ),
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gap: '0.9rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          }
        },
        React.createElement(
          ControlLabel,
          null,
          'Command',
          React.createElement('input', {
            value: command,
            onChange: (event) => setCommand(event.target.value),
            placeholder: DEFAULT_COMMAND,
            style: {
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              font: 'inherit',
              padding: '0.65rem'
            },
            type: 'text'
          })
        ),
        React.createElement(
          ControlLabel,
          null,
          'Working directory',
          React.createElement('input', {
            value: cwd,
            onChange: (event) => setCwd(event.target.value),
            placeholder: '/home/hyperuser',
            style: {
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              font: 'inherit',
              padding: '0.65rem'
            },
            type: 'text'
          })
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }
        },
        React.createElement(
          'button',
          {
            type: 'button',
            disabled: !canLaunch,
            onClick: () => {
              setLatestEvent('Connecting...');
              setLaunchCount((value) => value + 1);
            },
            style: {
              border: '1px solid #0f766e',
              borderRadius: '999px',
              background: canLaunch ? '#0f766e' : '#94a3b8',
              color: '#ffffff',
              cursor: canLaunch ? 'pointer' : 'not-allowed',
              font: 'inherit',
              fontWeight: 600,
              padding: '0.65rem 0.95rem'
            }
          },
          launchCount > 0 ? 'Reconnect terminal' : 'Launch terminal'
        ),
        React.createElement(
          'span',
          { style: { color: '#334155', fontSize: '0.92rem' } },
          'API mode calls `/sandbox/:id/runtime/browser-auth` directly. Runtime mode skips that step and uses a precomputed bootstrap URL.'
        )
      ),
      React.createElement(
        'p',
        { style: { color: '#475569', fontSize: '0.92rem', margin: 0 } },
        `Latest event: ${latestEvent}`
      )
    ),
    activeConfig
      ? React.createElement(
          'div',
          {
            style: {
              minHeight: '580px'
            }
          },
          React.createElement(HyperbrowserTerminal, {
            ...activeConfig,
            autoFocus: false,
            key: `${launchCount}:${mode}:${theme}`,
            onConnectionError: (message) => setLatestEvent(`Connection error: ${message}`),
            onExit: (event) =>
              setLatestEvent(
                event.error
                  ? `Exited with error: ${event.error}`
                  : `Exited with code ${event.exitCode ?? 0}`
              ),
            style: { height: '100%' },
            theme,
            title: 'Hyperbrowser PTY Terminal'
          })
        )
      : React.createElement(
          Card,
          null,
          React.createElement(
            'p',
            { style: { margin: 0 } },
            'Enter runtime details above and launch the terminal to exercise the browser-auth bootstrap and PTY websocket flow.'
          )
        )
  );
}

export const hyperbrowserTerminalScenario = {
  id: 'hyperbrowser-terminal',
  title: 'Hyperbrowser Terminal',
  render({ components }) {
    const HyperbrowserTerminal = components.HyperbrowserTerminal;
    const terminalThemePresets = components.terminalThemePresets;

    if (typeof HyperbrowserTerminal !== 'function' || !terminalThemePresets) {
      return React.createElement(
        Card,
        null,
        React.createElement(
          'p',
          { style: { margin: 0 } },
          'HyperbrowserTerminal export is missing. Build the package after adding the terminal wrapper.'
        )
      );
    }

    return React.createElement(HyperbrowserTerminalDemo, {
      HyperbrowserTerminal,
      terminalThemePresets
    });
  }
};
