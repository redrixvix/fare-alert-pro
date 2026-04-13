// @ts-nocheck
'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { getPricesByDate } from '@/convex/prices';
import Link from 'next/link';

export default function DateSearch() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searched, setSearched] = useState(false);

  const results = useQuery(getPricesByDate as any, { date: searched ? date : '' }) as any[] | undefined;

  const search = () => {
    if (!date) return;
    setSearched(true);
  };

  const cabinLabel = (c: string) => {
    const map: Record<string, string> = { ECONOMY: 'Y', PREMIUM_ECONOMY: 'PE', BUSINESS: 'J', FIRST: 'F' };
    return map[c] || c;
  };

  // Group results by route
  const grouped: Record<string, any[]> = {};
  if (results) {
    for (const r of results) {
      if (!grouped[r.route]) grouped[r.route] = [];
      grouped[r.route].push(r);
    }
  }

  return (
    <div className="date-search">
      <div className="date-search-form">
        <h3>📅 Search Prices by Date</h3>
        <div className="date-input-row">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="date-input"
          />
          <button onClick={search} className="search-btn">
            Search
          </button>
        </div>
      </div>

      {searched && (
        <div className="date-results">
          {!results ? (
            <p className="no-results">Loading…</p>
          ) : results.length === 0 ? (
            <p className="no-results">No price data found for {date}. Try a date within the last 90 days that has been checked.</p>
          ) : (
            <>
              <p className="results-count">{results.length} prices found for {date}</p>
              <div className="routes-table-wrap">
                <table className="routes-table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Y</th>
                      <th>PE</th>
                      <th>J</th>
                      <th>F</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).map(([route, prices]) => {
                      const get = (cabin: string) => {
                        const p = prices.find((x: any) => x.cabin === cabin);
                        return p ? `$${p.price.toFixed(0)}` : null;
                      };
                      return (
                        <tr key={route}>
                          <td className="route-name">
                            <Link href={`/route/${route}`} className="route-link">{route}</Link>
                          </td>
                          <td className="route-price">{get('ECONOMY') || '—'}</td>
                          <td className="route-price pe">{get('PREMIUM_ECONOMY') || '—'}</td>
                          <td className="route-price biz">{get('BUSINESS') || '—'}</td>
                          <td className="route-price first">{get('FIRST') || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}