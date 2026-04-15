// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPricesByRoute } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route } = await params;
  const decoded = decodeURIComponent(route);

  const rows = await getPricesByRoute(decoded, 'ECONOMY');
  return NextResponse.json({ prices: rows });
}
