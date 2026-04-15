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
  const result = await client.query('prices:getCheapestDates', { route, months }) as any;

  return NextResponse.json({
    dates: result?.dates ?? [],
    minPrice: result?.minPrice ?? null,
    maxPrice: result?.maxPrice ?? null,
    avgPrice: result?.avgPrice ?? null,
  });
}
