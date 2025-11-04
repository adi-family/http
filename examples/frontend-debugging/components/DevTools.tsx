/**
 * Development Tools Component
 * Toggle mocks and scenarios in the browser
 */

import { useState } from 'react';
import { isUsingMocks, getCurrentScenario } from '../api/client';

export function DevTools() {
  const [useMocks, setUseMocks] = useState(
    localStorage.getItem('useMocks') !== 'false'
  );
  const [scenario, setScenario] = useState(
    localStorage.getItem('mockScenario') || 'default'
  );
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show in production
  if (import.meta.env.PROD) {
    return null;
  }

  const toggleMocks = () => {
    const newValue = !useMocks;
    localStorage.setItem('useMocks', String(newValue));
    setUseMocks(newValue);
    window.location.reload();
  };

  const changeScenario = (newScenario: string) => {
    localStorage.setItem('mockScenario', newScenario);
    setScenario(newScenario);
    window.location.reload();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
      }}
    >
      {isExpanded ? (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            color: 'white',
            borderRadius: 8,
            padding: 16,
            minWidth: 250,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: 14 }}>
              🔧 Dev Tools
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={useMocks}
                onChange={toggleMocks}
                style={{ marginRight: 8 }}
              />
              Use Mock Data
            </label>
            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {isUsingMocks ? '✅ Currently using mocks' : '❌ Using real API'}
            </div>
          </div>

          {useMocks && (
            <>
              <div style={{ marginBottom: 4, fontWeight: 'bold' }}>
                Scenario:
              </div>
              <select
                value={scenario}
                onChange={(e) => changeScenario(e.target.value)}
                style={{
                  width: '100%',
                  padding: 6,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  marginBottom: 8,
                }}
              >
                <option value="default">Default (3 projects)</option>
                <option value="empty">Empty (no data)</option>
                <option value="error">Error (all requests fail)</option>
                <option value="large">Large (1000 projects)</option>
                <option value="edge">Edge Cases (long text, emoji)</option>
                <option value="slow">Slow (3s delay)</option>
              </select>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 4,
                }}
              >
                Current: {getCurrentScenario()}
              </div>
            </>
          )}

          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.2)',
              fontSize: 10,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            💡 Also available in console: __apiDebug
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: 20,
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          🔧 Dev Tools
        </button>
      )}
    </div>
  );
}
