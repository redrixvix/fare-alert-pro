import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db-prod';
import { v } from 'convex/values';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = getClient();
    // Get all recent prices from the last 7 days
    const rows = await client.query('prices:getRecentPrices', { limit: 200 }) as any[];
    if (!rows || rows.length === 0) {
      return NextResponse.json({ deals: [], generated_at: new Date().toISOString() });
    }

    // Build map: route -> { hist_avg, latest price }
    const routeStats: Record<string, { histTotal: number; histCount: number; latest: any }> = {};
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const row of rows) {
      const { route, cabin, price, fetchedAt, airline, searchDate } = row;
      if (cabin !== 'ECONOMY' || price <= 0) continue;

      if (!routeStats[route]) {
        routeStats[route] = { histTotal: 0, histCount: 0, latest: null };
      }

      // Accumulate 30-day history for hist_avg
      if (fetchedAt >= cutoff30 && price > 0) {
        routeStats[route].histTotal += price;
        routeStats[route].histCount++;
      }

      // Keep latest from last 7 days
      if (fetchedAt >= cutoff7 && (!routeStats[route].latest || fetchedAt > routeStats[route].latest.fetchedAt)) {
        routeStats[route].latest = { price, airline, fetchedAt, searchDate };
      }
    }

    // Filter: price < 50% of 30-day average
    const errorFares = [];
    for (const [route, stats] of Object.entries(routeStats)) {
      if (!stats.latest || stats.histCount === 0) continue;
      const histAvg = stats.histTotal / stats.histCount;
      if (stats.latest.price < 0.5 * histAvg) {
        const savingsPct = ((histAvg - stats.latest.price) / histAvg) * 100;
        errorFares.push({
          route,
          date: stats.latest.searchDate,
          price: stats.latest.price,
          hist_avg: Math.round(histAvg * 100) / 100,
          savings_pct: Math.round(savingsPct * 10) / 10,
          airline: stats.latest.airline || 'Unknown',
          fetched_at: stats.latest.fetchedAt,
        });
      }
    }

    errorFares.sort((a, b) => b.savings_pct - a.savings_pct);

    return NextResponse.json(
      { deals: errorFares.slice(0, 50), generated_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err) {
    console.error('[/api/deals] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch deals', deals: [], generated_at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
