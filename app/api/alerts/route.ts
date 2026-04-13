// API route for recent alerts
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getClient();
  const alerts = await client.query('alerts:getAlertsHistory', { userId: -1, limit: 50 }) as any[];
  return NextResponse.json({ alerts });
}
