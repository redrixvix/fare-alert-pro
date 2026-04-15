'use client';

import { useState } from 'react';
import { CABIN_KEYS } from './CABIN_KEYS';

interface PriceRecord {
  route: string;
  cabin: string;
  search_date: string;
  price: number;
  currency: string;
  airline: string | null;
  duration_minutes: number | null;
  stops: number | null;
  fetched_at: string;
}

function fmtDuration(mins: number | null): string {
  if (!mins) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtStops(s: number | null): string {
  if (s == null) return '—';
  if (s === 0) return 'Direct';
  return `${s} stop${s > 1 ? 's' : ''}`;
}

function formatDateLabel(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function bookUrl(searchDate: string, route: string): string {
  const [origin, destination] = route.split('-');
  return `https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyCg&tfu=CxD&hl=en&gl=us&curr=USD&q=${origin}+to+${destination}&date=${searchDate.replace(/-/g, '')}`;
}

export default function DateNavigator({
  dates,
  initialPrices,
  route,
}: {
  dates: string[];
  initialPrices: Record<string, Record<string, PriceRecord>>;
  route: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(dates.length - 1);

  const currentDate = dates[currentIndex] || null;
  const currentCabins = currentDate ? (initialPrices[currentDate] || {}) : {};

  const goPrev = () => { if (currentIndex > 0) setCurrentIndex(i => i - 1); };
  const goNext = () => { if (currentIndex < dates.length - 1) setCurrentIndex(i => i + 1); };
  const goPrevWeek = () => { setCurrentIndex(i => Math.max(0, i - 7)); };
  const goNextWeek = () => { setCurrentIndex(i => Math.min(dates.length - 1, i + 7)); };

  return (
    <>
      <div className="day-nav">
        <button onClick={goPrevWeek} disabled={currentIndex <= 0} className="nav-btn" title="Previous week">‹‹</button>
        <button onClick={goPrev} disabled={currentIndex <= 0} className="nav-btn" title="Previous day">←</button>
        <span className="date-label">{currentDate ? formatDateLabel(currentDate) : '—'}</span>
        <button onClick={goNext} disabled={currentIndex >= dates.length - 1} className="nav-btn" title="Next day">→</button>
        <button onClick={goNextWeek} disabled={currentIndex >= dates.length - 1} className="nav-btn" title="Next week">››</button>
      </div>

      <div className="date-dots">
        {dates.map((d, i) => (
          <button
            key={d}
            className={`dot ${i === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(i)}
            title={formatDateLabel(d)}
          />
        ))}
      </div>

      {currentDate && (
        <div className="routes-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="price-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Y</th>
                <th>PE</th>
                <th>J</th>
                <th>F</th>
                <th>Airline</th>
                <th>Duration</th>
                <th>Stops</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr className="day-price-row">
                <td className="route-name">{currentDate}</td>
                {CABIN_KEYS.map(({ key, cls }) => (
                  <td key={key} className={`route-price ${cls}`}>
                    {currentCabins[key] ? `$${currentCabins[key].price.toFixed(0)}` : '—'}
                  </td>
                ))}
                <td>{currentCabins.y?.airline || currentCabins.pe?.airline || currentCabins.j?.airline || currentCabins.f?.airline || '—'}</td>
                <td>{fmtDuration(currentCabins.y?.duration_minutes ?? currentCabins.pe?.duration_minutes ?? currentCabins.j?.duration_minutes ?? currentCabins.f?.duration_minutes ?? null)}</td>
                <td>{fmtStops(currentCabins.y?.stops ?? currentCabins.pe?.stops ?? currentCabins.j?.stops ?? currentCabins.f?.stops ?? null)}</td>
                <td style={{ textAlign: 'center' }}>
                  {currentDate && (
                    <a
                      href={bookUrl(currentDate, route)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lf-book-btn"
                      title={`Book ${route} on ${formatDateLabel(currentDate)}`}
                    >
                      Book →
                    </a>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
