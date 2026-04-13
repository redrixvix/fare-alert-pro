// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getClient();
  const result = await client.query('alerts:getAlertsHistory', { userId: user.userId, limit: 100 }) as any;
  return NextResponse.json(result);
}