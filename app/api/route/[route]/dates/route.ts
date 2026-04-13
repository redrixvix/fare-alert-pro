import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ route: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route: routeParam } = await params;
  const route = decodeURIComponent(routeParam);

  const { searchParams } = new URL(request.url);
  const months = Math.min(3, Math.max(1, parseInt(searchParams.get('months') ?? '1', 10)));

  const db = getDb();

  const routeRecord = db.prepare('SELECT route FROM routes WHERE route=?').get(route);
  if (!routeRecord) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const rows = db.prepare(`
    SELECT search_date, MIN(price) as min_price
    FROM prices
    WHERE route = ?
      AND cabin = 'ECONOMY'
      AND price > 0
      AND search_date >= ?
      AND search_date <= ?
    GROUP BY search_date
    ORDER BY search_date ASC
  `).all(route, todayStr, endDate) as { search_date: string; min_price: number }[];

  if (rows.length === 0) {
    return NextResponse.json({ dates: [], minPrice: null, maxPrice: null, avgPrice: null });
  }

  const minPrice = Math.min(...rows.map(r => r.min_price));
  const maxPrice = Math.max(...rows.map(r => r.min_price));
  const avgPrice = rows.reduce((sum, r) => sum + r.min_price, 0) / rows.length;

  const dates = rows.map(r => ({
    date: r.search_date,
    price: r.min_price,
    is_cheapest: r.min_price === minPrice,
  }));

  return NextResponse.json({ dates, minPrice, maxPrice, avgPrice });
}
