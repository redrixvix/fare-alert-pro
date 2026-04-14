// @ts-nocheck
import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db-prod';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = getClient();
    const [prices, alerts, routes] = await Promise.all([
      client.query('prices:getRecentPrices', { limit: 1000 }),
      client.query('alerts:getAlertsHistory', { userId: -1 }),
      client.query('routes:getAllRoutes', {}),
    ]) as [any[], any[], any[]];

    const totalPrices = prices.length;
    const totalAlerts = alerts.length;
    const today = new Date().toISOString().split('T')[0];
    const alertsToday = alerts.filter((a) => a.createdAt && a.createdAt.startsWith(today)).length;
    const routesTracked = routes.length;

    const routeMap: Record<string, Set<string>> = {};
    for (const p of prices) {
      if (!routeMap[p.route]) routeMap[p.route] = new Set();
      routeMap[p.route].add(p.searchDate?.split('T')[0] || '');
    }
    const coverage = Object.fromEntries(
      Object.entries(routeMap).map(([k, v]) => [k, v.size])
    );

    const lastCheck = prices[0]?.fetchedAt || null;
    const nextCheck = lastCheck
      ? new Date(new Date(lastCheck).getTime() + 60 * 1000).toISOString()
      : null;

    return NextResponse.json({
      totalPrices,
      totalAlerts,
      alertsToday,
      routesTracked,
      lastCheck,
      nextCheck,
      cronIntervalSeconds: 60,
      coverage,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}