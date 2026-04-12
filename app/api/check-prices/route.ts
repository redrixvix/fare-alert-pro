import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { insertPrice, updateRoutePrice, getHistoricalAvg, insertAlert, getAllRoutes, getUserRoutes, getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;


const PYTHON_PATH = '/usr/bin/python3';
const DATA_DIR = path.join(process.cwd(), 'data');

function getAllTargetDates() {
  // Daily coverage for 90 days — 91 dates total
  const dates: string[] = [];
  for (let d = 0; d <= 90; d++) {
    const dt = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
    dates.push(dt.toISOString().split('T')[0]);
  }
  return dates;
}

function getCoverageFile() {
  return path.join(DATA_DIR, 'date-coverage.json');
}

// Simple coverage: only track which dates have data. No blacklist — dates not in available get checked every cycle.
type CoverageState = Record<string, string[]>; // route -> array of available dates

function loadCoverage(): CoverageState {
  try {
    if (fs.existsSync(getCoverageFile())) {
      const raw = fs.readFileSync(getCoverageFile(), 'utf-8');
      const parsed = JSON.parse(raw);
      // Migrate old format
      if (parsed.available) return parsed.available;
      if (parsed.checked) return parsed.checked;
      return parsed;
    }
  } catch { /* ignore */ }
  return {};
}

function saveCoverage(state: CoverageState) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(getCoverageFile(), JSON.stringify(state, null, 2));
}

// Fetch all 4 cabin classes concurrently in a single subprocess spawn
function checkPriceAllCabins(origin: string, destination: string, dateStr: string): Promise<Record<string, any>> {
  const script = `
import sys
sys.path.insert(0, '/home/rixvix/.local/lib/python3.12/site-packages')
import json
from fli.core.parsers import resolve_airport
from fli.search import SearchFlights
from fli.models.google_flights.flights import FlightSearchFilters, PassengerInfo, FlightSegment, TripType, MaxStops, SeatType
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    origin = resolve_airport('${origin}')
    dest = resolve_airport('${destination}')
except Exception:
    print(json.dumps({'error': 'invalid_airport'}))
    sys.exit(0)

CABINS = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']
DATE = '${dateStr}'

def fetch_cabin(cabin):
    try:
        sf = SearchFlights()
        segment = FlightSegment(
            travel_date=DATE,
            departure_airport=[[origin, 0]],
            arrival_airport=[[dest, 0]]
        )
        filters = FlightSearchFilters(
            trip_type=TripType.ONE_WAY,
            passenger_info=PassengerInfo(adults=1),
            flight_segments=[segment],
            stops=MaxStops.ANY,
            seat_type=SeatType[cabin],
            show_all_results=True,
            sort_by=1
        )
        results = sf.search(filters, top_n=1)
        if not results:
            return (cabin, None)
        r = results[0]
        return (cabin, {
            'price': r.price,
            'currency': r.currency,
            'airline': r.legs[0].airline.name if r.legs else None,
            'duration': r.duration,
            'stops': r.stops,
        })
    except Exception as e:
        return (cabin, {'error': str(e)})

results = {}
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(fetch_cabin, c): c for c in CABINS}
    for future in as_completed(futures):
        cabin, data = future.result()
        results[cabin] = data

print(json.dumps(results))
`;

  return new Promise((resolve) => {
    const child = spawn(PYTHON_PATH, ['-c', script], {
      env: { ...process.env, PYTHONPATH: '/home/rixvix/.local/lib/python3.12/site-packages' },
      timeout: 60000,
    });
    let stdout = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.on('close', (code) => {
      if (code === 0 || code === null) {
        try { resolve(JSON.parse(stdout.trim())); }
        catch { resolve({}); }
      } else { resolve({}); }
    });
    child.on('error', () => resolve({}));
  });
}

