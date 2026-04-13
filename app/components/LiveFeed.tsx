// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { getRecentPrices } from '@/convex/prices';

const AIRLINE_NAMES: Record<string, string> = {
  AA: 'American', UA: 'United', DL: 'Delta', SW: 'Southwest',
  B6: 'JetBlue', F9: 'Frontier', AS: 'Alaska', NK: 'Spirit',
  GF: 'Gulf Air', AF: 'Air France', EK: 'Emirates', BA: 'British Airways',
  LH: 'Lufthansa', VS: 'Virgin Atlantic', FI: 'Icelandair', S4: 'S4',
};

function googleFlightsUrl(origin: string, destination: string): string {
  const query = `${origin.toUpperCase()} to ${destination.toUpperCase()}`;
  return `https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyCg&hl=en&gl=us&q=${encodeURIComponent(query)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

interface LiveFeedRow {
  id: number;
  route: string;
  cabin: string;
  search_date: string;
  price: number;
  airline: string | null;
  fetched_at: string;
  hist_avg: number | null;
  savings_pct: number | null;
}

const CABIN_SHORT: Record<string, string> = {
  ECONOMY: 'Y', PREMIUM_ECONOMY: 'PE', BUSINESS: 'J', FIRST: 'F',
};

const CABIN_COLOR: Record<string, string> = {
  ECONOMY: 'var(--cabin-y)', PREMIUM_ECONOMY: 'var(--cabin-pe)',
  BUSINESS: 'var(--cabin-j)', FIRST: 'var(--cabin-f)',
};

export default function LiveFeed() {
  const [rows, setRows] = useState<LiveFeedRow[]>([]);
  const [lastId, setLastId] = useState<number>(0);
  const [connected, setConnected] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const prices = useQuery(getRecentPrices as any);

  useEffect(() => {
    if (prices === undefined) {
      setLoading(true);
      return;
    }
    setLoading(false);
    if (prices.length > 0 && prices[0].id !== lastId) {
      setLastId(prices[0].id as any);
      setNewCount((c) => c + 1);
    }
    setRows((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const merged = [...prices, ...prev.filter((p) => !ids.has(p.id))];
      return merged.slice(0, 20) as any;
    });
    setConnected(true);
  }, [prices]);

  useEffect(() => {
    const id = setInterval(() => {}, 15_000);
    return () => clearInterval(id);
  }, []);

  const dismissNew = () => setNewCount(0);
  const isNew = (id: number) => id === lastId;

  return (
    <section className="section live-feed-section">
      <div className="live-feed-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <h2>📡 Live Feed</h2>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--danger)', display: 'inline-block' }} title={connected ? 'Live' : 'Reconnecting…'} />
        </div>
        {newCount > 0 && (
          <button onClick={dismissNew} className="new-count-badge">
            {newCount} new ↓
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
          <span className="empty-state-icon">⏳</span>
          <p>Connecting to price feed…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📭</span>
          <p>No price data yet. The cron scan is building up history — check back in a few minutes.</p>
        </div>
      ) : (
        <div className="live-feed-list">
          {rows.map((row) => {
            const [origin, destination] = row.route.split('-');
            const bookUrl = googleFlightsUrl(origin, destination);
            return (
              <div key={`${row.id}-${row.fetched_at}`} className={`live-feed-row${isNew(row.id) ? ' live-feed-row-new' : ''}`}>
                <div className="lf-route">
                  <Link href={`/route/${row.route}`} className="route-link">{row.route}</Link>
                </div>
                <div className="lf-cabin" style={{ color: CABIN_COLOR[row.cabin] || 'var(--text)' }}>
                  {CABIN_SHORT[row.cabin] || row.cabin}
                </div>
                <div className="lf-price">${row.price.toFixed(0)}</div>
                <div className="lf-date">{row.search_date}</div>
                <div className="lf-airline">{row.airline ? (AIRLINE_NAMES[row.airline] || row.airline) : '—'}</div>
                <div className="lf-ago">{timeAgo(row.fetched_at)}</div>
                <a
                  href={bookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lf-book-btn"
                  title={`Book ${origin} → ${destination} on Google Flights`}
                >
                  Book →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
