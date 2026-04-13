// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import Link from 'next/link';
import { addUserRoute, deleteUserRoute } from '@/convex/routes';

interface Route {
  route: string;
  origin: string;
  destination: string;
  last_checked: string | null;
  last_price: number | null;
}

interface Props {
  initialRoutes: Route[];
}

export default function ManageRoutes({ initialRoutes }: Props) {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const addRouteMutation = useMutation(addUserRoute as any);
  const removeRouteMutation = useMutation(deleteUserRoute as any);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )auth_token=([^;]*)/);
    setToken(match ? decodeURIComponent(match[1]) : null);
  }, []);

  const add = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const parsed = input.trim().toUpperCase().match(/^([A-Z]{3})-([A-Z]{3})$/);
      if (!parsed) {
        setMsg({ type: 'err', text: 'Invalid route format. Use "ABC-DEF" airport codes.' });
        setLoading(false);
        return;
      }
      const routeStr = `${parsed[1]}-${parsed[2]}`;
      await addRouteMutation({ route: routeStr, origin: parsed[1], destination: parsed[2], token });
      setRoutes((prev) => [...prev, { route: routeStr, origin: parsed[1], destination: parsed[2], last_checked: null, last_price: null }]);
      setInput('');
      setMsg({ type: 'ok', text: `Added ${routeStr} — it will appear in your custom routes and be scanned going forward.` });
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Failed to add route' });
    }
    setLoading(false);
  };

  const remove = async (route: string) => {
    if (!confirm(`Remove ${route}? It will no longer be scanned.`)) return;
    try {
      await removeRouteMutation({ route, token });
      setRoutes((prev) => prev.filter((x) => x.route !== route));
      setMsg({ type: 'ok', text: `Removed ${route}` });
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Failed to remove route' });
    }
  };

  return (
    <section className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
        <h2>✏️ My Custom Routes</h2>
        <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>
          {routes.length} / 5 {routes.length >= 5 && <span style={{ color: 'var(--warn)' }}>(Pro = unlimited)</span>}
        </span>
      </div>

      {/* Add route form */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="ABC-DEF"
          maxLength={7}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--text)',
            padding: 'var(--sp-2) var(--sp-3)',
            fontSize: 'var(--fs-body)',
            fontFamily: 'monospace',
            fontWeight: 600,
            letterSpacing: '0.05em',
            width: 120,
          }}
        />
        <button
          onClick={add}
          disabled={loading || !input.trim()}
          style={{
            background: loading ? 'var(--card)' : 'var(--success)',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            padding: 'var(--sp-2) var(--sp-4)',
            color: '#fff',
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Adding…' : '+ Add Route'}
        </button>
      </div>

      {msg && (
        <div
          style={{
            background: msg.type === 'ok' ? 'rgba(42,157,143,0.08)' : 'rgba(230,57,70,0.08)',
            border: `1px solid ${msg.type === 'ok' ? 'var(--success)' : 'var(--danger)'}`,
            borderRadius: 'var(--r-sm)',
            padding: 'var(--sp-3)',
            marginBottom: 'var(--sp-4)',
            fontSize: 'var(--fs-sm)',
            color: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {msg.text}
        </div>
      )}

      {routes.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
          <span className="empty-state-icon">🛫</span>
          <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
            No custom routes yet. Add your first route above — e.g. <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>PIT-LAS</strong> for Pittsburgh to Las Vegas.
          </p>
        </div>
      ) : (
        <div className="routes-table-wrap">
          <table className="routes-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Last Price</th>
                <th>Last Checked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.route}>
                  <td className="route-name">
                    <Link href={`/route/${r.route}`} className="route-link">{r.route}</Link>
                  </td>
                  <td className="route-price">{r.last_price ? `$${r.last_price.toFixed(0)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td className="route-check">{r.last_checked ? new Date(r.last_checked).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not yet scanned'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => remove(r.route)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--danger)',
                        borderRadius: 'var(--r-sm)',
                        color: 'var(--danger)',
                        padding: '2px 10px',
                        fontSize: 'var(--fs-micro)',
                        cursor: 'pointer',
                      }}
                    >
                      ✕ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
