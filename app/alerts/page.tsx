import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import History from './History';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }
  return <History />;
}