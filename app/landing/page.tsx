import Link from 'next/link';
import '../landing.css';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <main className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-inner">
          <div className="nav-logo">✈️ FareAlert<span>Pro</span></div>
          <div className="nav-links">
            <Link href="/login" className="nav-btn-outline">Log in</Link>
            <Link href="/signup" className="nav-btn-primary">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">Real-Time Fare Alerts</div>
          <h1 className="hero-title">
            Never miss a<br />
            <span className="hero-accent">flight error fare</span>
          </h1>
          <p className="hero-sub">
            We monitor 30+ popular routes × 4 cabin classes in real time.
            When fares crash — business class for $234, first class for $285 — you get notified instantly via Telegram.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn-primary-lg">
              Start Monitoring Free
            </Link>
            <span className="hero-note">No credit card · 30-day free trial</span>
            <Link href="/deals" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
              See current error fares →
            </Link>
          </div>

          {/* Example alert */}
          <div className="hero-example">
            <div className="example-label">Real alert we caught today:</div>
            <div className="example-card">
              <div className="example-route">PIT → LAS · Premium Economy</div>
              <div className="example-prices">
                <span className="example-sale">$175</span>
                <span className="example-normal">was ~$375</span>
                <span className="example-savings">52% OFF</span>
              </div>
              <div className="example-airline">Frontier Airlines · May 2, 2026</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how">
        <div className="how-inner">
          <h2 className="section-title">How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Pick your routes</h3>
              <p>Choose the routes you actually fly. We monitor both directions — origin and destination airports you care about.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>We watch 24/7</h3>
              <p>Every minute, we check Google Flights for all 4 cabin classes across 91 days of travel dates. That&apos;s thousands of price points daily.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Telegram alert hits</h3>
              <p>When a fare drops more than 50% below its historical average — you get a Telegram message instantly. Booking link included.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing">
        <div className="pricing-inner">
          <h2 className="section-title">Simple pricing</h2>
          <div className="pricing-grid">
            <div className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-price">$0<span>/mo</span></div>
              <ul className="plan-features">
                <li>5 custom routes</li>
                <li>Economy cabin alerts</li>
                <li>Telegram notifications</li>
                <li>30-day price history</li>
                <li className="disabled">Business / First class</li>
              </ul>
              <Link href="/signup" className="btn-outline-lg">Get Started</Link>
            </div>
            <div className="plan plan-featured">
              <div className="plan-badge">Most Popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">$9<span>/mo</span></div>
              <ul className="plan-features">
                <li>Unlimited routes</li>
                <li>All 4 cabin classes</li>
                <li>Telegram notifications</li>
                <li>90-day history + charts</li>
                <li>Historical anomaly detection</li>
                <li>Best deals dashboard</li>
              </ul>
              <Link href="/signup?plan=pro" className="btn-primary-lg">Start 30-Day Free Trial</Link>
              <p className="plan-trial">Cancel anytime · No card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <span>✈️ FareAlertPro</span>
          <span>Powered by Google Flights data</span>
        </div>
      </footer>
    </main>
  );
}
