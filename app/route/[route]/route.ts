import { NextResponse } from 'next/server';
import { getRouteChartData, getRoutePriceHistory, getAllRoutes } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ route: string }> }) {
  const { route } = await params;
  const decoded = decodeURIComponent(route as string);

  const routes = getAllRoutes() as any[];
  const routeRecord = routes.find((r: any) => r.route === decoded);

  if (!routeRecord) {
    return new NextResponse('Route not found', { status: 404 });
  }

  const chartData = getRouteChartData(decoded, 90);
  const priceHistory = getRoutePriceHistory(decoded, 50);

  const html = buildPage(decoded, chartData, priceHistory);
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function buildPage(
  route: string,
  chartData: { date: string; y: number | null; pe: number | null; j: number | null; f: number | null }[],
  priceHistory: any[]
) {
  const [origin, destination] = route.split('-');
  const chartDataJson = JSON.stringify(chartData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${route} — FareAlertPro</title>
  <style>
    :root{--bg:#0f1117;--card:#1a1d27;--border:#2a2d3a;--text:#e8e9ed;--text-dim:#7a7d8e;--accent:#4f9cf9;--accent-dim:#2a4f8a;--danger:#e63946;--warn:#f4a261;--success:#2a9d8f;}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
    .dashboard{min-height:100vh;}
    .header{background:var(--card);border-bottom:1px solid var(--border);padding:1.5rem 2rem;}
    .header-inner{max-width:1100px;margin:0 auto;}
    .header h1{font-size:1.75rem;font-weight:700;letter-spacing:-0.02em;}
    .subtitle{color:var(--text-dim);font-size:0.9rem;margin-top:0.25rem;}
    .content{max-width:1100px;margin:0 auto;padding:2rem;display:flex;flex-direction:column;gap:2rem;}
    .section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;}
    .section h2{font-size:1.1rem;font-weight:600;margin-bottom:1rem;color:var(--text);}
    .routes-table-wrap{overflow-x:auto;}
    .chart-container{width:100%;margin-top:1rem;}
    .back-link{color:#7a7d8e;text-decoration:none;font-size:0.9rem;}
    .back-link:hover{color:#e8e9ed;}
    .price-table{width:100%;border-collapse:collapse;font-size:0.85rem;}
    .price-table th{text-align:left;padding:0.5rem 1rem;color:#7a7d8e;font-weight:500;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #2a2d3a;}
    .price-table td{padding:0.6rem 1rem;border-bottom:1px solid #2a2d3a;}
    .cabin-y{color:#4f9cf9;}
    .cabin-pe{color:#a0a8c0;}
    .cabin-j{color:#c9a84c;font-weight:600;}
    .cabin-f{color:#9b8fe8;}
    .no-data{text-align:center;padding:3rem;color:#7a7d8e;}
  </style>
</head>
<body>
  <div class="dashboard">
    <header class="header">
      <div class="header-inner">
        <div style="display:flex;align-items:center;gap:1rem;">
          <a href="/routes" class="back-link">← Routes</a>
          <h1>✈️ ${route}</h1>
        </div>
        <p class="subtitle">${origin} → ${destination} · 90-day price history</p>
      </div>
    </header>
    <div class="content">
      <section class="section">
        <h2>📊 Price History (90 days)</h2>
        ${chartData.length > 0
          ? `<div class="chart-container" id="chart-root"></div>`
          : `<div class="no-data"><p>No price data yet for this route.</p><p>Run a price check to start collecting data.</p></div>`
        }
      </section>

      ${priceHistory.length > 0 ? `
      <section class="section">
        <h2>📋 Recent Price Records</h2>
        <div class="routes-table-wrap">
          <table class="price-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Cabin</th>
                <th>Price</th>
                <th>Airline</th>
                <th>Duration</th>
                <th>Stops</th>
              </tr>
            </thead>
            <tbody>
              ${priceHistory.map((p) => {
                const cabinCls = p.cabin === 'ECONOMY' ? 'cabin-y' : p.cabin === 'PREMIUM_ECONOMY' ? 'cabin-pe' : p.cabin === 'BUSINESS' ? 'cabin-j' : 'cabin-f';
                const cabinLabel = p.cabin.replace('_', ' ');
                const duration = p.duration_minutes ? Math.floor(p.duration_minutes / 60) + 'h ' + (p.duration_minutes % 60) + 'm' : '—';
                const stops = p.stops != null ? (p.stops === 0 ? 'Direct' : p.stops + ' stop' + (p.stops > 1 ? 's' : '')) : '—';
                const date = new Date(p.fetched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `<tr><td>${date}</td><td class="${cabinCls}">${cabinLabel}</td><td>$${p.price.toFixed(0)} ${p.currency}</td><td>${p.airline || '—'}</td><td>${duration}</td><td>${stops}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
      ` : ''}
    </div>
  </div>
  ${chartData.length > 0 ? `
  <script>
  (function(){
    var data = ${chartDataJson};
    var root = document.getElementById('chart-root');
    if (!root || !data.length) return;
    var COLORS = { y: '#4f9cf9', pe: '#a0a8c0', j: '#c9a84c', f: '#9b8fe8' };
    var W = 700, H = 300;
    var PAD = { top: 20, right: 20, bottom: 50, left: 60 };
    var cw = W - PAD.left - PAD.right;
    var ch = H - PAD.top - PAD.bottom;
    var allPrices = [];
    data.forEach(function(d){ ['y','pe','j','f'].forEach(function(k){ if (d[k] != null) allPrices.push(d[k]); }); });
    var maxPrice = allPrices.length ? Math.max.apply(null, allPrices) * 1.2 : 1000;
    var xS = function(i){ return (i / Math.max(data.length - 1, 1)) * cw; };
    var yS = function(p){ return ch - (p / maxPrice) * ch; };
    var labelCount = Math.min(6, data.length);
    var labelStep = Math.max(1, Math.floor(data.length / labelCount));
    var xLabels = [];
    for (var i = 0; i < data.length; i += labelStep) {
      var dd = new Date(data[i].date + 'T00:00:00');
      xLabels.push({ i: i, label: dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.style.width = '100%'; svg.style.minWidth = '400px'; svg.style.display = 'block';
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'translate(' + PAD.left + ',' + PAD.top + ')');
    for (var li = 0; li <= 5; li++) {
      var y = (li / 5) * ch;
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0'); line.setAttribute('y1', String(y));
      line.setAttribute('x2', String(cw)); line.setAttribute('y2', String(y));
      line.setAttribute('stroke', '#2a2d3a'); line.setAttribute('stroke-width', '1');
      g.appendChild(line);
      var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', '-8'); txt.setAttribute('y', String(y + 4));
      txt.setAttribute('text-anchor', 'end'); txt.setAttribute('fill', '#7a7d8e');
      txt.setAttribute('font-size', '11');
      txt.textContent = '$' + (maxPrice - (li / 5) * maxPrice).toFixed(0);
      g.appendChild(txt);
    }
    ['y','pe','j','f'].forEach(function(key){
      var pts = [];
      for (var i = 0; i < data.length; i++) {
        var v = data[i][key];
        if (v != null) pts.push([xS(i), yS(v)]);
      }
      if (!pts.length) return;
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pts.map(function(p, i){ return (i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '));
      path.setAttribute('stroke', COLORS[key]); path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none'); path.setAttribute('stroke-linejoin', 'round');
      g.appendChild(path);
      pts.forEach(function(p){
        var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', p[0].toFixed(1)); c.setAttribute('cy', p[1].toFixed(1));
        c.setAttribute('r', '3'); c.setAttribute('fill', COLORS[key]);
        g.appendChild(c);
      });
    });
    xLabels.forEach(function(o){
      var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', xS(o.i).toFixed(1)); txt.setAttribute('y', String(ch + 20));
      txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('fill', '#7a7d8e');
      txt.setAttribute('font-size', '11'); txt.textContent = o.label;
      g.appendChild(txt);
    });
    var a1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    a1.setAttribute('x1','0'); a1.setAttribute('y1','0'); a1.setAttribute('x2','0'); a1.setAttribute('y2',String(ch));
    a1.setAttribute('stroke','#2a2d3a'); g.appendChild(a1);
    var a2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    a2.setAttribute('x1','0'); a2.setAttribute('y1',String(ch)); a2.setAttribute('x2',String(cw)); a2.setAttribute('y2',String(ch));
    a2.setAttribute('stroke','#2a2d3a'); g.appendChild(a2);
    svg.appendChild(g);
    var legend = document.createElement('div');
    legend.style.cssText = 'display:flex;gap:1.5rem;justify-content:center;margin-top:0.5rem;flex-wrap:wrap;';
    [['y','Economy'],['pe','Premium Economy'],['j','Business'],['f','First']].forEach(function(kv){
      var item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:0.4rem;';
      var dot = document.createElement('div');
      dot.style.cssText = 'width:12px;height:12px;border-radius:50%;background:' + COLORS[kv[0]] + ';';
      var txt = document.createElement('span');
      txt.style.cssText = 'font-size:0.8rem;color:#7a7d8e;';
      txt.textContent = kv[1];
      item.appendChild(dot); item.appendChild(txt); legend.appendChild(item);
    });
    root.appendChild(svg);
    root.appendChild(legend);
  })();
  </script>
  ` : ''}
</body>
</html>`;
}
