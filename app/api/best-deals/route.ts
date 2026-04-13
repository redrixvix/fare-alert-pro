import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db-prod';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = getClient();
    const rows = await client.query('prices:getRecentPrices', { limit: 1000 }) as any[];
    if (!rows || rows.length === 0) return NextResponse.json({});

    const cabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
    const deals: Record<string, { route: string; price: number; airline: string | null; days_out: number }[]> = {};

    for (const cabin of cabins) {
      const cabinRows = rows.filter((r: any) => r.cabin === cabin && r.price > 0 && r.searchDate);
      // Get latest price per route
      const routeMap: Record<string, any> = {};
      for (const row of cabinRows) {
        const existing = routeMap[row.route];
        if (!existing || new Date(row.fetchedAt) > new Date(existing.fetchedAt)) {
          routeMap[row.route] = row;
        }
      }
      const sorted = Object.values(routeMap)
        .filter((r: any) => {
          const daysOut = Math.floor((new Date(r.searchDate).getTime() - Date.now()) / 86400000);
          return daysOut >= 0;
        })
        .sort((a: any, b: any) => a.price - b.price)
        .slice(0, 5);

      const cabinKey = cabin === 'ECONOMY' ? 'y' : cabin === 'PREMIUM_ECONOMY' ? 'pe' : cabin === 'BUSINESS' ? 'j' : 'f';
      deals[cabinKey] = sorted.map((r: any) => ({
        route: r.route,
        price: r.price,
        airline: r.airline || null,
        days_out: Math.floor((new Date(r.searchDate).getTime() - Date.now()) / 86400000),
      }));
    }

    return NextResponse.json(deals);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
