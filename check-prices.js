/**
 * FareAlertPro Price Checker
 * Uses ConvexHttpClient (same as the Next.js app) to push prices to Convex.
 * Run: node check-prices.js [--once] [--days N]
 */

const { ConvexHttpClient } = require('convex/browser');
const { execSync } = require('child_process');
const { writeFileSync } = require('fs');

const MAX_OPTIONS_PER_ROUTE_DATE = 12;
const ABSOLUTE_PRICE_CAP_BY_CABIN = {
  ECONOMY: 3000,
  PREMIUM_ECONOMY: 7000,
  BUSINESS: 12000,
  FIRST: 20000,
};
const MAX_REASONABLE_DURATION_MINUTES = 24 * 60;
const CABINS = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];

const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const LOG_FILE = '/home/rixvix/.openclaw/workspace/fare-alert-pro/price-check.log';

const ROUTES = [
  ['JFK','LAX'],['LAX','JFK'],['ORD','LGA'],['LGA','ORD'],
  ['ATL','LAX'],['LAX','ATL'],['DFW','LAX'],['LAX','DFW'],
  ['SFO','LAX'],['LAX','SFO'],['MIA','LAX'],['LAX','MIA'],
  ['SEA','LAX'],['LAX','SEA'],['BOS','LAX'],['LAX','BOS'],
  ['JFK','LHR'],['LHR','JFK'],['JFK','CDG'],['CDG','JFK'],
  ['JFK','FRA'],['FRA','JFK'],['IST','JFK'],['JFK','IST'],
  ['SIN','LAX'],['LAX','SIN'],['HND','LAX'],['LAX','HND'],
];

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try { writeFileSync(LOG_FILE, line + '\n', { flag: 'a' }); } catch {}
}

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

  if (valid.length === 0) return [];

  valid.sort((a, b) => a.price - b.price || (a.duration ?? 99999) - (b.duration ?? 99999) || (a.stops ?? 99) - (b.stops ?? 99));

  const floor = valid[0].price;
  const relativeCap = {
    ECONOMY: Math.max(floor * 3, 800),
    PREMIUM_ECONOMY: Math.max(floor * 3.5, 2500),
    BUSINESS: Math.max(floor * 4, 5000),
    FIRST: Math.max(floor * 4, 12000),
  }[cabin] ?? Math.max(floor * 3, 800);
  const capped = valid.filter((p) => p.price <= relativeCap);
  const deduped = [];
  const seen = new Set();

  for (const p of capped) {
    const key = [p.price, p.airline ?? 'UNK', p.duration ?? 'NA', p.stops ?? 'NA'].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
    if (deduped.length >= MAX_OPTIONS_PER_ROUTE_DATE) break;
  }

  return deduped;
}

function getPrices(origin, dest, date, cabin = 'ECONOMY') {
  try {
    const out = execSync(`fli flights ${origin} ${dest} ${date} --class ${cabin}`, { timeout: 25000, encoding: 'utf8' });
    return sanitizePrices(parseFliOutput(out), cabin);
  } catch (e) {
    return [];
  }
}

async function runCycle(client, days, startOffset = 0) {
  let checked = 0, inserted = 0, errors = 0;
  const today = new Date();
  
  for (const [origin, dest] of ROUTES) {
    const route = `${origin}-${dest}`;
    for (let offset = startOffset; offset < startOffset + days; offset++) {
      const d = new Date(today); d.setDate(d.getDate() + offset);
      const dateStr = d.toISOString().split('T')[0];
      
      for (const cabin of CABINS) {
        const prices = getPrices(origin, dest, dateStr, cabin);
        for (const p of prices) {
          try {
            const id = await client.mutation('prices:insertPriceRecord', {
              route, cabin, search_date: dateStr,
              price: p.price, currency: 'USD', airline: p.airline ?? undefined,
              duration_minutes: p.duration ?? undefined, stops: p.stops ?? 0,
              departure_airport: origin
            });
            if (id) inserted++;
          } catch (e) { errors++; }
        }
      }
      checked++;
      if (checked % 20 === 0) process.stdout.write(`\r  {checks:${checked} inserts:${inserted} errors:${errors}}`);
    }
  }
  return { checked, inserted, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const once = args.includes('--once');
  const daysIdx = args.indexOf('--days');
  const startIdx = args.indexOf('--start-offset');
  const days = daysIdx >= 0 ? parseInt(args[daysIdx + 1]) : 7;
  const startOffset = startIdx >= 0 ? parseInt(args[startIdx + 1]) : 0;

  log(`Price checker starting | ${ROUTES.length} routes x ${days} days | start offset ${startOffset}`);
  console.log(`🚀 FareAlertPro Price Checker | ${ROUTES.length} routes x ${days} days | start offset ${startOffset}\n`);

  const client = new ConvexHttpClient(CONVEX_URL);

  // Verify connection
  try {
    const status = await client.query('status:getStatus', {});
    log(`Connected to Convex | ${status.routesTracked} routes, ${status.totalPrices} prices`);
    console.log(`   Connected | ${status.routesTracked} routes, ${status.totalPrices} prices\n`);
  } catch (e) {
    log(`Convex connection failed: ${e.message}`);
    console.error('❌ Convex connection failed:', e.message);
    return;
  }

  if (once) {
    const { checked, inserted, errors } = await runCycle(client, days, startOffset);
    console.log(`\n✅ Done: {checked:${checked} inserted:${inserted} errors:${errors}}`);
    log(`One-shot complete: ${checked} checks, ${inserted} inserted, ${errors} errors`);
    return;
  }

  let cycle = 0;
  while (true) {
    cycle++;
    const ts = new Date().toLocaleTimeString();
    log(`Cycle ${cycle} starting`);
    console.log(`\n🔄 Cycle ${cycle} @ ${ts}`);

    const { checked, inserted, errors } = await runCycle(client, days, startOffset);
    console.log(`   checked:${checked} inserted:${inserted} errors:${errors}`);
    log(`Cycle ${cycle} done: ${checked} checks, ${inserted} inserts, ${errors} errors`);

    console.log('   Sleeping 5 min...');
    await new Promise(r => setTimeout(r, 300000));
  }
}

main().catch(e => { console.error('Fatal:', e); log(`Fatal: ${e.message}`); process.exit(1); });