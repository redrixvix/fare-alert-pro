'use client';

import { useState } from 'react';

interface PriceRow {
  route: string;
  cabin: string;
  price: number;
  currency: string;
  airline: string;
  duration_minutes: number;
  stops: number;
  fetched_at: string;
}

export default function DateSearch() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!date) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await fetch(`/api/prices-by-date?date=${date}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.prices || []);
      }
    } catch {
      setError('Failed to fetch');
      setResults([]);
    }
    setLoading(false);
  };

  const cabinLabel = (c: string) => {
    const map: Record<string, string> = { ECONOMY: 'Y', PREMIUM_ECONOMY: 'PE', BUSINESS: 'J', FIRST: 'F' };
    return map[c] || c;
  };

  // Group results by route
  const grouped: Record<string, PriceRow[]> = {};
  for (const r of results) {
    if (!grouped[r.route]) grouped[r.route] = [];
    grouped[r.route].push(r);
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
          <button onClick={search} disabled={loading} className="search-btn">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && <p className="search-error">{error}</p>}

      {searched && !loading && (
        <div className="date-results">
          {results.length === 0 ? (
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
                        const p = prices.find((x) => x.cabin === cabin);
                        return p ? `$${p.price.toFixed(0)}` : null;
                      };
                      return (
                        <tr key={route}>
                          <td className="route-name">
                            <a href={`/route/${route}`} className="route-link">{route}</a>
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
