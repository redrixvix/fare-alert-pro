import { getRouteChartData, getRoutePriceHistory, getAllRoutes } from '@/lib/db';
import Link from 'next/link';
import DateNavigator from './DateNavigator';
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

interface ChartPoint {
  date: string;
  y: number | null;
  pe: number | null;
  j: number | null;
  f: number | null;
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

function formatDateLabel(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

// Build SVG chart server-side
function buildChart(data: ChartPoint[]): string {
  if (!data.length) return '';

  const COLORS: Record<string, string> = { y: '#4f9cf9', pe: '#a0a8c0', j: '#c9a84c', f: '#9b8fe8' };
  const W = 800, H = 280;
  const PAD = { top: 20, right: 20, bottom: 50, left: 60 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const allPrices: number[] = [];
  data.forEach(d => { ['y', 'pe', 'j', 'f'].forEach(k => { const v = (d as any)[k]; if (v != null) allPrices.push(v); }); });
  const maxPrice = allPrices.length ? Math.max(...allPrices) * 1.2 : 1000;

  const xS = (i: number) => (i / Math.max(data.length - 1, 1)) * cw;
  const yS = (p: number) => ch - (p / maxPrice) * ch;

  const labelCount = Math.min(7, data.length);
  const labelStep = Math.max(1, Math.floor(data.length / labelCount));
  const xLabels: { i: number; label: string }[] = [];
  for (let i = 0; i < data.length; i += labelStep) {
    const dd = new Date(data[i].date + 'T00:00:00');
    xLabels.push({ i, label: dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
  }

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:400px;display:block;overflow:visible">`;
  svg += `<g transform="translate(${PAD.left},${PAD.top})">`;

  // Gridlines
  for (let li = 0; li <= 5; li++) {
    const y = (li / 5) * ch;
    svg += `<line x1="0" y1="${y.toFixed(1)}" x2="${cw}" y2="${y.toFixed(1)}" stroke="#2a2d3a" stroke-width="1"/>`;
    svg += `<text x="-8" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#7a7d8e" font-size="11">$${(maxPrice - (li / 5) * maxPrice).toFixed(0)}</text>`;
  }

  // Lines and dots
  (['y', 'pe', 'j', 'f'] as const).forEach(key => {
    const pts: [number, number][] = [];
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] as any)[key];
      if (v != null) pts.push([xS(i), yS(v)]);
    }
    if (!pts.length) return;
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    svg += `<path d="${d}" stroke="${COLORS[key]}" stroke-width="2" fill="none" stroke-linejoin="round"/>`;
    pts.forEach(p => {
      svg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${COLORS[key]}"/>`;
    });
  });

  // X labels
  xLabels.forEach(o => {
    svg += `<text x="${xS(o.i).toFixed(1)}" y="${(ch + 20).toFixed(1)}" text-anchor="middle" fill="#7a7d8e" font-size="11">${o.label}</text>`;
  });

  // Axes
  svg += `<line x1="0" y1="0" x2="0" y2="${ch}" stroke="#2a2d3a"/>`;
  svg += `<line x1="0" y1="${ch}" x2="${cw}" y2="${ch}" stroke="#2a2d3a"/>`;
  svg += `</g></svg>`;

  // Legend
  svg += `<div style="display:flex;gap:1.5rem;justify-content:center;margin-top:0.5rem;flex-wrap:wrap;">`;
  ([['y','Economy'],['pe','Premium Economy'],['j','Business'],['f','First']] as [string, string][]).forEach(([k, label]) => {
    svg += `<div style="display:flex;align-items:center;gap:0.4rem;">`;
    svg += `<div style="width:12px;height:12px;border-radius:50%;background:${COLORS[k]};"></div>`;
    svg += `<span style="font-size:0.8rem;color:#7a7d8e;">${label}</span>`;
    svg += `</div>`;
  });
  svg += `</div>`;

  return svg;
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

  const chartData = getRouteChartData(route, 90);
  const priceHistory = getRoutePriceHistory(route, 200) as PriceRecord[];

  // Group prices by date
  const byDate: Record<string, Record<string, PriceRecord>> = {};
  for (const p of priceHistory) {
    if (!byDate[p.search_date]) byDate[p.search_date] = {};
    const key = p.cabin === 'ECONOMY' ? 'y' : p.cabin === 'PREMIUM_ECONOMY' ? 'pe' : p.cabin === 'BUSINESS' ? 'j' : 'f';
    byDate[p.search_date][key] = p;
  }
  const sortedDates = Object.keys(byDate).sort();

  const chartSvg = buildChart(chartData);

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
        {/* Chart */}
        <section className="section">
          <h2>📊 Price History</h2>
          {chartSvg ? (
            <div dangerouslySetInnerHTML={{ __html: chartSvg }} />
          ) : (
            <p className="no-data">No price data yet for this route. Run a price check to start collecting data.</p>
          )}
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
