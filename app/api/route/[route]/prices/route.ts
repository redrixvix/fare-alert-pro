import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ route: string }> }
) {
  const { route } = await params;
  const decoded = decodeURIComponent(route);

  const db = getDb();

  const routeRecord = db.prepare('SELECT route FROM routes WHERE route=?').get(decoded);
  if (!routeRecord) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const prices = db.prepare(`
    SELECT route, cabin, search_date, price, currency, airline,
           duration_minutes, stops, fetched_at
    FROM prices
    WHERE route = ?
    ORDER BY search_date DESC, cabin ASC
  `).all(decoded) as any[];

  return NextResponse.json({ prices });
}
