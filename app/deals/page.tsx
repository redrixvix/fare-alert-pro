import Link from 'next/link';
import { ConvexHttpClient } from 'convex/browser';
import DealsInteractive from './DealsInteractive';
import './deals.css';

export const dynamic = 'force-dynamic';

interface Deal {
  route: string;
  date: string;
  price: number;
  hist_avg: number;
  savings_pct: number;
  airline: string;
  fetched_at: string;
}

async function getDeals(): Promise<{ deals: Deal[]; generated_at: string }> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    // Fallback to API route if Convex not configured
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${baseUrl}/api/deals`, { cache: 'no-store' });
      if (!res.ok) return { deals: [], generated_at: new Date().toISOString() };
      return res.json();
    } catch {
      return { deals: [], generated_at: new Date().toISOString() };
    }
  }
  try {
    const client = new ConvexHttpClient(convexUrl);
    const result = await client.query('prices:getBestDeals' as any, {});
    return result;
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
            <Link
              href="/login"
              style={{
                color: '#a0a8c0',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 500,
                padding: '0.4rem 0.9rem',
                border: '1px solid #2a2d3a',
                borderRadius: '6px',
              }}
            >
              Log in
            </Link>
            <Link href="/signup" className="deals-nav-cta">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="deals-hero">
        <div className="deals-hero-inner">
          <div className="deals-hero-badge">🚨 Error Fares</div>
          <h1 className="deals-hero-title">
            <span>Error Fares</span> Found
          </h1>
          <p className="deals-hero-sub">
            Flights priced at least 50% below their 30-day average.
            Book fast — error fares disappear fast.
          </p>
          {deals.length > 0 && (
            <div className="deals-hero-count">
              🔥 {deals.length} active deal{deals.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </section>

      {/* Interactive deals list (client component handles sort state) */}
      <DealsInteractive deals={deals} generatedAt={generated_at} />

      {/* Footer */}
      <footer className="deals-footer">
        <p>
          Powered by <Link href="/">FareAlertPro</Link> ·{' '}
          <Link href="/signup">Subscribe</Link> to get these alerts in your inbox
        </p>
      </footer>
    </main>
  );
}
