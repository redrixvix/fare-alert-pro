import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AlertsHistory from './AlertsHistory';

export const dynamic = 'force-dynamic';

async function fetchAlertsHistory(userId: number) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/alerts/history?userId=${userId}`, { cache: 'no-store' });
    if (!res.ok) return { alerts: [], stats: { total_alerts: 0, total_savings: 0, average_savings_pct: 0, best_deal: null, recent_month_savings: 0 } };
    return res.json();
  } catch {
    return { alerts: [], stats: { total_alerts: 0, total_savings: 0, average_savings_pct: 0, best_deal: null, recent_month_savings: 0 } };
  }
}

export default async function AlertsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/landing');

  const data = await fetchAlertsHistory(user.userId);
  return <AlertsHistory initialData={data} />;
}
