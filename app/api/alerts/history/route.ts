// @ts-nocheck
import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://fiery-opossum-933.convex.cloud';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = new ConvexHttpClient(CONVEX_URL);
    const result = await client.query('alerts:getAlertsHistory', { userId: 1 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}