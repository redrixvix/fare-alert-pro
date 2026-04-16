// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAlertsHistory } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const alerts = await getAlertsHistory(1, 200);
    return NextResponse.json({ alerts });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
