import { NextResponse } from 'next/server';
import { getRecentPrices } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const prices = getRecentPrices(20);
  return NextResponse.json({ prices });
}
