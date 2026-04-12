import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ error: 'Missing date param' }, { status: 400 });
  }

  const db = getDb();
  const rows = db.prepare(`
    SELECT route, cabin, price, currency, airline, duration_minutes, stops, fetched_at
    FROM prices
    WHERE search_date = ?
    ORDER BY route, cabin
  `).all(date) as any[];

  return NextResponse.json({ date, count: rows.length, prices: rows });
}
