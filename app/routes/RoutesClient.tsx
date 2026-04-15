// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RouteData {
  route: string;
  category: string;
  last_checked: string | null;
  last_price: number | null;
  last_price_premium_economy: number | null;
  last_price_business: number | null;
  last_price_first: number | null;
  is_custom?: boolean;
}

type SortKey = 'route' | 'last_price';
type SortDir = 'asc' | 'desc';

export default function RoutesClient() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [adding, setAdding] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('route');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/routes-fetch')
      .then(r => r.json())
      .then(data => {
        setRoutes(data.routes ?? []);
        setLoading(false);
      })
      .catch(() => {
        setRoutes([]);
        setLoading(false);
      });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    if (!origin.trim() || !destination.trim()) {
      setAddError('Both origin and destination are required');
      return;
    }
    const o = origin.trim().toUpperCase();
    const d = destination.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(o) || !/^[A-Z]{3}$/.test(d)) {
      setAddError('Airport codes must be exactly 3 letters');
      return;
    }
    if (o === d) {
      setAddError('Origin and destination must be different');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ origin: o, destination: d }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add route');
      setRoutes(prev => [...prev, { route: `${o}-${d}`, category: 'custom', last_checked: null, last_price: null, last_price_premium_economy: null, last_price_business: null, last_price_first: null, is_custom: true }]);
      setAddSuccess(`Route ${o}-${d} added successfully`);
      setOrigin('');
      setDestination('');
    } catch (err: any) {
      setAddError(err.message || 'Failed to add route');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(route: string) {
    if (!confirm(`Delete route ${route}?`)) return;
    try {
      const res = await fetch(`/api/routes/${encodeURIComponent(route)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setRoutes(prev => prev.filter(r => r.route !== route));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...routes].sort((a, b) => {
    let av: string | number | null = a[sortKey];
    let bv: string | number | null = b[sortKey];
    if (av == null) av = sortKey === 'last_price' ? Infinity : 'zzz';
    if (bv == null) bv = sortKey === 'last_price' ? Infinity : 'zzz';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const fmt = (v: number | null) =>
    v != null ? `$${v.toFixed(0)}` : <span className="no-price">—</span>;

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Never';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="content">
      {/* Add Custom Route Form */}
      <section className="section">
        <h2>➕ Add Custom Route</h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Origin (e.g. MIA)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              maxLength={3}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                color: 'var(--text)',
                width: '110px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
              }}
            />
            <span style={{ color: 'var(--text-dim)' }}>→</span>
            <input
              type="text"
              placeholder="Destination (e.g. ORD)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={3}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                color: 'var(--text)',
                width: '110px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1.25rem',
              color: '#fff',
              fontWeight: 600,
              cursor: adding ? 'not-allowed' : 'pointer',
              opacity: adding ? 0.6 : 1,
            }}
          >
            {adding ? 'Adding...' : 'Add Route'}
          </button>
        </form>
        {addError && <p style={{ color: 'var(--danger)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{addError}</p>}
        {addSuccess && <p style={{ color: 'var(--success)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{addSuccess}</p>}
      </section>

      {/* Routes Table */}
      <section className="section">
        <h2>📍 All Routes</h2>
        <div className="cabin-legend">
          <span><strong>Y</strong> = Economy</span>
          <span><strong>PE</strong> = Premium Economy</span>
          <span><strong>J</strong> = Business</span>
          <span><strong>F</strong> = First</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-6)', color: 'var(--text-dim)' }}>
            Loading routes...
          </div>
        ) : (
          <div className="routes-table-wrap">
            <table className="routes-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('route')} style={{ cursor: 'pointer' }}>
                    Route{SortIcon({ k: 'route' })}
                  </th>
                  <th>Category</th>
                  <th onClick={() => handleSort('last_price')} style={{ cursor: 'pointer' }}>
                    Y{SortIcon({ k: 'last_price' })}
                  </th>
                  <th>PE</th>
                  <th>J</th>
                  <th>F</th>
                  <th>Last Checked</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.route}>
                    <td className="route-name">
                      <Link href={`/route/${r.route}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                        {r.route}
                      </Link>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: r.is_custom ? '#2a4f8a' : r.category === 'busiest' ? '#1a3a2a' : '#3a2a1a',
                        color: r.is_custom ? 'var(--accent)' : r.category === 'busiest' ? '#2a9d8f' : '#f4a261',
                      }}>
                        {r.is_custom ? 'Custom' : (r.category || 'custom').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="route-price">{fmt(r.last_price)}</td>
                    <td className="route-price pe">{fmt(r.last_price_premium_economy)}</td>
                    <td className="route-price biz">{fmt(r.last_price_business)}</td>
                    <td className="route-price first">{fmt(r.last_price_first)}</td>
                    <td className="route-check">{formatTime(r.last_checked)}</td>
                    <td>
                      {r.is_custom && (
                        <button
                          onClick={() => handleDelete(r.route)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            padding: '0.2rem 0.6rem',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
