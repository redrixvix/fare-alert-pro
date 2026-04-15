// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import '../dashboard.css';

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )auth_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface Watch {
  id: number;
  route: string;
  cabin: string;
  watchDate: string;
  targetPrice: number;
  currentPrice: number | null;
  savingsPct: number | null;
}

// Inline mock data for SSR - client will replace with real data
function WatchesSkeleton() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--text)' }}>Price Watches</h2>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)', marginTop: 'var(--sp-1)' }}>Get alerted when prices drop to your target.</p>
        </div>
        <a href='/routes' style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', padding: 'var(--sp-2) var(--sp-4)', fontSize: 'var(--fs-sm)', fontWeight: 600, textDecoration: 'none' }}>+ Add more</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {[1, 2].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', opacity: 0.5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: 16, width: 80, background: 'var(--border)', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 12, width: 160, background: 'var(--border)', borderRadius: 4 }} />
            </div>
            <div style={{ width: 60, height: 24, background: 'var(--border)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WatchesSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    setToken(getAuthToken());
    // Fetch watches via API (avoids SSR Convex issues)
    fetch('/api/watches', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setWatches(data.watches ?? []);
        setLoading(false);
      })
      .catch(() => {
        setWatches([]);
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: any) {
    if (!token) return;
    setDeletingId(id);
    try {
      await fetch(`/api/watches?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setWatches(prev => (prev ?? []).filter(w => w.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function cabinLabel(cabin: string) {
    return cabin.replace('_', ' ');
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--sp-12)', color: 'var(--text-dim)' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto var(--sp-3)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 'var(--fs-sm)' }}>Loading watches…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--text)' }}>Price Watches</h2>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)', marginTop: 'var(--sp-1)' }}>Get alerted when prices drop to your target.</p>
        </div>
        <a href='/routes' style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', padding: 'var(--sp-2) var(--sp-4)', fontSize: 'var(--fs-sm)', fontWeight: 600, textDecoration: 'none' }}>+ Add more</a>
      </div>

      {!watches || watches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--sp-12)', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-3)' }}>👁</div>
          <h3 style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--sp-1)' }}>No price watches yet</h3>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)', marginBottom: 'var(--sp-4)' }}>Head to a route page and click &quot;Watch this price&quot; to get started.</p>
          <a href='/routes' style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', padding: 'var(--sp-2) var(--sp-4)', fontSize: 'var(--fs-sm)', fontWeight: 600, textDecoration: 'none' }}>Browse Routes</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {watches.map((watch) => (
            <div key={watch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', transition: 'border-color 0.15s' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{watch.route}</span>
                  <span style={{ fontSize: 'var(--fs-micro)', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '1px 6px', borderRadius: '4px' }}>{cabinLabel(watch.cabin)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', fontSize: 'var(--fs-sm)', color: 'var(--text-dim)' }}>
                  <span>📅 {formatDate(watch.watchDate)}</span>
                  {watch.currentPrice !== null ? (
                    <span>Current: <span style={{ fontWeight: 600, color: 'var(--text)' }}>${watch.currentPrice.toFixed(0)}</span></span>
                  ) : (
                    <span style={{ fontStyle: 'italic' }}>No price data yet</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)' }}>${watch.targetPrice.toFixed(0)} target</div>
                  {watch.savingsPct !== null && (
                    <div style={{ fontSize: 'var(--fs-micro)', color: watch.savingsPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {watch.savingsPct >= 0 ? '↓' : '↑'}{Math.abs(watch.savingsPct).toFixed(1)}% vs current
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(watch.id)} disabled={deletingId === watch.id}
                  style={{ padding: 'var(--sp-2)', background: 'none', border: '1px solid transparent', borderRadius: 'var(--r-sm)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deletingId === watch.id ? 0.5 : 1 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}