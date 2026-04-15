// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPriceHistory } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route } = await params;
  const decoded = decodeURIComponent(route);

  const cabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
  const byDate: Record<string, Record<string, number | null>> = {};

  for (const cabin of cabins) {
    const rows = await getPriceHistory(decoded, cabin, 90);
    for (const r of rows) {
      if (!byDate[r.date]) byDate[r.date] = {};
      const key = cabin === 'ECONOMY' ? 'y'
        : cabin === 'PREMIUM_ECONOMY' ? 'pe'
        : cabin === 'BUSINESS' ? 'j' : 'f';
      byDate[r.date][key] = r.price;
    }
  }

  const data = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cabins]) => ({
      date,
      y: cabins.y ?? null,
      pe: cabins.pe ?? null,
      j: cabins.j ?? null,
      f: cabins.f ?? null,
    }));

  return NextResponse.json({ data });
}
