import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route: routeParam } = await params;
  const route = decodeURIComponent(routeParam);

  const { searchParams } = new URL(request.url);
  const cabin = (searchParams.get('cabin') ?? 'ECONOMY').toUpperCase() as string;
  const days = Math.min(90, Math.max(30, parseInt(searchParams.get('days') ?? '30', 10)));

  const validCabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
  const cabinParam = validCabins.includes(cabin) ? cabin : 'ECONOMY';

  const client = getClient();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = await client.query('prices:getPriceHistory', { route, limit: 500 }) as any[];
  const filtered = rows.filter((r: any) =>
    r.cabin === cabinParam && r.searchDate >= cutoffDate && r.price > 0
  ).sort((a: any, b: any) => a.searchDate.localeCompare(b.searchDate));

  if (!filtered.length) {
    return NextResponse.json({
      route, cabin: cabinParam, days, data: [],
      stats: { min: 0, max: 0, avg: 0, currentVsAvg: 0, trend: 'flat' },
    });
  }

  // Compute 30-day rolling average for each date
  const data: { date: string; price: number; avg_30: number }[] = [];
  const sorted = filtered;

  for (let i = 0; i < sorted.length; i++) {
    const date = sorted[i].searchDate;
    const price = sorted[i].price;
    const windowStart = new Date(new Date(date).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const windowPrices = sorted
      .filter((r: any) => r.searchDate >= windowStart && r.searchDate <= date)
      .map((r: any) => r.price);
    const avg = windowPrices.length ? windowPrices.reduce((a: number, b: number) => a + b, 0) / windowPrices.length : price;
    data.push({ date: date.split('T')[0], price, avg_30: Math.round(avg * 100) / 100 });
  }

  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const last = data[data.length - 1];
  const currentVsAvg = last ? Math.round(((last.price - last.avg_30) / last.avg_30) * 1000) / 10 : 0;

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

  return NextResponse.json({ route, cabin: cabinParam, days, data, stats: { min: Math.round(min), max: Math.round(max), avg: Math.round(avg), currentVsAvg, trend } });
}