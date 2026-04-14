// @ts-nocheck
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TelegramSettings from './TelegramSettings';
import WatchesSettings from './WatchesSettings';
import AirportSettings from './AirportSettings';
import '../dashboard.css';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/landing');

  return (
    <main className="dashboard">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/dashboard" className="back-link">← Dashboard</Link>
            <h1>⚙️ Settings</h1>
          </div>
        </div>
      </header>

      <div className="content">
        {/* Account */}
        <section className="section">
          <h2>👤 Account</h2>
          <div className="settings-grid">
            <div className="settings-card">
              <div className="settings-label">Email</div>
              <div className="settings-value">{user.email}</div>
            </div>
            <div className="settings-card">
              <div className="settings-label">Plan</div>
              <div className="settings-value" style={{ color: user.plan === 'pro' ? 'var(--success)' : 'var(--cabin-y)' }}>
                {user.plan === 'pro' ? 'Pro' : 'Free'}
                {user.plan === 'free' && (
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 400 }}>
                    {' · '}
                    <Link href="#plans" style={{ color: 'var(--accent)', fontSize: 'var(--fs-sm)' }}>Upgrade →</Link>
                  </span>
                )}
              </div>
            </div>
            <div className="settings-card">
              <div className="settings-label">Member since</div>
              <div className="settings-value">—</div>
            </div>
          </div>
        </section>

        {/* Telegram */}
        <TelegramSettings user={user} />

        {/* Price Watches */}
        <section className="section">
          <WatchesSettings />
        </section>

        {/* Airport Settings */}
        <section className="section">
          <AirportSettings />
        </section>

        {/* Plans */}
        <section className="section" id="plans">
          <h2>📦 Plans</h2>
          <div className="pricing-grid" style={{ maxWidth: 700 }}>
            <div className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-price" style={{ color: 'var(--text-muted)' }}>$0/mo</div>
              <ul className="plan-features">
                <li>✓ 5 routes</li>
                <li>✓ Economy only</li>
                <li>✓ Telegram alerts</li>
                <li>✓ Price charts</li>
              </ul>
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-4)', textAlign: 'center' }}>
                Current plan
              </div>
            </div>
            <div className="plan plan-featured">
              <div className="plan-badge">Recommended</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price" style={{ color: 'var(--success)' }}>$9/mo</div>
              <ul className="plan-features">
                <li>✓ Unlimited routes</li>
                <li>✓ All 4 cabin classes</li>
                <li>✓ Telegram alerts</li>
                <li>✓ Price charts & history</li>
              </ul>
              <button className="btn-primary-full btn-loading" disabled style={{ marginTop: 'var(--sp-4)' }}>
                Start 30-Day Free Trial
              </button>
            </div>
          </div>
        </section>

        {/* Log out */}
        <section className="section">
          <h2>🚪 Danger Zone</h2>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn btn-danger-ghost">
              Sign out of FareAlertPro
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
