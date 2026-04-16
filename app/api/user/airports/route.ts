// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserAirports, setUserAirports } from '@/lib/db-pg';

const VALID_AIRPORTS = [
  'ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'JFK', 'LGA', 'EWR', 'SFO', 'SEA',
  'LAS', 'PHX', 'IAH', 'MIA', 'MCO', 'FLL', 'BOS', 'PHL', 'DCA', 'MKE',
  'MSP', 'DTW', 'CLT', 'SLC', 'SAN', 'TPA', 'PDX', 'AUS', 'BWI', 'STL',
  'SAT', 'RDU', 'IND', 'CVG', 'CMH', 'JAX', 'RIC', 'BNA', 'MEM', 'PIT',
  'CLE', 'OMA', 'MCI', 'GSO', 'ALB', 'BDL', 'ROC', 'SYR', 'PVD', 'SJC'
];

function isValidAirport(code) {
  return VALID_AIRPORTS.includes(code.toUpperCase());
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const airports = await getUserAirports(user.userId);
  return NextResponse.json({ airports: airports.map((a) => a.airport) });
}

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!Array.isArray(body.airports)) return NextResponse.json({ error: 'airports must be an array' }, { status: 400 });

  for (const code of body.airports) {
    if (typeof code !== 'string' || code.length !== 3 || !/^[A-Za-z]{3}$/.test(code)) {
      return NextResponse.json({ error: `Invalid airport code: ${code}. Must be 3 letters.` }, { status: 400 });
    }
    if (!isValidAirport(code)) {
      return NextResponse.json({ error: `Unknown airport: ${code.toUpperCase()}` }, { status: 400 });
    }
  }

  await setUserAirports(user.userId, body.airports.map((a) => a.toUpperCase()));
  const airports = await getUserAirports(user.userId);
  return NextResponse.json({ success: true, airports: airports.map((a) => a.airport) });
}
