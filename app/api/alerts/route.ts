// API route for recent alerts
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getRecentAlerts } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const alerts = getRecentAlerts(50);
  return NextResponse.json({ alerts });
}
