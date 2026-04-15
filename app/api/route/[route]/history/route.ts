// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPriceHistory } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route: routeParam } = await params;
  const route = decodeURIComponent(routeParam);

  const { searchParams } = new URL(request.url);
  const cabin = (searchParams.get('cabin') ?? 'ECONOMY').toUpperCase();
  const days = Math.min(90, Math.max(30, parseInt(searchParams.get('days') ?? '30', 10)));

  const validCabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
  const cabinParam = validCabins.includes(cabin) ? cabin : 'ECONOMY';

  const rows = await getPriceHistory(route, cabinParam, days);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ route, cabin: cabinParam, days, data: [], stats: null });
  }

  const allPrices = rows.map((r) => r.price).filter((p) => p > 0);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const avg = allPrices.reduce((s, p) => s + p, 0) / allPrices.length;
  const lastPrice = rows[rows.length - 1]?.price ?? 0;
  const currentVsAvg = avg > 0 ? ((lastPrice - avg) / avg) * 100 : 0;
  const trend = currentVsAvg > 2 ? 'up' : currentVsAvg < -2 ? 'down' : 'flat';

  return NextResponse.json({
    route,
    cabin: cabinParam,
    days,
    data: rows.map((r) => ({ date: r.date, price: r.price, avg_30: r.price })),
    stats: { min, max, avg: Math.round(avg), currentVsAvg: Math.round(currentVsAvg * 10) / 10, trend },
  });
}
