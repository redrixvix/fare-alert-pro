// @ts-nocheck
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect('/landing');

  return <DashboardClient />;
}