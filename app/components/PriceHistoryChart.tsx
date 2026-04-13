// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { getPriceHistory } from '@/convex/prices';

interface PricePoint {
  date: string;
  price: number;
  avg_30: number;
}

interface HistoryResponse {
  route: string;
  cabin: string;
  days: number;
  data: PricePoint[];
  stats: {
    min: number;
    max: number;
    avg: number;
    currentVsAvg: number;
    trend: 'up' | 'down' | 'flat';
  };
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  price: number;
  avg_30: number;
}

const CABIN_COLORS: Record<string, string> = {
  ECONOMY: '#4f9cf9',
  PREMIUM_ECONOMY: '#a0a8c0',
  BUSINESS: '#c9a84c',
  FIRST: '#9b8fe8',
};

const CABIN_LABELS: Record<string, string> = {
  ECONOMY: 'Y',
  PREMIUM_ECONOMY: 'PE',
  BUSINESS: 'J',
  FIRST: 'F',
};

const DAYS_OPTIONS = [30, 60, 90] as const;
type DaysOption = (typeof DAYS_OPTIONS)[number];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PriceHistoryChart({
  route,
  initialDays = 30,
  initialCabin = 'ECONOMY',
}: {
  route: string;
  initialDays?: 30 | 60 | 90;
  initialCabin?: string;
}) {
  const [days, setDays] = useState<DaysOption>(initialDays);
  const [cabin, setCabin] = useState(initialCabin);
  const result = useQuery(getPriceHistory as any, { route, cabin, days });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    date: '',
    price: 0,
    avg_30: 0,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  const loading = result === undefined;
  const data = result?.data ?? [];
  const stats = result?.stats ?? null;

  // Chart dimensions
  const W = 500;
  const H = 250;
  const PAD = { top: 20, right: 20, bottom: 45, left: 60 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  // Scales
  const maxPrice = data.length
    ? Math.max(...data.map((d: any) => Math.max(d.price, d.avg_30))) * 1.1
    : 1000;
  const minPrice = data.length ? Math.min(...data.map((d: any) => Math.min(d.price, d.avg_30))) * 0.9 : 0;

  const xScale = (i: number) => (i / Math.max(data.length - 1, 1)) * cw;
  const yScale = (p: number) => {
    const range = maxPrice - minPrice || 1;
    return ch - ((p - minPrice) / range) * ch;
  };

  // Y-axis labels (5 steps)
  const yLabels: { value: number; y: number }[] = [];
  for (let i = 0; i <= 4; i++) {
    const value = minPrice + (i / 4) * (maxPrice - minPrice);
    yLabels.push({ value: Math.round(value / 10) * 10, y: yScale(value) });
  }

  // X-axis labels — every 5th date
  const xLabels: { i: number; label: string }[] = [];
  if (data.length > 0) {
    const step = Math.max(1, Math.floor(data.length / 7));
    for (let i = 0; i < data.length; i += step) {
      xLabels.push({ i, label: formatDateLabel(data[i].date) });
    }
  }

  // Path builders
  const buildLinePath = (points: [number, number][]): string => {
    if (!points.length) return '';
    return (
      'M' +
      points[0].join(',') +
      points.slice(1).map(p => 'L' + p.join(',')).join(' ')
    );
  };

  const buildAreaPath = (
    points: [number, number][],
    baseline: number
  ): string => {
    if (!points.length) return '';
    const top = buildLinePath(points);
    const bottom = `L${points[points.length - 1][0]},${baseline}L${points[0][0]},${baseline}Z`;
    return top + bottom;
  };

  // Compute per-point coloring (green if price < avg, red if price > avg)
  const pricePoints: [number, number][] = data.map((d: any, i: number) => [xScale(i), yScale(d.price)]);
  const avgPoints: [number, number][] = data.map((d: any, i: number) => [xScale(i), yScale(d.avg_30)]);

  const avgLinePath = buildLinePath(avgPoints);

  // Hover handlers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const relX = svgX - PAD.left;
    const idx = Math.round((relX / cw) * (data.length - 1));
    const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
    const d = data[clampedIdx];
    setTooltip({
      visible: true,
      x: xScale(clampedIdx) + PAD.left,
      y: yScale(d.price) + PAD.top,
      date: d.date,
      price: d.price,
      avg_30: d.avg_30,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const color = CABIN_COLORS[cabin] ?? '#4f9cf9';

  return (
    <div className="price-history-chart">
      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: days === d ? color : '#3a3d4a',
                background: days === d ? color : 'transparent',
                color: days === d ? '#fff' : '#9a9daf',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.15s',
              }}
            >
              {d}d
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCabin(c)}
              aria-pressed={cabin === c}
              aria-label={`Show ${CABIN_LABELS[c]} cabin`}
              style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: cabin === c ? CABIN_COLORS[c] : '#3a3d4a',
                background: cabin === c ? CABIN_COLORS[c] + '33' : 'transparent',
                color: cabin === c ? CABIN_COLORS[c] : '#9a9daf',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              {CABIN_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {loading ? (
        <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7d8e' }}>
          Loading…
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7d8e' }}>
          No data for this route and cabin.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', maxWidth: W, display: 'block', overflow: 'visible' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g transform={`translate(${PAD.left},${PAD.top})`}>
              {/* Grid lines */}
              {yLabels.map(({ value, y }) => (
                <g key={value}>
                  <line
                    x1={0}
                    y1={y}
                    x2={cw}
                    y2={y}
                    stroke="#2a2d3a"
                    strokeWidth={1}
                  />
                  <text
                    x={-8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#7a7d8e"
                    fontSize={11}
                    fontFamily="system-ui, sans-serif"
                  >
                    ${value}
                  </text>
                </g>
              ))}

              {/* Area fills — green below avg, red above avg */}
              {data.map((d: any, i: number) => {
                if (i === data.length - 1) return null;
                const next = data[i + 1];
                const x1 = xScale(i);
                const x2 = xScale(i + 1);
                const yPrice = yScale(d.price);
                const yAvg = yScale(d.avg_30);
                const fillColor = d.price < d.avg_30 ? '#22c55e22' : '#ef444422';
                return (
                  <rect
                    key={d.date}
                    x={x1}
                    y={Math.min(yPrice, yAvg)}
                    width={x2 - x1}
                    height={Math.abs(yAvg - yPrice)}
                    fill={fillColor}
                  />
                );
              })}

              {/* Average line (dashed) */}
              <path
                d={avgLinePath}
                stroke="#7a7d8e"
                strokeWidth={1.5}
                strokeDasharray="6,4"
                fill="none"
              />

              {/* Price line */}
              <path
                d={buildLinePath(pricePoints)}
                stroke={color}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Price line dots */}
              {pricePoints.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3}
                  fill={color}
                />
              ))}

              {/* X axis labels */}
              {xLabels.map(({ i, label }) => (
                <text
                  key={i}
                  x={xScale(i)}
                  y={ch + 20}
                  textAnchor="middle"
                  fill="#7a7d8e"
                  fontSize={11}
                  fontFamily="system-ui, sans-serif"
                >
                  {label}
                </text>
              ))}

              {/* Axes */}
              <line x1={0} y1={0} x2={0} y2={ch} stroke="#2a2d3a" strokeWidth={1} />
              <line x1={0} y1={ch} x2={cw} y2={ch} stroke="#2a2d3a" strokeWidth={1} />
            </g>
          </svg>

          {/* Tooltip */}
          {tooltip.visible && (
            <div
              style={{
                position: 'absolute',
                left: tooltip.x,
                top: tooltip.y - 80,
                transform: 'translateX(-50%)',
                background: '#1a1d2e',
                border: '1px solid #3a3d4a',
                borderRadius: '8px',
                padding: '0.6rem 0.9rem',
                pointerEvents: 'none',
                zIndex: 10,
                minWidth: 150,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#9a9daf', marginBottom: '0.3rem' }}>
                {new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: color }}>
                ${tooltip.price.toFixed(0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#7a7d8e' }}>
                Avg: ${tooltip.avg_30.toFixed(0)}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  marginTop: '0.2rem',
                  color: tooltip.price < tooltip.avg_30 ? '#22c55e' : '#ef4444',
                }}
              >
                {tooltip.price < tooltip.avg_30 ? '↓ below average' : '↑ above average'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      {stats && !loading && (
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '0.75rem',
            flexWrap: 'wrap',
            fontSize: '0.8rem',
            color: '#9a9daf',
          }}
        >
          <span>
            <span style={{ color: '#7a7d8e' }}>Low:</span> ${stats.min}
          </span>
          <span>
            <span style={{ color: '#7a7d8e' }}>High:</span> ${stats.max}
          </span>
          <span>
            <span style={{ color: '#7a7d8e' }}>Avg:</span> ${stats.avg}
          </span>
          {stats.currentVsAvg !== 0 && (
            <span
              style={{
                color: stats.currentVsAvg < 0 ? '#22c55e' : '#ef4444',
              }}
            >
              {stats.currentVsAvg < 0 ? '↓' : '↑'}
              {Math.abs(stats.currentVsAvg)}% vs avg
            </span>
          )}
          {stats.trend !== 'flat' && (
            <span style={{ color: '#7a7d8e' }}>
              Trend: {stats.trend === 'up' ? '↗ rising' : '↘ falling'}
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#7a7d8e', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ width: 12, height: 2, background: color }} />
          <span>Price</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ width: 12, height: 1, borderTop: '2px dashed #7a7d8e' }} />
          <span>30d avg</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ width: 8, height: 8, background: '#22c55e33', borderRadius: 2 }} />
          <span>Below avg</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ width: 8, height: 8, background: '#ef444422', borderRadius: 2 }} />
          <span>Above avg</span>
        </div>
      </div>
    </div>
  );
}