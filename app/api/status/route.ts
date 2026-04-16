// @ts-nocheck
import { NextResponse } from 'next/server';
import { getRecentPrices, getAlertsHistory, getAllRoutes } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [prices, alertsData, routes] = await Promise.all([
      getRecentPrices(200),
      getAlertsHistory(1, 200),
      getAllRoutes(),
    ]);

    const totalPrices = prices.length;
    const totalAlerts = alertsData.length;
    const today = new Date().toISOString().split('T')[0];
    const alertsToday = alertsData.filter((a) => a.created_at && a.created_at.startsWith(today)).length;
    const routesTracked = routes.length;
    const lastCheck = prices[0]?.fetched_at || null;

    return NextResponse.json({
      totalPrices,
      totalAlerts,
      alertsToday,
      routesTracked,
      lastCheck,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
