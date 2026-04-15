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
  const cabin = (searchParams.get('cabin') ?? 'ECONOMY').toUpperCase();
  const days = Math.min(90, Math.max(30, parseInt(searchParams.get('days') ?? '30', 10)));

  const validCabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
  const cabinParam = validCabins.includes(cabin) ? cabin : 'ECONOMY';

  const client = getClient();
  const result = await client.query('prices:getPriceHistory', {
    route,
    cabin: cabinParam,
    days,
  }) as any;

  return NextResponse.json({
    route,
    cabin: cabinParam,
    days,
    data: result?.data ?? [],
    stats: result?.stats ?? { min: 0, max: 0, avg: 0, currentVsAvg: 0, trend: 'flat' },
  });
}
