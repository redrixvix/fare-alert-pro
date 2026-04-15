const { ConvexHttpClient } = require('convex/browser');
const { execSync } = require('child_process');

const convex = new ConvexHttpClient('https://fiery-opossum-933.convex.cloud');
const gaps = [
  { route: 'FRA-JFK', cabin: 'ECONOMY' },
  { route: 'SIN-LAX', cabin: 'BUSINESS' },
  { route: 'SIN-LAX', cabin: 'FIRST' },
  { route: 'HND-LAX', cabin: 'ECONOMY' },
];

const MAX_OPTIONS = 12;
const MAX_REASONABLE_DURATION_MINUTES = 24 * 60;
const ABSOLUTE_PRICE_CAP_BY_CABIN = {
  ECONOMY: 3000,
  PREMIUM_ECONOMY: 7000,
  BUSINESS: 12000,
  FIRST: 20000,
};

function normalizeCarrier(code) {
  if (!code) return null;
  const cleaned = String(code).trim().toUpperCase();
  return /^[A-Z0-9]{2,3}$/.test(cleaned) ? cleaned : null;
}

function parseFliOutput(output) {
  const prices = [];
  const blocks = output.split(/Option \d+ of \d+/);
  for (const block of blocks.slice(1)) {
    const pm = block.match(/Total Price\s+\$([0-9,]+(?:\.[0-9]{2})?)/);
    if (!pm) continue;
    const price = parseFloat(pm[1].replaceAll(',', ''));
    const dm = block.match(/Total Duration\s+(\d+)h\s+(\d+)m/);
    const duration = dm ? parseInt(dm[1]) * 60 + parseInt(dm[2]) : null;
    const sm = block.match(/Total Stops\s+(\d+)/);
    const stops = sm ? parseInt(sm[1]) : null;
    const carrierMatches = [...block.matchAll(/│\s*([A-Z0-9]{2,3})\s+\d+/g)];
    const airline = normalizeCarrier(carrierMatches[0]?.[1] ?? null);
    prices.push({ price, airline, duration, stops });
  }
  return prices;
}

function sanitizePrices(rawPrices, cabin) {
  const cap = ABSOLUTE_PRICE_CAP_BY_CABIN[cabin] ?? 3000;
  const valid = rawPrices.filter((p) => {
    if (!Number.isFinite(p.price) || p.price <= 0 || p.price > cap) return false;
    if (p.duration != null && (!Number.isFinite(p.duration) || p.duration <= 0 || p.duration > MAX_REASONABLE_DURATION_MINUTES)) return false;
    if (p.stops != null && (!Number.isFinite(p.stops) || p.stops < 0 || p.stops > 4)) return false;
    return true;
  });
  if (!valid.length) return [];
  valid.sort((a, b) => a.price - b.price || (a.duration ?? 99999) - (b.duration ?? 99999) || (a.stops ?? 99) - (b.stops ?? 99));
  const floor = valid[0].price;
  const relativeCap = {
    ECONOMY: Math.max(floor * 3, 800),
    PREMIUM_ECONOMY: Math.max(floor * 3.5, 2500),
    BUSINESS: Math.max(floor * 4, 5000),
    FIRST: Math.max(floor * 4, 12000),
  }[cabin] ?? cap;
  const capped = valid.filter((p) => p.price <= relativeCap);
  const deduped = [];
  const seen = new Set();
  for (const p of capped) {
    const key = [p.price, p.airline ?? 'UNK', p.duration ?? 'NA', p.stops ?? 'NA'].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
    if (deduped.length >= MAX_OPTIONS) break;
  }
  return deduped;
}

function getPrices(origin, dest, date, cabin) {
  try {
    const out = execSync(`fli flights ${origin} ${dest} ${date} --class ${cabin}`, { timeout: 30000, encoding: 'utf8' });
    return sanitizePrices(parseFliOutput(out), cabin);
  } catch {
    return [];
  }
}

(async () => {
  const today = new Date();
  for (const gap of gaps) {
    const [origin, dest] = gap.route.split('-');
    const rows = await convex.query('prices:getPricesByRoute', { route: gap.route, cabin: gap.cabin });
    const covered = new Set(rows.map((r) => r.search_date));

    for (let offset = 0; offset < 90; offset++) {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      const dateStr = d.toISOString().split('T')[0];
      if (covered.has(dateStr)) continue;
      const prices = getPrices(origin, dest, dateStr, gap.cabin);
      console.log('FILL', gap.route, gap.cabin, dateStr, prices.length);
      for (const p of prices) {
        await convex.mutation('prices:insertPriceRecord', {
          route: gap.route,
          cabin: gap.cabin,
          search_date: dateStr,
          price: p.price,
          currency: 'USD',
          airline: p.airline ?? undefined,
          duration_minutes: p.duration ?? undefined,
          stops: p.stops ?? 0,
          departure_airport: origin,
        });
      }
    }
  }
  console.log('DONE');
})();
