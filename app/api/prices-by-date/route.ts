// @ts-nocheck
import { NextResponse } from 'next/server';
import { getPricesByDate } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Missing date param' }, { status: 400 });
  }

  const rows = await getPricesByDate(date);
  return NextResponse.json({ date, count: rows.length, prices: rows });
}
