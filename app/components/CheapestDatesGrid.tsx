'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface DateEntry {
  date: string;
  price: number;
  is_cheapest: boolean;
}

interface DatesResponse {
  dates: DateEntry[];
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
}

interface CheapestDatesGridProps {
  route: string;
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_MAX = 3;

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const cells: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function cellColor(price: number, min: number, max: number): string {
  if (min === max) return 'cell-green';
  const ratio = (price - min) / (max - min);
  if (ratio < 0.33) return 'cell-green';
  if (ratio < 0.66) return 'cell-yellow';
  return 'cell-red';
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function CheapestDatesGrid({ route }: CheapestDatesGridProps) {
  const router = useRouter();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [months, setMonths] = useState(1);
  const [collapsed, setCollapsed] = useState(true);
  const [data, setData] = useState<DatesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (r: string, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/route/${encodeURIComponent(r)}/dates?months=${m}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collapsed) {
      fetchData(route, months);
    }
  }, [route, months, collapsed, fetchData]);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const dateMap = new Map(data?.dates.map(d => [d.date, d]) ?? []);
  const minPrice = data?.minPrice ?? 0;
  const maxPrice = data?.maxPrice ?? 0;

  // Validate viewMonth is in range given months
  const now = new Date();
  const viewDate = new Date(viewYear, viewMonth, 1);
  const maxViewDate = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const canGoNext = viewDate < new Date(maxViewDate.getFullYear(), maxViewDate.getMonth() - 1, 1);

  const cells = getMonthDays(viewYear, viewMonth);

  const handleCellClick = (entry: DateEntry) => {
    router.push(`/route/${encodeURIComponent(route)}?date=${entry.date}`);
  };

  const cheapestDate = data?.dates.find(d => d.is_cheapest);

  return (
    <div className="cdg-wrapper">
      <button
        className="cdg-toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <span>🗓️ Cheapest Dates</span>
        <span className="cdg-toggle-arrow">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="cdg-body">
          {loading && <p className="cdg-loading">Loading price data…</p>}

          {!loading && data && (
            <>
              {/* Stats */}
              <div className="cdg-stats">
                {cheapestDate && (
                  <span>
                    <strong>Cheapest day:</strong>{' '}
                    {new Date(cheapestDate.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' '}(${cheapestDate.price.toFixed(0)})
                  </span>
                )}
                {data.avgPrice !== null && (
                  <span><strong>Avg:</strong> ${data.avgPrice.toFixed(0)}</span>
                )}
                {data.minPrice !== null && data.maxPrice !== null && (
                  <span><strong>Range:</strong> ${data.minPrice.toFixed(0)}–${data.maxPrice.toFixed(0)}</span>
                )}
              </div>

              {/* Month nav */}
              <div className="cdg-month-nav">
                <button onClick={goPrevMonth} className="cdg-nav-btn">‹</button>
                <span className="cdg-month-label">{formatMonthYear(viewYear, viewMonth)}</span>
                <button onClick={goNextMonth} className="cdg-nav-btn" disabled={!canGoNext}>›</button>
              </div>

              {/* Calendar grid */}
              <div className="cdg-scroll">
                <div className="cdg-grid">
                  {/* Day headers */}
                  {DAYS.map(d => (
                    <div key={d} className="cdg-day-header">{d}</div>
                  ))}

                  {/* Cells */}
                  {cells.map((date, i) => {
                    if (!date) return <div key={`pad-${i}`} className="cdg-cell cdg-cell-empty" />;

                    const ds = dateStr(date);
                    const entry = dateMap.get(ds);
                    if (!entry) {
                      return (
                        <div key={ds} className="cdg-cell cdg-cell-na">
                          <span className="cdg-date-num">{date.getDate()}</span>
                          <span className="cdg-price-na">—</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={ds}
                        className={`cdg-cell cdg-cell-data ${cellColor(entry.price, minPrice, maxPrice)} ${entry.is_cheapest ? 'cdg-cell-best' : ''}`}
                        onClick={() => handleCellClick(entry)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && handleCellClick(entry)}
                        title={`${ds}: $${entry.price}`}
                      >
                        <span className="cdg-date-num">{date.getDate()}</span>
                        <span className="cdg-price">${entry.price}</span>
                        {entry.is_cheapest && <span className="cdg-best-badge">BEST</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Month selector */}
              <div className="cdg-months-row">
                <span className="cdg-label">Show:</span>
                {[1, 2, 3].map(m => (
                  <button
                    key={m}
                    className={`cdg-m-btn ${months === m ? 'cdg-m-btn-active' : ''}`}
                    onClick={() => setMonths(m)}
                  >
                    {m}mo
                  </button>
                ))}
              </div>

              {/* Color legend */}
              <div className="cdg-legend">
                <span className="cdg-legend-item"><span className="cdg-legend-dot cell-green" />Cheapest</span>
                <span className="cdg-legend-item"><span className="cdg-legend-dot cell-yellow" />Mid</span>
                <span className="cdg-legend-item"><span className="cdg-legend-dot cell-red" />Highest</span>
                <span className="cdg-legend-item"><span className="cdg-legend-dot cdg-cell-na" />No data</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
