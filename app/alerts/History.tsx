'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '../dashboard.css';

type Alert = {
  id: number;
  route: string;
  cabin: string;
  alert_date: string;
  price: number;
  normal_price: number;
  savings_pct: number;
  airline: string | null;
  created_at: string;
  saved_amount: number;
};

type Stats = {
  total_alerts: number;
  total_savings: number;
  average_savings_pct: number;
  best_deal: { route: string; savings_pct: number; saved_amount: number } | null;
  recent_month_savings: number;
};

type SortKey = 'recent' | 'savings';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const CABIN_LABELS: Record<string, string> = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Eco',
  BUSINESS: 'Business',
  FIRST: 'First',
};

function savingsBadgeClass(pct: number) {
  if (pct > 50) return 'savings-badge-high';
  if (pct > 40) return 'savings-badge-mid';
  return 'savings-badge-ok';
}

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--accent)' : 'var(--card)',
        color: active ? '#fff' : 'var(--text-dim)',
        border: '1px solid',
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        borderRadius: 'var(--r-sm)',
        padding: '4px 12px',
        fontSize: 'var(--fs-micro)',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="alert-summary-card">
      <div className="alert-summary-num" style={accent ? { color: accent } : {}}>{value}</div>
      <div className="alert-summary-label">{label}</div>
    </div>
  );
}

export default function History() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sort, setSort] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/alerts/history')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        setAlerts(data.alerts);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load your deal history. Please try again.');
        setLoading(false);
      });
  }, []);

  const sortedAlerts = [...alerts].sort((a, b) => {
    if (sort === 'savings') return b.savings_pct - a.savings_pct;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--sp-12)', color: 'var(--text-dim)' }}>
        Loading your deals…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--sp-6)', color: 'var(--danger)' }}>
        {error}
      </div>
    );
  }

  return (
    <main className="dashboard">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" className="back-link">← Dashboard</Link>
            <h1>💰 Your Deal History</h1>
          </div>
          {stats && stats.total_alerts > 0 && (
            <p className="subtitle">
              You&apos;ve caught{' '}
              <strong>{stats.total_alerts} deal{stats.total_alerts !== 1 ? 's' : ''}</strong>
              {' '}and saved{' '}
              <strong style={{ color: 'var(--success)' }}>${stats.total_savings}</strong>
            </p>
          )}
        </div>
      </header>

      <div className="content">
        {/* Stats banner */}
        {stats && stats.total_alerts > 0 && (
          <section className="section">
            <div className="alert-summary-grid">
              <StatCard label="Total Saved" value={`$${stats.total_savings}`} accent="var(--success)" />
              <StatCard label="Best Deal" value={`${stats.best_deal?.savings_pct ?? 0}%`} accent="var(--warn)" />
              <StatCard label="Alerts This Month" value={String(stats.total_alerts)} accent="var(--accent)" />
              <StatCard label="Avg Savings" value={`${stats.average_savings_pct}%`} />
              <StatCard label="Last 30 Days" value={`$${stats.recent_month_savings}`} accent="var(--success)" />
            </div>
          </section>
        )}

        {/* Sort controls */}
        {alerts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)', fontWeight: 600 }}>Sort:</span>
            <SortButton label="Most Recent" active={sort === 'recent'} onClick={() => setSort('recent')} />
            <SortButton label="Biggest Savings" active={sort === 'savings'} onClick={() => setSort('savings')} />
          </div>
        )}

        {/* Alert list */}
        <section className="section">
          {alerts.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🎯</span>
              <p>No deals caught yet. We&apos;ll alert you when prices drop.</p>
              <p style={{ fontSize: 'var(--fs-micro)', marginTop: 'var(--sp-2)', color: 'var(--text-muted)' }}>
                Price alerts are generated automatically when fares fall significantly below their 30-day average.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="alerts-history-table" style={{ display: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: 'var(--sp-2) var(--sp-4)', color: 'var(--text-dim)', fontSize: 'var(--fs-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Route</th>
                      <th style={{ textAlign: 'left', padding: 'var(--sp-2) var(--sp-4)', color: 'var(--text-dim)', fontSize: 'var(--fs-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: 'var(--sp-2) var(--sp-4)', color: 'var(--text-dim)', fontSize: 'var(--fs-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cabin</th>
                      <th style={{ textAlign: 'right', padding: 'var(--sp-2) var(--sp-4)', color: 'var(--text-dim)', fontSize: 'var(--fs-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Paid</th>
                      <th style={{ textAlign: 'right', padding: 'var(--sp-2) var(--sp-4)', color: 'var(--text-dim)', fontSize: 'var(--fs-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Was</th>
                      <th style={{ textAlign: 'center', padding: 'var(--sp-2) var(--sp-4)', color: 'var(--text-dim)', fontSize: 'var(--fs-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Saved</th>
                      <th style={{ textAlign: 'left', padding: 'var(--sp-2) var(--sp-4)', color: 'var(--text-dim)', fontSize: 'var(--fs-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Airline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAlerts.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                          <Link href={`/route/${a.route}`} style={{ fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', fontFamily: "'SF Mono', Monaco, monospace" }}>{a.route}</Link>
                        </td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', color: 'var(--text-dim)', fontSize: 'var(--fs-micro)' }}>{formatDate(a.alert_date)}</td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', fontSize: 'var(--fs-micro)', color: 'var(--text-dim)' }}>{CABIN_LABELS[a.cabin] || a.cabin}</td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontFamily: "'SF Mono', Monaco, monospace" }}>${a.price.toFixed(0)}</td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', textAlign: 'right', color: 'var(--text-dim)', fontSize: 'var(--fs-sm)', textDecoration: 'line-through' }}>${a.normal_price.toFixed(0)}</td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', textAlign: 'center' }}>
                          <span className={`savings-badge ${savingsBadgeClass(a.savings_pct)}`}>{a.savings_pct.toFixed(0)}%</span>
                        </td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', fontSize: 'var(--fs-micro)', color: 'var(--text-dim)' }}>{a.airline || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards (also used as default) */}
              <div className="alerts-grid">
                {sortedAlerts.map((a) => (
                  <div key={a.id} className="alert-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
                      <span className="alert-route">
                        <Link href={`/route/${a.route}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>{a.route}</Link>
                      </span>
                      <span className={`savings-badge ${savingsBadgeClass(a.savings_pct)}`}>{a.savings_pct.toFixed(0)}% off</span>
                    </div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-dim)', marginBottom: 'var(--sp-2)' }}>
                      {formatDate(a.alert_date)} · {CABIN_LABELS[a.cabin] || a.cabin}
                    </div>
                    <div className="alert-price">
                      <span className="price-val">${a.price.toFixed(0)}</span>
                      <span className="price-normal">was ${a.normal_price.toFixed(0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-1)' }}>
                      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>{a.airline || '—'}</span>
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--success)' }}>
                        Saved ${a.saved_amount}
                      </span>
                    </div>
                    <div className="alert-date" style={{ marginTop: 'var(--sp-2)' }}>
                      Caught {formatTime(a.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .alerts-history-table { display: none !important; }
          .alerts-grid { display: grid !important; }
        }
        @media (min-width: 641px) {
          .alerts-history-table { display: table !important; }
          .alerts-grid { display: none !important; }
        }
      `}</style>
    </main>
  );
}