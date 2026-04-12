import { getAllRoutes, getUserRoutes, RouteRecord } from '@/lib/db';
import RoutesClient from './RoutesClient';
import '../dashboard.css';

export const dynamic = 'force-dynamic';

function toRouteData(r: any): RouteRecord {
  return {
    id: r.id ?? 0,
    route: r.route,
    category: r.category ?? 'custom',
    last_checked: r.last_checked ?? null,
    last_price: r.last_price ?? null,
    last_currency: r.last_currency ?? 'USD',
    last_price_premium_economy: r.last_price_premium_economy ?? null,
    last_currency_premium_economy: r.last_currency_premium_economy ?? 'USD',
    last_price_business: r.last_price_business ?? null,
    last_currency_business: r.last_currency_business ?? 'USD',
    last_price_first: r.last_price_first ?? null,
    last_currency_first: r.last_currency_first ?? 'USD',
    is_custom: r.is_custom ?? (r.category === 'custom'),
  };
}

export default async function RoutesPage() {
  const routes = (await getAllRoutes() as RouteRecord[]).map(toRouteData);
  const userRoutes = (await getUserRoutes() as any[]).map(toRouteData);
  // Deduplicate — user_routes may overlap with routes table (e.g. PIT-LAS was added to both)
  const seen = new Set(routes.map((r: RouteRecord) => r.route));
  const uniqueUserRoutes = userRoutes.filter((r: RouteRecord) => !seen.has(r.route));
  const allRoutes = [...routes, ...uniqueUserRoutes];

  return (
    <main className="dashboard">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a
              href="/"
              style={{ color: '#7a7d8e', textDecoration: 'none', fontSize: '0.9rem' }}
            >
              ← Dashboard
            </a>
            <h1>🛫 Route List</h1>
          </div>
          <p className="subtitle">Search date: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <RoutesClient initialRoutes={allRoutes} />
    </main>
  );
}
