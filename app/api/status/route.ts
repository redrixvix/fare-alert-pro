// @ts-nocheck
import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://fiery-opossum-933.convex.cloud';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = new ConvexHttpClient(CONVEX_URL);
    
    const [prices, alertsData, routes] = await Promise.all([
      client.query('prices:getRecentPrices', {}),
      client.query('alerts:getAlertsHistory', { userId: 1 }),
      client.query('routes:getAllRoutes', {}),
    ]);

    const totalPrices = prices.length;
    const totalAlerts = alertsData.alerts?.length ?? 0;
    const today = new Date().toISOString().split('T')[0];
    const alertsToday = (alertsData.alerts || []).filter((a) => a.created_at && a.created_at.startsWith(today)).length;
    const routesTracked = routes.length;

    const lastCheck = prices[0]?.fetched_at || null;

    return NextResponse.json({
      totalPrices,
      totalAlerts,
      alertsToday,
      routesTracked,
      lastCheck,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}