import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    const totalPrices = (db.prepare('SELECT COUNT(*) as cnt FROM prices').get() as any).cnt as number;
    const totalAlerts = (db.prepare('SELECT COUNT(*) as cnt FROM alerts').get() as any).cnt as number;
    const alertsToday = (db.prepare("SELECT COUNT(*) as cnt FROM alerts WHERE DATE(created_at) = DATE('now')").get() as any).cnt as number;
    const routesTracked = (db.prepare('SELECT COUNT(*) as cnt FROM routes').get() as any).cnt as number;

    // Coverage per route — how many distinct dates each route has
    const coverageRows = db
      .prepare("SELECT route, COUNT(DISTINCT search_date) as date_count FROM prices GROUP BY route")
      .all() as { route: string; date_count: number }[];

    // Get last check time from the most recent price
    const lastPrice = db.prepare('SELECT fetched_at FROM prices ORDER BY fetched_at DESC LIMIT 1').get() as { fetched_at: string } | undefined;
    const lastCheck = lastPrice?.fetched_at || null;

    // Get next scheduled check (cron runs every 60s)
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
      coverage: coverageRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.route] = row.date_count;
        return acc;
      }, {}),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
