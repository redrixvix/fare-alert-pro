// @ts-nocheck
import { NextResponse } from 'next/server';
import { getRecentPrices } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await getRecentPrices(200);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ deals: [], generated_at: new Date().toISOString() });
    }

    const routeStats: Record<string, { histTotal: number; histCount: number; latest: any }> = {};
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const row of rows) {
      const { route, cabin, price, fetched_at, airline, search_date } = row;
      if (cabin !== 'ECONOMY' || price <= 0) continue;

      if (!routeStats[route]) routeStats[route] = { histTotal: 0, histCount: 0, latest: null };

      if (fetched_at >= cutoff30 && price > 0) {
        routeStats[route].histTotal += price;
        routeStats[route].histCount++;
      }

      if (fetched_at >= cutoff7 && (!routeStats[route].latest || fetched_at > routeStats[route].latest.fetched_at)) {
        routeStats[route].latest = { price, airline, fetched_at, search_date };
      }
    }

    const errorFares = [];
    for (const [route, stats] of Object.entries(routeStats)) {
      if (!stats.latest || stats.histCount === 0) continue;
      const histAvg = stats.histTotal / stats.histCount;
      if (stats.latest.price < 0.5 * histAvg) {
        const savingsPct = ((histAvg - stats.latest.price) / histAvg) * 100;
        errorFares.push({
          route,
          date: stats.latest.search_date,
          price: stats.latest.price,
          hist_avg: Math.round(histAvg),
          savings_pct: Math.round(savingsPct),
          airline: stats.latest.airline,
          fetched_at: stats.latest.fetched_at,
        });
      }
    }

    errorFares.sort((a, b) => b.savings_pct - a.savings_pct);
    return NextResponse.json({ deals: errorFares.slice(0, 30), generated_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
