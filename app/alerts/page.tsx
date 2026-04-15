import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { ConvexHttpClient } from 'convex/browser';
import AlertsHistory from './AlertsHistory';

export const dynamic = 'force-dynamic';

async function fetchAlertsHistory(userId: number) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return { alerts: [], stats: { total_alerts: 0, total_savings: 0, average_savings_pct: 0, best_deal: null, recent_month_savings: 0 } };
  }
  try {
    const client = new ConvexHttpClient(convexUrl);
    return await client.query('alerts:getAlertsHistory' as any, { userId });
  } catch (e) {
    console.error('Convex query failed:', e);
    return { alerts: [], stats: { total_alerts: 0, total_savings: 0, average_savings_pct: 0, best_deal: null, recent_month_savings: 0 } };
  }
}

export default async function AlertsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/landing');

  const data = await fetchAlertsHistory(user.userId);

  return <AlertsHistory initialData={data} />;
}