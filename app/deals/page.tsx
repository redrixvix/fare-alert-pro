import Link from 'next/link';
import DealsInteractive from './DealsInteractive';
import './deals.css';

export const dynamic = 'force-dynamic';

async function getDeals() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/deals`, { cache: 'no-store' });
    if (!res.ok) return { deals: [], generated_at: new Date().toISOString() };
    return res.json();
  } catch {
    return { deals: [], generated_at: new Date().toISOString() };
  }
}

export default async function DealsPage() {
  const { deals, generated_at } = await getDeals();
  return (
    <main className="deals-page">
      {/* Nav */}
      <nav className="deals-nav">
        <div className="deals-nav-inner">
          <Link href="/" className="deals-nav-logo">
            ✈️ FareAlertPro
          </Link>
          <div className="deals-nav-links">
            <Link href="/login" style={{ color: '#a0a8c0', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500, padding: '0.4rem 0.9rem', border: '1px solid #2a2d3a', borderRadius: '6px' }}>Log in</Link>
            <Link href="/signup" className="deals-nav-cta">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="deals-hero">
        <div className="deals-hero-inner">
          <div className="deals-hero-badge">🚨 Error Fares</div>
          <h1 className="deals-hero-title"><span>Error Fares</span> Found</h1>
          <p className="deals-hero-sub">
            {deals.length > 0 ? `${deals.length} fare anomaly${deals.length !== 1 ? 's' : ''} detected across your watched routes` : 'Monitoring routes 24/7 — check back soon'}
          </p>
          {deals.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>New error fares appear when prices crash below 50% of their 30-day average</p>
          )}
        </div>
      </section>

      <DealsInteractive deals={deals} generatedAt={generated_at} />
    </main>
  );
}
