import { getRecentAlerts } from '@/lib/db';
import Link from 'next/link';
import '../dashboard.css';

export const dynamic = 'force-dynamic';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
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

export default async function AlertsPage() {
  const alerts = getRecentAlerts(100) as any[];

  const totalSavings = alerts.reduce((sum, a) => sum + (a.normal_price - a.price), 0);
  const bestDeal = alerts.reduce(
    (best, a) => (!best || a.savings_pct > best.savings_pct ? a : best),
    null as any
  );

  return (
    <main className="dashboard">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" className="back-link">← Dashboard</Link>
            <h1>🚨 Alert History</h1>
          </div>
          <p className="subtitle">{alerts.length} alerts detected so far</p>
        </div>
      </header>

      <div className="content">
        {/* Summary stats */}
        {alerts.length > 0 && (
          <section className="section">
            <div className="alert-summary-grid">
              <div className="alert-summary-card">
                <div className="alert-summary-num alert-summary-num-danger">{alerts.length}</div>
                <div className="alert-summary-label">Total Alerts</div>
              </div>
              <div className="alert-summary-card">
                <div className="alert-summary-num alert-summary-num-success">${totalSavings.toFixed(0)}</div>
                <div className="alert-summary-label">Total Savings Found</div>
              </div>
              {bestDeal && (
                <div className="alert-summary-card">
                  <div className="alert-summary-num alert-summary-num-warn">{bestDeal.savings_pct.toFixed(0)}%</div>
                  <div className="alert-summary-label">Best Deal: {bestDeal.route}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Alert list */}
        <section className="section">
          {alerts.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔍</span>
              <p>
                No alerts yet. The system watches for prices that drop significantly below
                their 30-day average.
              </p>
              <p>Check back soon — error fares can appear without warning.</p>
            </div>
          ) : (
            <div className="alerts-grid">
              {alerts.map((a) => {
                const savingsClass = a.savings_pct > 50 ? 'savings-badge-high' : a.savings_pct > 40 ? 'savings-badge-mid' : 'savings-badge-ok';
                return (
                <div key={a.id} className="alert-card">
                  <div className="alert-card-header">
                    <span className="alert-route">
                      <Link
                        href={`/route/${a.route}`}
                        style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}
                      >
                        {a.route}
                      </Link>
                    </span>
                    <span className="alert-cabin-tag">{CABIN_LABELS[a.cabin] || a.cabin}</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
                    {formatDate(a.alert_date)}
                  </div>
                  <div className="alert-price">
                    <span className="price-val">${a.price.toFixed(0)}</span>
                    <span className="price-normal">vs ~${a.normal_price.toFixed(0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-1)' }}>
                    <span className={`savings-badge ${savingsClass}`}>{a.savings_pct.toFixed(0)}% off</span>
                    <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-dim)' }}>{a.airline || '—'}</span>
                  </div>
                  <div className="alert-date" style={{ marginTop: 'var(--sp-2)' }}>
                    Detected {formatTime(a.created_at)}
                  </div>
                </div>
              );})}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
