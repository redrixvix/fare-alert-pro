// @ts-nocheck
import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db-prod';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = getClient();
  const prices = await client.query('prices:getRecentPrices', { limit: 20 }) as any[];
  return NextResponse.json({ prices });
}