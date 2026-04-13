import { getAuthUser } from '@/lib/auth';
import { ConvexHttpClient } from 'convex/browser';
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

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set');
  return new ConvexHttpClient(url);
}

async function fetchDashboardData(userId: number) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return { routes: [], customRoutes: [], alerts: [] };
  }
  try {
    const client = new ConvexHttpClient(convexUrl);
    const [routes, customRoutes, alerts] = await Promise.all([
      client.query('routes:getAllRoutes' as any, { includeCustom: false }),
      client.query('routes:getUserRoutes' as any, { userId }),
      client.query('alerts:getAlertsHistory' as any, { userId }),
    ]);
    return { routes, customRoutes, alerts: alerts.alerts ?? [] };
  } catch (e) {
    console.error('Convex query failed:', e);
    return { routes: [], customRoutes: [], alerts: [] };
  }
}

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect('/landing');

  let routes: any[] = [];
  let customRoutes: any[] = [];
  let alerts: any[] = [];

  try {
    const data = await fetchDashboardData(user.userId);
    routes = data.routes;
    customRoutes = data.customRoutes;
    alerts = data.alerts;
  } catch (e) {
    console.error('Convex query failed:', e);
  }

  const busiestRoutes = routes.filter((r: any) => r.category === 'busiest');
  const fmt = (v: any) => v != null && v > 0 ? `$${Number(v).toFixed(0)}` : <span className="no-price">—</span>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>✈ FareAlertPro Dashboard</h1>
          <p className="subtitle">Welcome back! Here&apos;s your flight deal overview.</p>
        </div>
        <div className="header-actions">
          <Link href="/settings" className="settings-btn">⚙ Settings</Link>
          <Link href="/routes" className="manage-btn">✏ Manage Routes</Link>
        </div>
      </div>

      <StatusBar />
      <ScanNowButton />
      <DateSearch />

      <div className="dashboard-grid">
        <div className="dashboard-left">
          <section className="section">
            <h2>🔥 Busiest Routes</h2>
            {busiestRoutes.length === 0 ? (
              <p className="empty-state">No route data available yet.</p>
            ) : (
              <div className="routes-list">
                {busiestRoutes.slice(0, 6).map((r: any) => (
                  <Link key={r.route} href={`/route/${r.route}`} className="route-card">
                    <span className="route-name">{r.route}</span>
                    <span className="route-price">{fmt(r.last_price)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <LiveFeed />
        </div>

        <div className="dashboard-right">
          <ManageRoutes initialRoutes={customRoutes} />
          <BestDeals />
        </div>
      </div>
    </div>
  );
}