// Process a single route-date pair — all 4 cabins in one subprocess
async function processPair(
  route: string,
  dateStr: string,
  db: any
): Promise<{ checked: number; skipped: boolean; errors: number; alert: boolean; alertData?: any }> {
  const [origin, destination] = route.split('-');
  if (!origin || !destination) return { checked: 0, skipped: false, errors: 1, alert: false };

  try {
    const cabinResults = await checkPriceAllCabins(origin, destination, dateStr);

    let gotData = false;
    let bestByCabin: Record<string, any> = {};

    for (const [cabin, data] of Object.entries(cabinResults)) {
      // data is a single price object {price, currency, ...} or {error: string} — NOT an array
      if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
      if (data.error) continue;
      gotData = true;
      bestByCabin[cabin] = data;
    }

    if (gotData) {
      // Got data — mark as available and store all cabin prices
      for (const [cabin, best] of Object.entries(bestByCabin)) {
        const b = best as any;
        insertPrice(route, cabin, dateStr, b.price, b.currency, b.airline, b.duration ?? null, b.stops ?? 0);
        updateRoutePrice(route, cabin, b.price, b.currency);
      }

      // Alert check — only on cabins that returned real data
      for (const [cabin, best] of Object.entries(bestByCabin)) {
        const b = best as any;
        const historicalAvg = getHistoricalAvg(route, cabin);
        if (historicalAvg && b.price < historicalAvg * 0.5) {
          const savingsPct = ((historicalAvg - b.price) / historicalAvg) * 100;
          insertAlert(route, cabin, dateStr, b.price, historicalAvg, savingsPct, b.airline);
          return { checked: Object.keys(bestByCabin).length, skipped: false, errors: 0, alert: true, alertData: { cabin, price: b.price, historicalAvg, savingsPct, airline: b.airline } };
        }
      }

      return { checked: Object.keys(bestByCabin).length, skipped: false, errors: 0, alert: false };
    } else {
      // No data — permanently unavailable
      return { checked: 0, skipped: true, errors: 0, alert: false };
    }
  } catch (err: any) {
    console.error(`Error ${route} ${dateStr}: ${err?.message}`);
    return { checked: 0, skipped: false, errors: 1, alert: false };
  }
}

export async function GET() {
  const results = { checked: 0, skipped: 0, errors: 0, alerts: 0 };
  const allDates = getAllTargetDates();

  const defaultRoutes = (getAllRoutes() as any[]).map((r: any) => ({ route: r.route }));
  const userRoutes = (getUserRoutes() as any[]).map((r: any) => ({ route: r.route }));
  const allRoutes = [...defaultRoutes, ...userRoutes];

  let coverage = loadCoverage();
  const db = getDb();

  // Pick 1 route with the fewest available dates
  const routesNeedingCoverage = allRoutes
    .map(({ route }) => ({
      route,
      availableCount: (coverage[route] || []).length,
    }))
    .sort((a, b) => a.availableCount - b.availableCount)
    .slice(0, 1);

  // Build route-date pairs — no blacklist, just retry dates not yet available
  const pairs: { route: string; dateStr: string }[] = [];
  for (const { route } of routesNeedingCoverage) {
    const available = new Set(coverage[route] || []);
    const needsChecking = allDates.filter((d) => !available.has(d));
    pairs.push(...needsChecking.slice(0, 3).map((d) => ({ route, dateStr: d })));
  }

  // Process 1 pair at a time (avoid Google rate limiting)
  const batchSize = 1;
  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(({ route, dateStr }) => processPair(route, dateStr, db))
    );

    for (let j = 0; j < batch.length; j++) {
      const r = batchResults[j];
      const { route, dateStr } = batch[j];

      if (r.skipped) {
        // NO DATA — date stays untracked, will retry next cycle
        results.skipped++;
      } else {
        results.checked += r.checked;
        // Mark as available in coverage
        if (!coverage[route]) coverage[route] = [];
        if (!coverage[route].includes(dateStr)) {
          coverage[route].push(dateStr);
        }
      }
      results.errors += r.errors;
      if (r.alert) {
        results.alerts++;
        // Send Telegram alert to all connected users
        if (r.alertData && TELEGRAM_BOT_TOKEN) {
          sendTelegramAlert(r.alertData, route, dateStr).catch(console.error);
        }
      }
    }

    // Small delay between batches to avoid hammering
    if (i + batchSize < pairs.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  saveCoverage(coverage);

  return NextResponse.json({
    success: true,
    results,
    lastCheck: new Date().toISOString(),
  });
}

// Send Telegram alert to all users who have connected their Telegram account
async function sendTelegramAlert(
  alertData: { cabin: string; price: number; historicalAvg: number; savingsPct: number; airline: string },
  route: string,
  dateStr: string
) {
  const db = getDb();
  const users = db.prepare(
    "SELECT telegram_chat_id, email FROM users WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id != ''"
  ).all() as { telegram_chat_id: string; email: string }[];

  if (!users.length) return;

  const { price, historicalAvg, savingsPct, airline } = alertData;
  const cabinLabel = alertData.cabin.replace('_', ' ');
  const savings = ((historicalAvg - price) / historicalAvg * 100).toFixed(0);

  const message = `🚨 *Error Fare Alert*

✈️ *${route}* · ${cabinLabel}
💰 *$${price.toFixed(0)}* (was ~$${historicalAvg.toFixed(0)})
📉 *${savings}% below average*

🗓 ${dateStr} · ${airline || 'Multiple airlines'}

🔗 Book now before it disappears!`;

  for (const user of users) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegram_chat_id,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });
    } catch (e) {
      console.error(`Telegram send failed for ${user.email}:`, e);
    }
  }
}
