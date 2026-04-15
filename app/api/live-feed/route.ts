// @ts-nocheck
import { NextResponse } from 'next/server';
import { getRecentPrices } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prices = await getRecentPrices(200);
    return NextResponse.json({ prices });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
