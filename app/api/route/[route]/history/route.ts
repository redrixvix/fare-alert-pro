import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

interface PricePoint {
  date: string;
  price: number;
  avg_30: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { route: routeParam } = await params;
  const route = decodeURIComponent(routeParam);

  const { searchParams } = new URL(request.url);
  const cabin = (searchParams.get('cabin') ?? 'ECONOMY').toUpperCase() as string;
  const days = Math.min(90, Math.max(30, parseInt(searchParams.get('days') ?? '30', 10)));

  const validCabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
  const cabinParam = validCabins.includes(cabin) ? cabin : 'ECONOMY';

  const db = getDb();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Fetch all prices for the route+cabin within the window
  const rows = db.prepare(`
    SELECT search_date, price
    FROM prices
    WHERE route = ? AND cabin = ? AND search_date >= ? AND price > 0
    ORDER BY search_date ASC
  `).all(route, cabinParam, cutoffDate) as { search_date: string; price: number }[];

  if (!rows.length) {
    return NextResponse.json({
      route,
      cabin: cabinParam,
      days,
      data: [],
      stats: { min: 0, max: 0, avg: 0, currentVsAvg: 0, trend: 'flat' },
    });
  }

  // Build date -> price map
  const priceByDate: Record<string, number> = {};
  for (const row of rows) {
    priceByDate[row.search_date] = row.price;
  }

  // Compute 30-day rolling average for each date
  const sortedDates = Object.keys(priceByDate).sort();
  const data: PricePoint[] = [];

  for (const date of sortedDates) {
    const windowStart = new Date(new Date(date).getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Collect prices in the 30-day window ending on this date
    const windowPrices: number[] = [];
    for (const d of sortedDates) {
      if (d >= windowStart && d <= date) {
        windowPrices.push(priceByDate[d]);
      }
    }

    const avg = windowPrices.length
      ? windowPrices.reduce((a, b) => a + b, 0) / windowPrices.length
      : priceByDate[date];

    data.push({ date, price: priceByDate[date], avg_30: Math.round(avg * 100) / 100 });
  }

  // Stats
  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Current vs avg: compare last price to last avg
  const last = data[data.length - 1];
  const currentVsAvg = last ? Math.round(((last.price - last.avg_30) / last.avg_30) * 1000) / 10 : 0;

  // Trend: compare last 3 prices to previous 3
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (data.length >= 6) {
    const recent = data.slice(-3).map(d => d.price);
    const prior = data.slice(-6, -3).map(d => d.price);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
    const diff = (recentAvg - priorAvg) / priorAvg;
    if (diff > 0.03) trend = 'up';
    else if (diff < -0.03) trend = 'down';
  }

  return NextResponse.json({
    route,
    cabin: cabinParam,
    days,
    data,
    stats: {
      min: Math.round(min),
      max: Math.round(max),
      avg: Math.round(avg),
      currentVsAvg,
      trend,
    },
  });
}