import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Returns the cheapest current prices across all routes, grouped by cabin
export async function GET() {
  try {
    const db = getDb();

    // For each cabin class, find the route with the lowest current price
    // (most recent price per route per cabin)
    const cabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
    const deals: Record<string, { route: string; price: number; airline: string | null; days_out: number }[]> = {};

    for (const cabin of cabins) {
      const rows = db.prepare(`
        WITH latest AS (
          SELECT route, price, airline, search_date,
            ROW_NUMBER() OVER (PARTITION BY route ORDER BY fetched_at DESC) as rn,
            CAST(julianday(search_date) - julianday('now') AS INTEGER) as days_out
          FROM prices
          WHERE cabin = ? AND price > 0 AND search_date >= date('now')
        )
        SELECT route, price, airline, days_out
        FROM latest
        WHERE rn = 1 AND days_out >= 0
        ORDER BY price ASC
        LIMIT 5
      `).all(cabin) as { route: string; price: number; airline: string | null; days_out: number }[];

      const cabinKey = cabin === 'ECONOMY' ? 'y' : cabin === 'PREMIUM_ECONOMY' ? 'pe' : cabin === 'BUSINESS' ? 'j' : 'f';
      deals[cabinKey] = rows;
    }

    return NextResponse.json(deals);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
