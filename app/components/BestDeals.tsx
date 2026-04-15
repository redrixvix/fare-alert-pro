// @ts-nocheck
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

export default function BestDeals({ initialDeals }: { initialDeals?: any }) {
  // Accept either array (legacy) or object {y:[],pe:[],j:[],f:[]} format
  const [deals, setDeals] = useState<Record<string, Deal[]>>(() => {
    if (!initialDeals) return {};
    // If already in {y:[],pe:[],j:[],f:[]} object format, use as-is
    if (typeof initialDeals === 'object' && !Array.isArray(initialDeals) && ('y' in initialDeals || 'pe' in initialDeals)) {
      return initialDeals as Record<string, Deal[]>;
    }
    // Otherwise treat as array of deal objects
    if (Array.isArray(initialDeals) && initialDeals.length === 0) return {};
    const grouped: Record<string, Deal[]> = { y: [], pe: [], j: [], f: [] };
    for (const deal of initialDeals) {
      const key = deal.cabin === 'ECONOMY' ? 'y' : deal.cabin === 'PREMIUM_ECONOMY' ? 'pe' : deal.cabin === 'BUSINESS' ? 'j' : 'f';
      grouped[key].push({
        route: deal.route,
        price: deal.price,
        airline: deal.airline ?? null,
        days_out: Math.max(1, Math.round((new Date(deal.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      });
    }
    return grouped;
  });

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
