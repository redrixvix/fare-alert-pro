// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCheapestDates } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route: routeParam } = await params;
  const route = decodeURIComponent(routeParam);

  const { searchParams } = new URL(request.url);
  const months = Math.min(3, Math.max(1, parseInt(searchParams.get('months') ?? '1', 10)));

  const rows = await getCheapestDates(route, months);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ dates: [], minPrice: null, maxPrice: null, avgPrice: null });
  }

  const minPrice = Math.min(...rows.map((d) => d.price));
  const maxPrice = Math.max(...rows.map((d) => d.price));
  const avgPrice = rows.reduce((s, d) => s + d.price, 0) / rows.length;

  const dates = rows.map((d) => ({
    date: d.date,
    price: d.price,
    is_cheapest: d.price === minPrice,
  }));

  return NextResponse.json({ dates, minPrice, maxPrice, avgPrice });
}
