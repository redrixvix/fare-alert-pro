import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db-prod';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Missing date param' }, { status: 400 });
  }

  const client = getClient();
  const rows = await client.query('prices:getPricesByDate', { date }) as any[];

  return NextResponse.json({ date, count: rows.length, prices: rows });
}
