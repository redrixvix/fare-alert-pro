// @ts-nocheck
import { NextResponse } from 'next/server';
import { getRecentPrices } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await getRecentPrices(200);
    if (!rows || rows.length === 0) return NextResponse.json({});

    const cabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
    const deals: Record<string, { route: string; price: number; airline: string | null; days_out: number }[]> = {};

    for (const cabin of cabins) {
      const cabinRows = rows.filter((r) => r.cabin === cabin && r.price > 0 && r.search_date);
      const routeMap: Record<string, any> = {};
      for (const row of cabinRows) {
        const existing = routeMap[row.route];
        if (!existing || new Date(row.fetched_at) > new Date(existing.fetched_at)) {
          routeMap[row.route] = row;
        }
      }
      const sorted = Object.values(routeMap)
        .filter((r) => {
          const daysOut = Math.floor((new Date(r.search_date).getTime() - Date.now()) / 86400000);
          return daysOut >= 0;
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 5);

      const cabinKey = cabin === 'ECONOMY' ? 'y' : cabin === 'PREMIUM_ECONOMY' ? 'pe' : cabin === 'BUSINESS' ? 'j' : 'f';
      deals[cabinKey] = sorted.map((r) => ({
        route: r.route,
        price: r.price,
        airline: r.airline || null,
        days_out: Math.floor((new Date(r.search_date).getTime() - Date.now()) / 86400000),
      }));
    }

    return NextResponse.json(deals);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
