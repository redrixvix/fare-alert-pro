// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBar from '../components/StatusBar';
import BestDeals from '../components/BestDeals';
import '../dashboard.css';

const CABIN_COLORS: Record<string, string> = {
  y: '#4f9cf9', pe: '#a0a8c0', j: '#c9a84c', f: '#9b8fe8',
};
const fmt = (v: any) => v != null && v > 0 ? `$${Number(v).toFixed(0)}` : '—';

export default function DashboardClient() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [deals, setDeals] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/routes-fetch', { credentials: 'include' }).then(r => r.json()).catch(() => ({ routes: [] })),
      fetch('/api/best-deals', { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
    ]).then(([routesData, dealsData]) => {
      setRoutes(routesData.routes ?? []);
      setDeals(dealsData || {});
      setLoading(false);
    });
  }, []);

  const busiestRoutes = routes.filter((r: any) => r.category === 'busiest').slice(0, 6);
  const customRoutes = routes.filter((r: any) => r.is_custom).slice(0, 5);

  return (
    <div className="dashboard">
      {/* Sticky header */}
      <div className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-logo">✈️ FareAlert<span>Pro</span></div>
            <span className="header-subtitle">Your flight deal overview</span>
          </div>
          <div className="header-actions">
            <Link href="/settings" className="btn btn-ghost" style={{ fontSize: 'var(--fs-micro)', padding: '6px 10px' }}>
              ⚙
            </Link>
            <Link href="/routes" className="btn btn-primary" style={{ fontSize: 'var(--fs-micro)', padding: '6px 14px' }}>
              Routes
            </Link>
          </div>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">✈️</div>
            <h3>Loading your dashboard…</h3>
          </div>
        ) : (
          <>
            <StatusBar />
            <BestDeals initialDeals={deals} />

            {/* Trending Routes */}
            {busiestRoutes.length > 0 ? (
              <section className="section">
                <div className="section-header">
                  <span className="section-title">🔥 Trending Routes</span>
                  <Link href="/routes" className="section-link">View all →</Link>
                </div>
                <div className="trending-grid">
                  {busiestRoutes.map((r: any) => {
                    const [origin, destination] = r.route.split('-');
                    return (
                      <Link key={r.route} href={`/route/${r.route}`} style={{ textDecoration: 'none' }}>
                        <div className="trending-card">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontFamily: 'Inter, monospace', fontWeight: 800 }}>{origin}</span>
                              <span className="trending-arrow">→</span>
                              <span style={{ fontFamily: 'Inter, monospace', fontWeight: 800 }}>{destination}</span>
                            </div>
                            <div className="trending-from">Economy from</div>
                          </div>
                          <div className="trending-price" style={{ color: r.last_price ? 'var(--success)' : 'var(--text-muted)' }}>
                            {fmt(r.last_price)}
                          </div>
                          <div className="trending-cabins">
                            {[
                              { label: 'Y', val: r.last_price, color: 'var(--cabin-y)' },
                              { label: 'J', val: r.last_price_business, color: 'var(--cabin-j)' },
                              { label: 'F', val: r.last_price_first, color: 'var(--cabin-f)' },
                            ].map(c => (
                              <div key={c.label} className="trending-cabin">
                                <span className="trending-cabin-label" style={{ color: c.color }}>{c.label}</span>
                                <span className="trending-cabin-price" style={{ color: c.val ? c.color : 'var(--text-muted)' }}>{fmt(c.val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="section">
                <div className="empty-state" style={{ padding: 'var(--sp-6) 0' }}>
                  <div className="empty-state-icon">🛫</div>
                  <h3>No trending routes yet</h3>
                  <p>Popular routes will appear here as we track them.</p>
                  <Link href="/routes" className="btn btn-primary" style={{ fontSize: 'var(--fs-sm)' }}>
                    Browse routes →
                  </Link>
                </div>
              </section>
            )}

            {/* Custom Routes */}
            {customRoutes.length > 0 ? (
              <section className="section">
                <div className="section-header">
                  <span className="section-title">✏ Your Routes</span>
                  <Link href="/routes" className="section-link">Manage →</Link>
                </div>
                <div className="routes-table-wrap">
                  <table className="routes-table">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Y</th>
                        <th>PE</th>
                        <th>J</th>
                        <th>F</th>
                        <th>Checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customRoutes.map((r: any) => (
                        <tr key={r.route}>
                          <td className="route-name">
                            <Link href={`/route/${r.route}`} style={{ color: 'var(--accent-text)', textDecoration: 'none', fontWeight: 700 }}>{r.route}</Link>
                          </td>
                          <td className={`route-price ${r.last_price ? '' : 'no-price'}`}>{fmt(r.last_price)}</td>
                          <td className={`route-price pe ${r.last_price_premium_economy ? '' : 'no-price'}`}>{fmt(r.last_price_premium_economy)}</td>
                          <td className={`route-price biz ${r.last_price_business ? '' : 'no-price'}`}>{fmt(r.last_price_business)}</td>
                          <td className={`route-price first ${r.last_price_first ? '' : 'no-price'}`}>{fmt(r.last_price_first)}</td>
                          <td className="route-check">
                            {r.last_checked ? new Date(r.last_checked).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className="section">
                <div className="empty-state" style={{ padding: 'var(--sp-6) 0' }}>
                  <div className="empty-state-icon">📍</div>
                  <h3>No custom routes yet</h3>
                  <p>Add routes you care about and we&apos;ll alert you when fares drop.</p>
                  <Link href="/routes" className="btn btn-primary" style={{ fontSize: 'var(--fs-sm)' }}>
                    Add your first route →
                  </Link>
                </div>
              </section>
            )}

            {/* Quick Links */}
            <section className="section">
              <div className="section-header">
                <span className="section-title">🔗 Quick Links</span>
              </div>
              <div className="quick-links">
                <Link href="/routes" className="quick-link">
                  <div className="ql-icon" style={{ background: 'rgba(45,90,61,0.2)', color: 'var(--green-light)' }}>📍</div>
                  <span className="ql-label">Browse All Routes</span>
                </Link>
                <Link href="/deals" className="quick-link">
                  <div className="ql-icon" style={{ background: 'rgba(232,168,56,0.15)', color: 'var(--gold)' }}>💰</div>
                  <span className="ql-label">Current Best Deals</span>
                </Link>
                <Link href="/alerts" className="quick-link">
                  <div className="ql-icon" style={{ background: 'rgba(230,57,70,0.1)', color: 'var(--danger)' }}>🔔</div>
                  <span className="ql-label">Deal History</span>
                </Link>
                <Link href="/settings" className="quick-link">
                  <div className="ql-icon" style={{ background: 'rgba(79,156,249,0.1)', color: 'var(--cabin-y)' }}>⚙️</div>
                  <span className="ql-label">Settings</span>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
