import { redirect } from 'next/navigation';
import RoutesClient from './RoutesClient';
import '../dashboard.css';

export const dynamic = 'force-dynamic';

export default async function RoutesPage() {
  // Auth check is handled client-side in RoutesClient
  // For initial load, we redirect if no auth
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

      <RoutesClient />
    </main>
  );
}