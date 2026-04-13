// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

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

export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getClient();
  const airports = await client.query('airports:getUserAirports', { userId: authUser.userId }) as string[];
  return NextResponse.json({ airports: airports || [] });
}

export async function POST(request) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const client = getClient();
  await client.mutation('airports:setUserAirports', { userId: authUser.userId, airports: body.airports.map(a => a.toUpperCase()) });
  const airports = await client.query('airports:getUserAirports', { userId: authUser.userId }) as string[];
  return NextResponse.json({ success: true, airports: airports || [] });
}

export async function DELETE(request) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const airport = searchParams.get('airport');
  if (!airport) return NextResponse.json({ error: 'airport query param required' }, { status: 400 });

  const normalized = airport.trim().toUpperCase();
  if (!isValidAirport(normalized)) return NextResponse.json({ error: 'Invalid airport code' }, { status: 400 });

  const client = getClient();
  await client.mutation('airports:removeUserAirport', { userId: authUser.userId, airport: normalized });
  const airports = await client.query('airports:getUserAirports', { userId: authUser.userId }) as string[];
  return NextResponse.json({ success: true, airports: airports || [] });
}