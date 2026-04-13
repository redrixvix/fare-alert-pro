'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import '../dashboard.css';
import { getUserAirports, setUserAirports as setUserAirportsMutation } from '../../convex/airports';

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )auth_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const VALID_AIRPORTS = [
  'ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'JFK', 'LGA', 'EWR', 'SFO', 'SEA',
  'LAS', 'PHX', 'IAH', 'MIA', 'MCO', 'FLL', 'BOS', 'PHL', 'DCA', 'MKE',
  'MSP', 'DTW', 'CLT', 'SLC', 'SAN', 'TPA', 'PDX', 'AUS', 'BWI', 'STL',
  'SAT', 'RDU', 'IND', 'CVG', 'CMH', 'JAX', 'RIC', 'BNA', 'MEM', 'PIT',
  'CLE', 'OMA', 'MCI', 'GSO', 'ALB', 'BDL', 'ROC', 'SYR', 'PVD', 'SJC'
];

interface AirportSettingsProps {
  homeAreaHint?: string;
}

export default function AirportSettings({ homeAreaHint }: AirportSettingsProps) {
  const [token, setToken] = useState<string | null>(null);
  const airportsData = useQuery(getUserAirports, { token: token ?? undefined });
  const [airports, setAirports] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const updateAirports = useMutation(setUserAirportsMutation);

  useEffect(() => {
    setToken(getAuthToken());
  }, []);

  useEffect(() => {
    if (airportsData !== undefined) {
      setAirports(airportsData);
      setLoading(false);
    }
  }, [airportsData]);

  function validate(code: string): string | null {
    const upper = code.toUpperCase().trim();
    if (upper.length !== 3) return 'Must be exactly 3 letters';
    if (!/^[A-Za-z]{3}$/.test(upper)) return 'Must be 3 letters only';
    if (!VALID_AIRPORTS.includes(upper)) return `Unknown airport: ${upper}`;
    if (airports.includes(upper)) return `${upper} is already added`;
    return null;
  }

  async function handleAdd() {
    const msg = validate(input);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    const newAirport = input.toUpperCase().trim();
    setAirports((prev) => [...prev, newAirport]);
    setInput('');

    try {
      await updateAirports({ userId: 0, airports: [...airports, newAirport] });
    } catch (e: any) {
      setError(e.message || 'Failed to save');
      setAirports((prev) => prev.filter((a) => a !== newAirport));
    }
  }

  async function handleRemove(airport: string) {
    const newAirports = airports.filter((a) => a !== airport);
    setAirports(newAirports);
    try {
      await updateAirports({ userId: 0, airports: newAirports });
    } catch (e: any) {
      setError(e.message || 'Failed to remove');
      setAirports((prev) => [...prev, airport]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--text-dim)' }}>
        <span style={{ fontSize: '1.5rem' }}>⏳</span>
        <p style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-sm)' }}>Loading airports…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--sp-1)' }}>✈️ Preferred Departure Airports</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)' }}>
          Check prices across multiple airports for the same destination.
          {homeAreaHint && (
            <span style={{ display: 'block', marginTop: 'var(--sp-1)', fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>
              Hint: your connected Telegram account is {homeAreaHint}
            </span>
          )}
        </p>
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={handleKeyDown}
          placeholder="EWR, JFK, LGA…"
          maxLength={3}
          style={{
            flex: 1,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--text)',
            padding: 'var(--sp-2) var(--sp-3)',
            fontSize: 'var(--fs-body)',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
        />
        <button
          onClick={handleAdd}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            padding: 'var(--sp-2) var(--sp-4)',
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'var(--accent-hover)'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'var(--accent)'; }}
        >
          Add
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: 'var(--sp-3)',
          padding: 'var(--sp-2) var(--sp-3)',
          background: 'rgba(230, 57, 70, 0.08)',
          border: '1px solid rgba(230, 57, 70, 0.3)',
          borderRadius: 'var(--r-sm)',
          color: 'var(--danger)',
          fontSize: 'var(--fs-sm)',
        }}>
          {error}
        </div>
      )}

      {/* Current airports */}
      {airports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
          No airports added yet. Add your preferred departure airports above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          {airports.map((airport) => (
            <span
              key={airport}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--sp-2)',
                padding: 'var(--sp-1) var(--sp-3)',
                background: 'rgba(79, 156, 249, 0.08)',
                border: '1px solid rgba(79, 156, 249, 0.25)',
                borderRadius: '20px',
                color: 'var(--accent)',
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
              }}
            >
              {airport}
              <button
                onClick={() => handleRemove(airport)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: '0',
                  opacity: 0.7,
                  transition: 'opacity 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.color = 'var(--danger)';
                  btn.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.color = 'var(--accent)';
                  btn.style.opacity = '0.7';
                }}
                title={`Remove ${airport}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>
        Valid airports: {VALID_AIRPORTS.slice(0, 10).join(', ')}…
      </p>
    </div>
  );
}
