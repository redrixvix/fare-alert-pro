import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ route: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route } = await params;
  const decoded = decodeURIComponent(route);

  const client = getClient();
  const rows = await client.query('prices:getPriceHistory', { route: decoded, limit: 500 }) as any[];

  // Group by date and pivot by cabin
  const byDate: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const date = row.searchDate.split('T')[0];
    if (!byDate[date]) byDate[date] = {};
    const key = row.cabin === 'ECONOMY' ? 'y'
      : row.cabin === 'PREMIUM_ECONOMY' ? 'pe'
      : row.cabin === 'BUSINESS' ? 'j' : 'f';
    byDate[date][key] = row.price;
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