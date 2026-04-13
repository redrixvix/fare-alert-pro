// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

export async function GET(request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route: routeParam } = await params;
  const route = decodeURIComponent(routeParam);

  const { searchParams } = new URL(request.url);
  const months = Math.min(3, Math.max(1, parseInt(searchParams.get('months') ?? '1', 10)));

  const client = getClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const rows = await client.query('prices:getCheapestDates', {
    route, startDate: todayStr, endDate, limit: 500
  }) as any[];

  if (!rows || rows.length === 0) {
    return NextResponse.json({ dates: [], minPrice: null, maxPrice: null, avgPrice: null });
  }

  const minPrice = Math.min(...rows.map(r => r.price));
  const maxPrice = Math.max(...rows.map(r => r.price));
  const avgPrice = rows.reduce((sum, r) => sum + r.price, 0) / rows.length;

  const dates = rows.map(r => ({
    date: r.searchDate.split('T')[0],
    price: r.price,
    is_cheapest: r.price === minPrice,
  }));

  return NextResponse.json({ dates, minPrice, maxPrice, avgPrice });
}