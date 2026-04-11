// FareAlertPro Dashboard
import { getAllRoutes, getRecentAlerts } from '@/lib/db';
import './dashboard.css';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  let routes: any[] = [];
  let alerts: any[] = [];

  try {
    routes = getAllRoutes();
    alerts = getRecentAlerts(20);
  } catch (e) {
    console.error('DB not initialized yet:', e);
  }

  const busiestRoutes = routes.filter((r: any) => r.category === 'busiest');
  const errorProneRoutes = routes.filter((r: any) => r.category === 'error_prone');

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch { return iso; }
  };

  const formatPct = (pct: number) => {
    const color = pct > 60 ? '#e63946' : pct > 40 ? '#f4a261' : '#2a9d8f';
    return `<span style="color:${color};font-weight:700">${pct.toFixed(0)}%</span>`;
  };

  const fmt = (v: any) => v != null ? `$${Number(v).toFixed(0)}` : <span className="no-price">—</span>;

  const RouteRow = ({ r }: { r: any }) => (
    <tr>
      <td className="route-name">{r.route}</td>
      <td className="route-price" title="Economy">{fmt(r.last_price)}</td>
      <td className="route-price pe" title="Premium Economy">{fmt(r.last_price_premium_economy)}</td>
      <td className="route-price biz" title="Business">{fmt(r.last_price_business)}</td>
      <td className="route-price first" title="First">{fmt(r.last_price_first)}</td>
      <td className="route-check">{r.last_checked ? formatTime(r.last_checked) : 'Never'}</td>
    </tr>
  );

  return (
    <main className="dashboard">
      <header className="header">
        <div className="header-inner">
          <h1>✈️ FareAlertPro</h1>
          <p className="subtitle">Flight fare monitoring & error fare detection</p>
        </div>
      </header>

      <div className="content">
        {/* Alert Banner */}
        {alerts.length > 0 && (
          <section className="section alerts-section">
            <h2>🚨 Recent Alerts</h2>
            <div className="alerts-grid">
              {alerts.map((a: any) => (
                <div key={a.id} className="alert-card">
                  <div className="alert-route">{a.route}</div>
                  <div className="alert-cabin">{a.cabin?.replace('_', ' ')}</div>
                  <div className="alert-price">
                    <span className="price-val">${a.price.toFixed(0)}</span>
                    <span className="price-normal">was ~${a.normal_price.toFixed(0)}</span>
                  </div>
                  <div className="alert-savings" dangerouslySetInnerHTML={{ __html: formatPct(a.savings_pct) }} />
                  <div className="alert-date">{formatTime(a.alert_date)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Routes Section */}
        <section className="section">
          <h2>📍 Tracked Routes</h2>

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
                  {busiestRoutes.map((r: any) => <RouteRow key={r.route} r={r} />)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="route-category">
            <h3>Top 15 Error-Prone Routes</h3>
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
                  {errorProneRoutes.map((r: any) => <RouteRow key={r.route} r={r} />)}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="section info-section">
          <h2>ℹ️ How It Works</h2>
          <ul>
            <li>Checks all 30 routes × 4 cabin classes against Google Flights data</li>
            <li>Stores price history for baseline calculation</li>
            <li>Alerts when price drops <strong>&gt;50%</strong> below historical average</li>
            <li>Call <code>/api/check-prices</code> (external cron) to trigger checks</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
