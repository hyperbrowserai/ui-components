import React from 'react';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';
const DEFAULT_COMMAND = 'bash';

const inputStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  font: 'inherit',
  padding: '0.65rem'
};

const buttonStyle = {
  borderRadius: '999px',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 600,
  padding: '0.65rem 0.95rem'
};

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
  const [appliedConfig, setAppliedConfig] = React.useState(null);
  const [launchCount, setLaunchCount] = React.useState(0);
  const [latestEvent, setLatestEvent] = React.useState('Idle.');

  React.useEffect(() => {
    setApiBaseUrl(DEFAULT_API_BASE_URL);
  }, []);

  const activeConfig = React.useMemo(() => {
    if (!appliedConfig) {
      return null;
    }

    if (appliedConfig.mode === 'api') {
      return {
        apiBaseUrl: appliedConfig.apiBaseUrl,
        apiHeaders: appliedConfig.apiToken
          ? {
              Authorization: `Bearer ${appliedConfig.apiToken}`
            }
          : undefined,
        closeBehavior: appliedConfig.closeBehavior,
        command: appliedConfig.command,
        cwd: appliedConfig.cwd || undefined,
        sandboxId: appliedConfig.sandboxId
      };
    }

    return {
      bootstrapUrl: appliedConfig.bootstrapUrl,
      closeBehavior: appliedConfig.closeBehavior,
      command: appliedConfig.command,
      cwd: appliedConfig.cwd || undefined,
      runtimeBaseUrl: appliedConfig.runtimeBaseUrl
    };
  }, [appliedConfig]);

  const themeNames = Object.keys(terminalThemePresets ?? {});
  const canLaunch =
    mode === 'api'
      ? Boolean(sandboxId.trim() && apiBaseUrl.trim())
      : Boolean(runtimeBaseUrl.trim() && bootstrapUrl.trim());

  const applyConnectionValues = () => {
    if (!canLaunch) {
      return;
    }

    setLatestEvent('Connecting...');
    setAppliedConfig({
      apiBaseUrl: apiBaseUrl.trim(),
      apiToken: apiToken.trim(),
      bootstrapUrl: bootstrapUrl.trim(),
      closeBehavior,
      command: command.trim() || DEFAULT_COMMAND,
      cwd: cwd.trim(),
      mode,
      runtimeBaseUrl: runtimeBaseUrl.trim(),
      sandboxId: sandboxId.trim(),
      theme
    });
    setLaunchCount((value) => value + 1);
  };

  const resetForm = () => {
    setMode('api');
    setTheme('atlas');
    setSandboxId('');
    setApiBaseUrl(DEFAULT_API_BASE_URL);
    setApiToken('');
    setRuntimeBaseUrl('');
    setBootstrapUrl('');
    setCommand(DEFAULT_COMMAND);
    setCwd('');
    setCloseBehavior('disconnect');
    setAppliedConfig(null);
    setLaunchCount(0);
    setLatestEvent('Idle.');
  };

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
              style: inputStyle
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
              style: inputStyle
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
              style: inputStyle
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
                autoComplete: 'off',
                value: apiBaseUrl,
                onChange: (event) => setApiBaseUrl(event.target.value),
                placeholder: 'http://localhost:8080/api',
                style: inputStyle,
                type: 'text'
              })
            ),
            React.createElement(
              ControlLabel,
              null,
              'Sandbox ID',
              React.createElement('input', {
                autoComplete: 'off',
                value: sandboxId,
                onChange: (event) => setSandboxId(event.target.value),
                placeholder: 'sandbox UUID',
                style: inputStyle,
                type: 'text'
              })
            ),
            React.createElement(
              ControlLabel,
              null,
              'API bearer token',
              React.createElement('input', {
                autoComplete: 'off',
                value: apiToken,
                onChange: (event) => setApiToken(event.target.value),
                placeholder: 'Optional if your backend auth uses cookies',
                style: inputStyle,
                type: 'password'
              })
            ),
            React.createElement(
              'div',
              {
                style: {
                  alignItems: 'end',
                  display: 'flex',
                  gap: '0.6rem'
                }
              },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    setMode('api');
                    setApiBaseUrl(DEFAULT_API_BASE_URL);
                  },
                  style: {
                    ...buttonStyle,
                    background: '#e2e8f0',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a'
                  }
                },
                'Reset to default API'
              )
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
                autoComplete: 'off',
                value: runtimeBaseUrl,
                onChange: (event) => setRuntimeBaseUrl(event.target.value),
                placeholder: 'https://<session>.<region>.hyperbrowser.run',
                style: inputStyle,
                type: 'text'
              })
            ),
            React.createElement(
              ControlLabel,
              null,
              'Bootstrap URL',
              React.createElement('input', {
                autoComplete: 'off',
                value: bootstrapUrl,
                onChange: (event) => setBootstrapUrl(event.target.value),
                placeholder: 'https://<session>.../_hb/runtime-auth?grant=...',
                style: inputStyle,
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
            autoComplete: 'off',
            value: command,
            onChange: (event) => setCommand(event.target.value),
            placeholder: DEFAULT_COMMAND,
            style: inputStyle,
            type: 'text'
          })
        ),
        React.createElement(
          ControlLabel,
          null,
          'Working directory',
          React.createElement('input', {
            autoComplete: 'off',
            value: cwd,
            onChange: (event) => setCwd(event.target.value),
            placeholder: '/home/hyperuser',
            style: inputStyle,
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
            onClick: applyConnectionValues,
            style: {
              ...buttonStyle,
              border: '1px solid #0f766e',
              background: canLaunch ? '#0f766e' : '#94a3b8',
              color: '#ffffff',
              cursor: canLaunch ? 'pointer' : 'not-allowed'
            }
          },
          launchCount > 0 ? 'Reconnect terminal' : 'Launch terminal'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: resetForm,
            style: {
              ...buttonStyle,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a'
            }
          },
          'Reset form'
        ),
        React.createElement(
          'span',
          { style: { color: '#334155', fontSize: '0.92rem' } },
          'API mode calls `/sandbox/:id/runtime/browser-auth` directly. Runtime mode only needs a live sandbox runtime plus a precomputed bootstrap URL.'
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            color: '#334155',
            display: 'grid',
            gap: '0.45rem',
            padding: '0.85rem 1rem'
          }
        },
        React.createElement(
          'strong',
          null,
          appliedConfig ? 'Applied connection' : 'Draft only'
        ),
        React.createElement(
          'div',
          {
            style: {
              color: '#0f172a',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }
          },
          `Compiled default API base: ${DEFAULT_API_BASE_URL}`
        ),
        React.createElement(
          'div',
          null,
          appliedConfig
            ? appliedConfig.mode === 'api'
              ? `API ${appliedConfig.apiBaseUrl} -> sandbox ${appliedConfig.sandboxId}`
              : `Runtime ${appliedConfig.runtimeBaseUrl}`
            : 'Edit the fields above, then click Launch terminal to apply a stable connection snapshot.'
        ),
        React.createElement(
          'div',
          { style: { fontSize: '0.92rem' } },
          mode === 'api'
            ? 'API mode needs a reachable control-plane API and auth via bearer token or browser cookies.'
            : 'Runtime mode skips the control-plane API. Paste the runtime base URL and bootstrap URL from an already-running sandbox.'
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
            key: `${launchCount}:${appliedConfig.theme}`,
            onConnectionError: (message) => setLatestEvent(`Connection error: ${message}`),
            onExit: (event) =>
              setLatestEvent(
                event.error
                  ? `Exited with error: ${event.error}`
                  : `Exited with code ${event.exitCode ?? 0}`
            ),
            style: { height: '100%' },
            theme: appliedConfig.theme,
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
