// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAlertsHistory } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const alerts = await getAlertsHistory(user.userId, 50);
  return NextResponse.json({ alerts });
}
