import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

function sanitizeAirportCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getClient();
  const [allRoutes, userRoutes] = await Promise.all([
    client.query('routes:getAllRoutes', {}),
    client.query('routes:getUserRoutes', { userId: user.userId }),
  ]) as [any[], any[]];

  const userRouteSet = new Set((userRoutes || []).map((r: any) => r.route));
  const routeMap = new Map<string, any>();
  for (const r of allRoutes) routeMap.set(r.route, { ...r, is_custom: userRouteSet.has(r.route) });
  for (const r of userRoutes || []) routeMap.set(r.route, { ...r, is_custom: true });
  const routesWithFlag = Array.from(routeMap.values());

  return NextResponse.json({ routes: routesWithFlag });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json({ success: false, error: 'Origin and destination required' }, { status: 400 });
    }

    const o = sanitizeAirportCode(origin);
    const d = sanitizeAirportCode(destination);

    if (!o || !d) {
      return NextResponse.json({ success: false, error: 'Airport codes must be exactly 3 letters' }, { status: 400 });
    }

    const route = `${o}-${d}`;

    if (o === d) {
      return NextResponse.json({ success: false, error: 'Origin and destination must be different' }, { status: 400 });
    }

    // Simple format-only validation (fli isn't available on Vercel — local script validates properly)
    const AIRPORT_RE = /^[A-Z]{3}$/;
    if (!AIRPORT_RE.test(o) || !AIRPORT_RE.test(d)) {
      return NextResponse.json({ success: false, error: 'Invalid airport code' }, { status: 400 });
    }

    const client = getClient();

    // Check if already tracked
    const [allRoutes, userRoutes] = await Promise.all([
      client.query('routes:getAllRoutes', {}),
      client.query('routes:getUserRoutes', { userId: user.userId }),
    ]) as [any[], any[]];

    if ((allRoutes || []).find((r: any) => r.route === route) || (userRoutes || []).find((r: any) => r.route === route)) {
      return NextResponse.json({ success: false, error: 'Route already tracked' }, { status: 409 });
    }

    await client.mutation('routes:addRoute', { userId: user.userId, route, origin: o, destination: d });

    return NextResponse.json({ success: true, route });
  } catch (err) {
    console.error('Error adding route:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}