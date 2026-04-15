import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getAuthUser } from '@/lib/auth';
import RoutesClient from './RoutesClient';
import '../dashboard.css';

export const dynamic = 'force-dynamic';

export default async function RoutesPage() {
  const user = await getAuthUser();
  if (!user) redirect('/landing');

  return (
    <main className="dashboard">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a
              href="/"
              style={{ color: '#7a7d8e', textDecoration: 'none', fontSize: '0.9rem' }}
            >
              ← Dashboard
            </a>
            <h1>🛫 Route List</h1>
          </div>
          <p className="subtitle">Search date: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading routes...</div>}>
        <RoutesClient />
      </Suspense>
    </main>
  );
}