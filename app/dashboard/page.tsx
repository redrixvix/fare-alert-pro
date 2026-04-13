// FareAlertPro Dashboard (authenticated)
import { getAllRoutes, getRecentAlerts, getPriceTrend, getHistoricalAvg, getUserRoutes } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DateSearch from '../DateSearch';
import StatusBar from '../components/StatusBar';
import ScanNowButton from '../components/ScanNowButton';
import BestDeals from '../components/BestDeals';
import LiveFeed from '../components/LiveFeed';
import ManageRoutes from '../components/ManageRoutes';
import '../dashboard.css';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect('/landing');

  let routes: any[] = [];
  let customRoutes: any[] = [];
  let alerts: any[] = [];

  try {
    routes = getAllRoutes();
    customRoutes = getUserRoutes(user.userId);
    alerts = getRecentAlerts(20);
  } catch (e) {
    console.error('DB not initialized yet:', e);
  }

  const busiestRoutes = routes.filter((r: any) => r.category === 'busiest');

  // Compute deal percentage for each route
  const routeDealPct: Record<string, number | null> = {};
  for (const r of [...busiestRoutes, ...customRoutes]) {
    if (!r.last_price) { routeDealPct[r.route] = null; continue; }
    const avg = getHistoricalAvg(r.route, 'ECONOMY');
    if (!avg) { routeDealPct[r.route] = null; continue; }
    routeDealPct[r.route] = ((r.last_price - avg) / avg) * 100;
  }

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch { return iso; }
  };

  const fmt = (v: any) => v != null && v > 0 ? `$${Number(v).toFixed(0)}` : <span className="no-price">—</span>;

  const TrendArrow = ({ pct }: { pct: number | null }) => {
    if (pct === null || pct === 0) return null;
    const up = pct > 0;
    return (
      <span className="trend-arrow" style={{ color: up ? 'var(--danger)' : 'var(--success)' }} title={`${up ? '↑' : '↓'} ${Math.abs(pct).toFixed(0)}% vs 7d ago`}>
        {up ? '↑' : '↓'}{Math.abs(pct).toFixed(0)}%
      </span>
    );
  };

  const DealBadge = ({ savingsPct }: { savingsPct: number | null }) => {
    if (!savingsPct || savingsPct < 30) return null;
    return (
      <span className="deal-badge" title={`${savingsPct.toFixed(0)}% below historical average`}>
        DEAL
      </span>
    );
  };

  const RouteRow = ({ r, dealPct }: { r: any; dealPct: number | null }) => {
    const trend = getPriceTrend(r.route, 'ECONOMY');
    return (
      <tr>
        <td className="route-name">
          <Link href={`/route/${r.route}`} className="route-link">{r.route}</Link>
          <DealBadge savingsPct={dealPct} />
        </td>
        <td className="route-price" title="Economy">
          {fmt(r.last_price)}
          <TrendArrow pct={trend} />
        </td>
        <td className="route-price pe" title="Premium Economy">{fmt(r.last_price_premium_economy)}</td>
        <td className="route-price biz" title="Business">{fmt(r.last_price_business)}</td>
        <td className="route-price first" title="First">{fmt(r.last_price_first)}</td>
        <td className="route-check">{r.last_checked ? formatTime(r.last_checked) : 'Never'}</td>
      </tr>
    );
  };

  return (
    <main className="dashboard">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h1>✈️ FareAlertPro</h1>
              <p className="subtitle">{user.email} · {user.plan === 'pro' ? 'Pro' : 'Free'} plan</p>
            </div>
            <div className="header-actions">
              <ScanNowButton />
              <Link href="/settings" className="nav-link-btn">
                ⚙️ Settings
              </Link>
              <Link href="/alerts" className="nav-link-btn">
                🚨 Alerts
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="content">
        {/* Live status bar */}
        <StatusBar />

        {/* Best deals widget */}
        <BestDeals />

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <section className="section alerts-section">
            <h2>🚨 Recent Alerts</h2>
            <div className="alerts-grid">
              {alerts.map((a: any) => {
                const savingsClass = a.savings_pct > 50 ? 'savings-badge-high' : a.savings_pct > 40 ? 'savings-badge-mid' : 'savings-badge-ok';
                return (
                <div key={a.id} className="alert-card">
                  <div className="alert-card-header">
                    <span className="alert-route">{a.route}</span>
                    <span className="alert-cabin-tag">{a.cabin?.replace('_', ' ')}</span>
                  </div>
                  <div className="alert-price">
                    <span className="price-val">${a.price.toFixed(0)}</span>
                    <span className="price-normal">was ~${a.normal_price.toFixed(0)}</span>
                  </div>
                  <span className={`savings-badge ${savingsClass}`}>
                    {a.savings_pct.toFixed(0)}% off
                  </span>
                  <div className="alert-date">{formatTime(a.created_at)}</div>
                </div>
              );})}
            </div>
          </section>
        )}

        {/* Routes Section */}
        <section className="section">
          <h2>📍 Tracked Routes</h2>
          <DateSearch />

          {/* Cabin class legend */}
          <div className="cabin-legend">
            <span><strong>Y</strong> = Economy</span>
            <span><strong>PE</strong> = Premium Economy</span>
            <span><strong>J</strong> = Business</span>
            <span><strong>F</strong> = First</span>
          </div>

          <div className="route-category">
            <h3>Top 15 Busiest Routes</h3>
            <div className="routes-table-wrap">
              <table className="routes-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Y</th>
                    <th>PE</th>
                    <th>J</th>
                    <th>F</th>
                    <th>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {busiestRoutes.map((r: any) => <RouteRow key={r.route} r={r} dealPct={routeDealPct[r.route] ?? null} />)}
                  {busiestRoutes.length === 0 && (
                    <tr><td colSpan={6} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--sp-6)' }}>No routes tracked yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {customRoutes.length > 0 && (
            <div className="route-category">
              <h3>Your Custom Routes</h3>
              <div className="routes-table-wrap">
                <table className="routes-table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Y</th>
                      <th>PE</th>
                      <th>J</th>
                      <th>F</th>
                      <th>Last Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customRoutes.map((r: any) => <RouteRow key={r.route} r={r} dealPct={routeDealPct[r.route] ?? null} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Info Section */}
        <section className="section info-section">
          <h2>ℹ️ How It Works</h2>
          <ul>
            <li>Checks <strong>31 routes × 4 cabin classes</strong> against Google Flights data</li>
            <li>Stores daily price history (up to 91 days out) for anomaly detection</li>
            <li>Alerts when price drops <strong>&gt;50%</strong> below the historical average</li>
            <li>Cron runs automatically every minute · or hit <strong>🔄 Scan Now</strong> to trigger immediately</li>
            <li>Alerts appear above when a deal is detected</li>
          </ul>
        </section>

        {/* Live Feed */}
        <LiveFeed />

        {/* Custom Routes */}
        <ManageRoutes initialRoutes={customRoutes} />
      </div>
    </main>
  );
}
