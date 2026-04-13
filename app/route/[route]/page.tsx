import { getRouteChartData, getRoutePriceHistory, getAllRoutes } from '@/lib/db';
import Link from 'next/link';
import DateNavigator from './DateNavigator';
import CheapestDatesGrid from '../../components/CheapestDatesGrid';
import PriceHistoryChart from '../../components/PriceHistoryChart';
import './route-detail.css';

interface PriceRecord {
  route: string;
  cabin: string;
  search_date: string;
  price: number;
  currency: string;
  airline: string | null;
  duration_minutes: number | null;
  stops: number | null;
  fetched_at: string;
}

const CABIN_KEYS = [
  { key: 'y', label: 'Y', cls: 'cabin-y' },
  { key: 'pe', label: 'PE', cls: 'cabin-pe' },
  { key: 'j', label: 'J', cls: 'cabin-j' },
  { key: 'f', label: 'F', cls: 'cabin-f' },
];

function fmtDuration(mins: number | null): string {
  if (!mins) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtStops(s: number | null): string {
  if (s == null) return '—';
  if (s === 0) return 'Direct';
  return `${s} stop${s > 1 ? 's' : ''}`;
}

export default async function RoutePage({ params }: { params: Promise<{ route: string }> }) {
  const { route: routeParam } = await params;
  const route = decodeURIComponent(routeParam);
  const [origin, destination] = route.split('-');

  const routes = getAllRoutes() as any[];
  const routeRecord = routes.find((r: any) => r.route === route);
  if (!routeRecord) {
    return (
      <div className="dashboard">
        <header className="header">
          <div className="header-inner">
            <h1>Route Not Found</h1>
          </div>
        </header>
        <div className="content" style={{ padding: '2rem' }}>
          <Link href="/routes" className="back-link">← Back to Routes</Link>
        </div>
      </div>
    );
  }

  const priceHistory = getRoutePriceHistory(route, 200) as PriceRecord[];

  // Group prices by date for the date navigator
  const byDate: Record<string, Record<string, PriceRecord>> = {};
  for (const p of priceHistory) {
    if (!byDate[p.search_date]) byDate[p.search_date] = {};
    const key = p.cabin === 'ECONOMY' ? 'y' : p.cabin === 'PREMIUM_ECONOMY' ? 'pe' : p.cabin === 'BUSINESS' ? 'j' : 'f';
    byDate[p.search_date][key] = p;
  }
  const sortedDates = Object.keys(byDate).sort();

  return (
    <main className="dashboard">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/routes" className="back-link">← Routes</Link>
            <h1>✈️ {route}</h1>
          </div>
          <p className="subtitle">{origin} → {destination} · 90-day price history</p>
        </div>
      </header>

      <div className="content">
        {/* Interactive Price History Chart */}
        <section className="section">
          <h2>📊 Price History</h2>
          <PriceHistoryChart route={route} initialDays={30} initialCabin="ECONOMY" />
        </section>

        {/* Cheapest Dates Grid */}
        <section className="section">
          <CheapestDatesGrid route={route} />
        </section>

        {/* Prices by Date with navigation */}
        <section className="section">
          <h2>📅 Prices by Date</h2>
          {sortedDates.length === 0 ? (
            <p className="no-data">No price records yet for this route.</p>
          ) : (
            <>
              <DateNavigator dates={sortedDates} initialPrices={byDate} route={route} />
            </>
          )}
        </section>

        {/* All records */}
        {sortedDates.length > 0 && (
          <section className="section">
            <h2>📋 All Price Records</h2>
            <div className="routes-table-wrap">
              <table className="price-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Y</th>
                    <th>PE</th>
                    <th>J</th>
                    <th>F</th>
                    <th>Airline</th>
                    <th>Duration</th>
                    <th>Stops</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDates.map(date => {
                    const cabins = byDate[date];
                    return (
                      <tr key={date}>
                        <td className="route-name">{date}</td>
                        {CABIN_KEYS.map(({ key, cls }) => (
                          <td key={key} className={`route-price ${cls}`}>
                            {cabins[key] ? `$${cabins[key].price.toFixed(0)}` : '—'}
                          </td>
                        ))}
                        <td>{cabins.y?.airline || cabins.pe?.airline || cabins.j?.airline || cabins.f?.airline || '—'}</td>
                        <td>{fmtDuration(cabins.y?.duration_minutes ?? cabins.pe?.duration_minutes ?? null)}</td>
                        <td>{fmtStops(cabins.y?.stops ?? cabins.pe?.stops ?? null)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <a
                            href={`https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyCg&tfu=CxD&hl=en&gl=us&q=${encodeURIComponent(route)}&date=${date.replace(/-/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lf-book-btn"
                            title={`Book ${route} on ${date}`}
                          >
                            Book →
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

    </main>
  );
}