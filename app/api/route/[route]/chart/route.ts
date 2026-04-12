import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ route: string }> }
) {
  const { route } = await params;
  const decoded = decodeURIComponent(route);

  const db = getDb();

  // Check if route exists
  const routeRecord = db.prepare('SELECT route FROM routes WHERE route=?').get(decoded);
  if (!routeRecord) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Get all prices for this route in the last 90 days
  const rows = db.prepare(`
    SELECT search_date, cabin, price
    FROM prices
    WHERE route = ? AND fetched_at > datetime('now', '-90 days')
    ORDER BY search_date ASC
  `).all(decoded) as any[];

  // Pivot into chart format: one row per date, columns for each cabin
  const byDate: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!byDate[row.search_date]) byDate[row.search_date] = {};
    const key = row.cabin === 'ECONOMY' ? 'y'
      : row.cabin === 'PREMIUM_ECONOMY' ? 'pe'
      : row.cabin === 'BUSINESS' ? 'j'
      : 'f';
    byDate[row.search_date][key] = row.price;
  }

  const data = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cabins]) => ({
      date,
      y: cabins.y ?? null,
      pe: cabins.pe ?? null,
      j: cabins.j ?? null,
      f: cabins.f ?? null,
    }));

  return NextResponse.json({ data });
}
