interface LineChartProps {
  data: { date: string; y: number | null; pe: number | null; j: number | null; f: number | null }[];
  width?: number;
  height?: number;
}

const COLORS = {
  y: '#4f9cf9',
  pe: '#a0a8c0',
  j: '#c9a84c',
  f: '#9b8fe8',
};

const CABIN_LABELS: Record<string, string> = {
  y: 'Economy',
  pe: 'Premium Economy',
  j: 'Business',
  f: 'First',
};

export default function LineChart({ data, width = 700, height = 300 }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#7a7d8e', padding: '2rem' }}>
        No data to display
      </div>
    );
  }

  const PADDING = { top: 20, right: 20, bottom: 50, left: 60 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // Flatten all prices to find min/max
  const allPrices: number[] = [];
  for (const d of data) {
    if (d.y != null) allPrices.push(d.y);
    if (d.pe != null) allPrices.push(d.pe);
    if (d.j != null) allPrices.push(d.j);
    if (d.f != null) allPrices.push(d.f);
  }

  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) * 1.2 : 1000;
  const minPrice = 0;

  const xScale = (i: number) => (i / Math.max(data.length - 1, 1)) * chartWidth;
  const yScale = (p: number) => chartHeight - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight;

  // Determine which dates to show on x-axis (every ~2 weeks)
  const labelCount = Math.min(6, data.length);
  const labelStep = Math.max(1, Math.floor(data.length / labelCount));
  const xLabels: { i: number; label: string }[] = [];
  for (let i = 0; i < data.length; i += labelStep) {
    const d = new Date(data[i].date + 'T00:00:00');
    xLabels.push({ i, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
  }

  const cabinKeys: (keyof typeof COLORS)[] = ['y', 'pe', 'j', 'f'];

  function buildPath(key: keyof typeof COLORS): string {
    const points: [number, number][] = [];
    for (let i = 0; i < data.length; i++) {
      const val = data[i][key];
      if (val != null) {
        points.push([xScale(i), yScale(val)]);
      }
    }
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  }

  function buildDots(key: keyof typeof COLORS): { cx: number; cy: number }[] {
    const dots: { cx: number; cy: number }[] = [];
    for (let i = 0; i < data.length; i++) {
      const val = data[i][key];
      if (val != null) {
        dots.push({ cx: xScale(i), cy: yScale(val) });
      }
    }
    return dots;
  }

  // Horizontal gridlines
  const gridLines: number[] = [];
  const numGridLines = 5;
  for (let i = 0; i <= numGridLines; i++) {
    gridLines.push(i);
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '400px', display: 'block' }}>
        <g transform={`translate(${PADDING.left},${PADDING.top})`}>
          {/* Gridlines */}
          {gridLines.map((i) => {
            const y = (i / numGridLines) * chartHeight;
            const price = maxPrice - (i / numGridLines) * (maxPrice - minPrice);
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={chartWidth} y2={y} stroke="#2a2d3a" strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fill="#7a7d8e" fontSize={11}>
                  ${price.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Lines */}
          {cabinKeys.map((key) => {
            const path = buildPath(key);
            if (!path) return null;
            return (
              <path
                key={key}
                d={path}
                stroke={COLORS[key]}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}

          {/* Dots */}
          {cabinKeys.map((key) => {
            const dots = buildDots(key);
            return dots.map((dot, idx) => (
              <circle
                key={idx}
                cx={dot.cx}
                cy={dot.cy}
                r={3}
                fill={COLORS[key]}
              />
            ));
          })}

          {/* X-axis labels */}
          {xLabels.map(({ i, label }) => (
            <text
              key={i}
              x={xScale(i)}
              y={chartHeight + 20}
              textAnchor="middle"
              fill="#7a7d8e"
              fontSize={11}
            >
              {label}
            </text>
          ))}

          {/* Axes */}
          <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#2a2d3a" strokeWidth={1} />
          <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#2a2d3a" strokeWidth={1} />
        </g>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        {cabinKeys.map((key) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[key] }} />
            <span style={{ fontSize: '0.8rem', color: '#7a7d8e' }}>{CABIN_LABELS[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
