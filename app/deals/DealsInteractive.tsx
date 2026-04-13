'use client';

import { useState } from 'react';
import SortControls from './SortControls';

interface Deal {
  route: string;
  date: string;
  price: number;
  hist_avg: number;
  savings_pct: number;
  airline: string;
  fetched_at: string;
}

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatRoute(route: string): string {
  return route.replace('-', ' → ');
}

function buildBookUrl(route: string, date: string): string {
  const [origin, dest] = route.split('-');
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(origin)}+to+${encodeURIComponent(dest)}+${date}`;
}

function DealsTable({ deals, sort }: { deals: Deal[]; sort: string }) {
  let sorted = [...deals];
  if (sort === 'price') sorted.sort((a, b) => a.price - b.price);
  else if (sort === 'route') sorted.sort((a, b) => a.route.localeCompare(b.route));
  else sorted.sort((a, b) => b.savings_pct - a.savings_pct);

  if (sorted.length === 0) {
    return (
      <div className="deals-empty">
        <div className="deals-empty-icon">✈️</div>
        <h2>No error fares right now</h2>
        <p>
          Check back soon — prices update every minute. Subscribe to get these
          alerts straight to your inbox.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="deals-table-wrap">
        <div className="deals-table-inner">
          <table className="deals-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Date</th>
                <th>Price</th>
                <th>Hist. Avg</th>
                <th>Savings</th>
                <th>Airline</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((deal, i) => (
                <tr key={`${deal.route}-${deal.date}-${i}`}>
                  <td className="route-cell">{formatRoute(deal.route)}</td>
                  <td className="date-cell">{formatDate(deal.date)}</td>
                  <td className="price-cell">${deal.price}</td>
                  <td className="hist-cell">${deal.hist_avg}</td>
                  <td>
                    <span className="savings-badge">
                      {deal.savings_pct}% OFF
                    </span>
                  </td>
                  <td className="airline-cell">{deal.airline}</td>
                  <td>
                    <a
                      href={buildBookUrl(deal.route, deal.date)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="book-btn"
                    >
                      Book →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="deals-cards">
        {sorted.map((deal, i) => (
          <div
            className="deal-card"
            key={`card-${deal.route}-${deal.date}-${i}`}
          >
            <div className="deal-card-top">
              <div className="deal-card-route">
                {formatRoute(deal.route)}
              </div>
              <span className="deal-card-savings">
                {deal.savings_pct}% OFF
              </span>
            </div>
            <div className="deal-card-middle">
              <div className="deal-card-price">${deal.price}</div>
              <div className="deal-card-hist">was ${deal.hist_avg}</div>
            </div>
            <div className="deal-card-bottom">
              <div className="deal-card-date">
                {formatDate(deal.date)} · {deal.airline}
              </div>
            </div>
            <a
              href={buildBookUrl(deal.route, deal.date)}
              target="_blank"
              rel="noopener noreferrer"
              className="deal-card-book"
            >
              Book on Google Flights →
            </a>
          </div>
        ))}
      </div>
    </>
  );
}

export default function DealsInteractive({
  deals,
  generatedAt,
}: {
  deals: Deal[];
  generatedAt: string;
}) {
  const [sort, setSort] = useState('discount');

  const genDate = new Date(generatedAt);
  const timeStr = genDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const dateStr = genDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <div className="deals-controls">
        <div className="deals-controls-inner">
          <SortControls currentSort={sort} onSort={setSort} />
          <span className="deals-meta">
            Updated {timeStr} · {dateStr} · Economy only
          </span>
        </div>
      </div>
      <DealsTable deals={deals} sort={sort} />
    </>
  );
}
