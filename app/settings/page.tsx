import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TelegramSettings from './TelegramSettings';
import '../dashboard.css';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/landing');

  const db = getDb();
  const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.userId) as any;
  const userRoutes = db.prepare('SELECT * FROM user_routes WHERE user_id = ? AND active = 1').all(user.userId) as any[];

  const plans = [
    { id: 'free', name: 'Free', price: '$0/mo', routes: '5 routes', cabins: 'Economy only', priceColor: 'var(--text-muted)' },
    { id: 'pro',  name: 'Pro',  price: '$9/mo', routes: 'Unlimited',   cabins: 'All 4 cabin classes', priceColor: 'var(--success)' },
  ];

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
              <div className="settings-value">{dbUser?.email}</div>
            </div>
            <div className="settings-card">
              <div className="settings-label">Plan</div>
              <div className="settings-value" style={{ color: dbUser?.plan === 'pro' ? 'var(--success)' : 'var(--cabin-y)' }}>
                {dbUser?.plan === 'pro' ? 'Pro' : 'Free'}
                {dbUser?.plan === 'free' && (
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 400 }}>
                    {' · '}
                    <Link href="#plans" style={{ color: 'var(--accent)', fontSize: 'var(--fs-sm)' }}>Upgrade →</Link>
                  </span>
                )}
              </div>
            </div>
            <div className="settings-card">
              <div className="settings-label">Member since</div>
              <div className="settings-value">
                {dbUser?.created_at
                  ? new Date(dbUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : '—'}
              </div>
            </div>
            <div className="settings-card">
              <div className="settings-label">Custom routes</div>
              <div className="settings-value">
                {userRoutes.length}{dbUser?.plan === 'free' ? ' / 5' : ''}
              </div>
            </div>
          </div>
        </section>

        {/* Telegram */}
        <TelegramSettings user={dbUser} />

        {/* Plans */}
        <section className="section" id="plans">
          <h2>📦 Plans</h2>
          <div className="pricing-grid" style={{ maxWidth: 700 }}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`plan${plan.id === 'pro' ? ' plan-featured' : ''}`}
              >
                {plan.id === 'pro' && <div className="plan-badge">Recommended</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price" style={{ color: plan.priceColor }}>{plan.price}</div>
                <ul className="plan-features">
                  <li>✓ {plan.routes}</li>
                  <li>✓ {plan.cabins}</li>
                  <li>✓ Telegram alerts</li>
                  <li>✓ Price charts & history</li>
                </ul>
                {dbUser?.plan !== plan.id ? (
                  plan.id === 'pro' ? (
                    <button className="btn-primary-full btn-loading" disabled style={{ marginTop: 'var(--sp-4)' }}>
                      {dbUser?.plan === 'free' ? 'Start 30-Day Free Trial' : 'Upgrade to Pro'}
                    </button>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-4)', textAlign: 'center' }}>
                      Current plan
                    </div>
                  )
                ) : (
                  <div style={{ color: 'var(--success)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-4)', textAlign: 'center', fontWeight: 600 }}>
                    ✓ Current plan
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Log out */}
        <section className="section">
          <h2>🚪 Danger Zone</h2>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="btn btn-danger-ghost"
            >
              Sign out of FareAlertPro
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
