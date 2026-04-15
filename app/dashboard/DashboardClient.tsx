// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBar from '../components/StatusBar';
import BestDeals from '../components/BestDeals';

const CABIN_COLORS: Record<string, string> = {
  y: '#4f9cf9', pe: '#a0a8c0', j: '#c9a84c', f: '#9b8fe8',
};

export default function DashboardClient() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/routes-fetch', { credentials: 'include' }).then(r => r.json()).catch(() => ({ routes: [] })),
      fetch('/api/best-deals', { credentials: 'include' }).then(r => r.json()).catch(() => ({ deals: [] })),
    ]).then(([routesData, dealsData]) => {
      setRoutes(routesData.routes ?? []);
      // dealsData is {y:[], pe:[], j:[], f:[]} from /api/best-deals
      setDeals(dealsData || {});
      setLoading(false);
    });
  }, []);

  const busiestRoutes = routes.filter((r: any) => r.category === 'busiest').slice(0, 6);
  const customRoutes = routes.filter((r: any) => r.is_custom).slice(0, 5);
  const fmt = (v: any) => v != null && v > 0 ? `$${Number(v).toFixed(0)}` : '—';

  if (loading) {
    return (
      <div className="dashboard">
        <div className="header">
          <div className="header-inner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1>✈️ FareAlertPro</h1>
                <p className="subtitle">Welcome back! Here&apos;s your flight deal overview.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="content">
          <div style={{ textAlign: 'center', padding: 'var(--sp-12)', color: 'var(--text-dim)' }}>
            Loading…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <div>
              <h1>✈️ FareAlertPro</h1>
              <p className="subtitle">Welcome back! Here&apos;s your flight deal overview.</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <Link href="/settings" className="settings-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', background: 'var(--card)', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 'var(--sp-2) var(--sp-4)', fontSize: 'var(--fs-sm)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>⚙ Settings</Link>
              <Link href="/routes" style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 'var(--r-sm)', padding: 'var(--sp-2) var(--sp-4)',
                fontSize: 'var(--fs-sm)', fontWeight: 600, textDecoration: 'none',
              }}>✏ Manage Routes</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <StatusBar />

        {deals.length > 0 && <BestDeals initialDeals={deals} />}

        {/* Busiest Routes */}
        {busiestRoutes.length > 0 && (
          <section className="section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
              <h2>🔥 Trending Routes</h2>
              <Link href="/routes" style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--sp-3)' }}>
              {busiestRoutes.map((r: any) => {
                const [origin, destination] = r.route.split('-');
                return (
                  <Link key={r.route} href={`/route/${r.route}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: 'var(--sp-4)',
                      transition: 'border-color 0.15s, transform 0.15s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 'var(--fs-body)', color: 'var(--text)' }}>{origin}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 'var(--fs-body)', color: 'var(--text)' }}>{destination}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)' }}>Economy from</span>
                        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: r.last_price ? 'var(--success)' : 'var(--text-muted)' }}>
                          {fmt(r.last_price)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' }}>
                        {[
                          { label: 'Y', val: r.last_price, color: 'var(--cabin-y)' },
                          { label: 'J', val: r.last_price_business, color: 'var(--cabin-j)' },
                          { label: 'F', val: r.last_price_first, color: 'var(--cabin-f)' },
                        ].map(c => (
                          <div key={c.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: c.val ? c.color : 'var(--text-muted)' }}>
                              {fmt(c.val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Custom Routes */}
        {customRoutes.length > 0 && (
          <section className="section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
              <h2>✏️ Your Custom Routes</h2>
              <Link href="/routes" style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)', textDecoration: 'none' }}>Manage →</Link>
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
                    <th>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {customRoutes.map((r: any) => (
                    <tr key={r.route}>
                      <td className="route-name">
                        <Link href={`/route/${r.route}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>{r.route}</Link>
                      </td>
                      <td className="route-price">{fmt(r.last_price)}</td>
                      <td className="route-price pe">{fmt(r.last_price_premium_economy)}</td>
                      <td className="route-price biz">{fmt(r.last_price_business)}</td>
                      <td className="route-price first">{fmt(r.last_price_first)}</td>
                      <td className="route-check">
                        {r.last_checked ? new Date(r.last_checked).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not yet'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Quick links */}
        <section className="section">
          <h2>🔗 Quick Links</h2>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            {[
              { href: '/routes', label: '📍 Browse All Routes', color: 'var(--accent)' },
              { href: '/alerts', label: '💰 Deal History', color: 'var(--success)' },
              { href: '/settings', label: '⚙️ Settings', color: 'var(--cabin-y)' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                padding: 'var(--sp-3) var(--sp-4)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                color: link.color,
                fontWeight: 600,
                fontSize: 'var(--fs-sm)',
                textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = link.color; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
