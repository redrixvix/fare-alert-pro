import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    // Get the most recent price per (route, search_date) from the last 7 days for ECONOMY
    const recentPrices = db.prepare(`
      SELECT p.route, p.search_date, p.price, p.airline, p.fetched_at,
             (SELECT AVG(price) FROM prices
              WHERE route = p.route AND cabin = 'ECONOMY' AND price > 0
              AND fetched_at >= datetime('now', '-30 days')) as hist_avg
      FROM prices p
      WHERE p.cabin = 'ECONOMY'
        AND p.price > 0
        AND p.fetched_at >= datetime('now', '-7 days')
      ORDER BY p.fetched_at DESC
    `).all() as any[];

    // Deduplicate: keep only the most recent entry per (route, search_date)
    const seen = new Set<string>();
    const uniquePrices: any[] = [];
    for (const row of recentPrices) {
      const key = `${row.route}::${row.search_date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePrices.push(row);
      }
    }

    // Filter: current_price < 50% of 30-day average
    const errorFares = uniquePrices
      .filter((row) => row.hist_avg && row.price < 0.5 * row.hist_avg)
      .map((row) => {
        const savingsPct = ((row.hist_avg - row.price) / row.hist_avg) * 100;
        return {
          route: row.route,
          date: row.search_date,
          price: row.price,
          hist_avg: Math.round(row.hist_avg * 100) / 100,
          savings_pct: Math.round(savingsPct * 10) / 10,
          airline: row.airline || 'Unknown',
          fetched_at: row.fetched_at,
        };
      })
      .sort((a, b) => b.savings_pct - a.savings_pct)
      .slice(0, 50);

    return NextResponse.json(
      { deals: errorFares, generated_at: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('[/api/deals] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch deals', deals: [], generated_at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
