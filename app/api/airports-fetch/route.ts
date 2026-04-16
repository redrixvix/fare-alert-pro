// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserAirports } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const airports = await getUserAirports(user.userId);
  return NextResponse.json({ airports });
}
