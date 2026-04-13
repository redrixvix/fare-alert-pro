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
  const prices = await client.query('prices:getPricesByRoute', { route: decoded, cabin: 'ECONOMY' }) as any[];
  return NextResponse.json({ prices });
}
