'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Deal {
  route: string;
  price: number;
  airline: string | null;
  days_out: number;
}

const CABIN_LABELS: Record<string, string> = {
  y: 'Economy',
  pe: 'Premium Eco',
  j: 'Business',
  f: 'First',
};

const CABIN_COLORS: Record<string, string> = {
  y: '#4f9cf9',
  pe: '#a0a8c0',
  j: '#c9a84c',
  f: '#9b8fe8',
};

export default function BestDeals() {
  const [deals, setDeals] = useState<Record<string, Deal[]>>({});

  useEffect(() => {
    fetch('/api/best-deals')
      .then((r) => r.json())
      .then((d) => setDeals(d))
      .catch(() => {});
  }, []);

  const cabinOrder = ['y', 'pe', 'j', 'f'];
  const hasDeals = Object.values(deals).some((v) => v && v.length > 0);

  if (!hasDeals) return null;

  return (
    <section className="section">
      <h2>🏷️ Best Current Deals</h2>
      <div className="deals-grid">
        {cabinOrder.map((key) =>
          (deals[key] || []).map((deal, i) => (
            <Link
              key={`${key}-${i}`}
              href={`/route/${deal.route}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                className={`deal-card ${i === 0 ? 'is-top' : ''}`}
                style={{ '--cabin-color': CABIN_COLORS[key] } as React.CSSProperties}
              >
                <div className="deal-cabin">
                  {CABIN_LABELS[key]}
                  {i === 0 && (
                    <span
                      className="deal-best-tag"
                      style={{ '--cabin-color': CABIN_COLORS[key] } as React.CSSProperties}
                    >
                      BEST
                    </span>
                  )}
                </div>
                <div className="deal-price">${deal.price.toFixed(0)}</div>
                <div className="deal-route">{deal.route}</div>
                <div className="deal-meta">
                  {deal.airline || '—'} · {deal.days_out}d out
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
