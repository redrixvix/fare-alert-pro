import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { insertPrice, updateRoutePrice, getHistoricalAvg, insertAlert, getAllRoutes, getUserRoutes } from '@/lib/db';
import path from 'path';
import fs from 'fs';

const CABIN_CLASSES = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
const PYTHON_PATH = '/usr/bin/python3';
const DATA_DIR = path.join(process.cwd(), 'data');

// All 13 target dates for 90-day coverage
const ALL_DATES = [
  0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 80, 90,
].map((d) => {
  const dt = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  return dt.toISOString().split('T')[0];
});

function getCoverageFile() {
  return path.join(DATA_DIR, 'date-coverage.json');
}

interface CoverageState {
  checked: Record<string, string[]>; // route -> [date strings checked]
  last_reset: string;
}

function loadCoverage(): CoverageState {
  try {
    const raw = fs.readFileSync(getCoverageFile(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { checked: {}, last_reset: new Date().toISOString().split('T')[0] };
  }
}

function saveCoverage(state: CoverageState) {
  fs.writeFileSync(getCoverageFile(), JSON.stringify(state, null, 2));
}

function checkPrice(origin: string, destination: string, dateStr: string, cabin: string): Promise<any> {
  const script = `
import sys
sys.path.insert(0, '/home/rixvix/.local/lib/python3.12/site-packages')
import json
from fli.core.parsers import resolve_airport
from fli.search import SearchFlights
from fli.models.google_flights.flights import FlightSearchFilters, PassengerInfo, FlightSegment, TripType, MaxStops, SeatType

origin = resolve_airport('${origin}')
dest = resolve_airport('${destination}')

sf = SearchFlights()
passenger_info = PassengerInfo(adults=1)
segment = FlightSegment(
    travel_date="${dateStr}",
    departure_airport=[[origin, 0]],
    arrival_airport=[[dest, 0]]
)
filters = FlightSearchFilters(
    trip_type=TripType.ONE_WAY,
    passenger_info=passenger_info,
    flight_segments=[segment],
    stops=MaxStops.ANY,
    seat_type=SeatType.${cabin},
    show_all_results=True,
    sort_by=1
)
results = sf.search(filters, top_n=3)
if not results:
    print(json.dumps(None))
else:
    out = []
    for r in results:
        out.append({
            'price': r.price,
            'currency': r.currency,
            'airline': r.legs[0].airline.name if r.legs else None,
            'duration': r.duration,
            'stops': r.stops,
        })
    print(json.dumps(out))
`;

  return new Promise((resolve) => {
    const child = spawn(PYTHON_PATH, ['-c', script], {
      env: { ...process.env, PYTHONPATH: '/home/rixvix/.local/lib/python3.12/site-packages' },
    });
    let stdout = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.on('close', () => {
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve(null);
      }
    });
    child.on('error', () => resolve(null));
  });
}

export async function GET() {
  const results = { checked: 0, alerts: 0, errors: 0 };
  const now = new Date();
  const coverage = loadCoverage();

  // Collect all routes (default + custom)
  const defaultRoutes = getAllRoutes() as any[];
  const userRoutes = getUserRoutes();
  const userRouteSet = new Set(userRoutes.map((u) => u.route));
  const allRoutes = defaultRoutes.map((r: any) => ({
    route: r.route,
    is_custom: userRouteSet.has(r.route),
  }));

  // For each route, pick 4 unchecked dates from ALL_DATES
  const datesToCheck = ALL_DATES.filter((d) => d >= now.toISOString().split('T')[0]);

  for (const { route, is_custom } of allRoutes) {
    const [origin, destination] = route.split('-');

    if (!coverage.checked[route]) coverage.checked[route] = [];

    // Find 4 dates that haven't been checked for this route
    const unchecked = datesToCheck.filter((d) => !coverage.checked[route].includes(d));

    // Pick first 4 (or all if fewer remain — cycle back to checked ones)
    const batch = unchecked.slice(0, 4);
    const finalBatch = batch.length < 4
      ? [...batch, ...datesToCheck.filter((d) => !batch.includes(d)).slice(0, 4 - batch.length)]
      : batch;

    for (const dateStr of finalBatch) {
      for (const cabin of CABIN_CLASSES) {
        try {
          const prices = await checkPrice(origin, destination, dateStr, cabin);
          if (prices && prices.length > 0) {
            let best: any = null;
            for (const p of prices) {
              if (p.price && (!best || p.price < best.price)) {
                best = p;
              }
            }
            if (best) {
              insertPrice(route, cabin, dateStr, best.price, best.currency, best.airline, best.duration, best.stops);
              updateRoutePrice(route, cabin, best.price, best.currency);
              results.checked++;

              // Alert for custom routes only if >7 days history
              if (is_custom) {
                const historicalAvg = getHistoricalAvg(route, cabin);
                if (historicalAvg && best.price < historicalAvg * 0.5) {
                  const savingsPct = ((historicalAvg - best.price) / historicalAvg) * 100;
                  insertAlert(route, cabin, dateStr, best.price, historicalAvg, savingsPct, best.airline);
                  results.alerts++;
                }
              }
            }
          }

          // Mark date as checked for this route
          if (!coverage.checked[route].includes(dateStr)) {
            coverage.checked[route].push(dateStr);
          }

          await new Promise((r) => setTimeout(r, 2000));
        } catch (err) {
          console.error(`Error checking ${route} [${cabin}] on ${dateStr}:`, err);
          results.errors++;
        }
      }
    }
  }

  saveCoverage(coverage);

  return NextResponse.json({
    success: true,
    results,
    lastCheck: new Date().toISOString(),
  });
}
