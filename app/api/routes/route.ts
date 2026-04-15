// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAllRoutes, getUserRoutes, addUserRoute } from '@/lib/db-pg';

function sanitizeAirportCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [allRoutes, userRoutes] = await Promise.all([
    getAllRoutes(),
    getUserRoutes(user.userId),
  ]);

  const userRouteSet = new Set((userRoutes || []).map((r) => r.route));
  const routeMap = new Map();
  for (const r of allRoutes) routeMap.set(r.route, { ...r, is_custom: userRouteSet.has(r.route) });
  for (const r of userRoutes || []) routeMap.set(r.route, { ...r, is_custom: true });
  const routesWithFlag = Array.from(routeMap.values());

  return NextResponse.json({ routes: routesWithFlag });
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination } = await request.json();

    if (!origin || !destination) return NextResponse.json({ success: false, error: 'Origin and destination required' }, { status: 400 });

    const o = sanitizeAirportCode(origin);
    const d = sanitizeAirportCode(destination);

    if (!o || !d) return NextResponse.json({ success: false, error: 'Airport codes must be exactly 3 letters' }, { status: 400 });
    if (o === d) return NextResponse.json({ success: false, error: 'Origin and destination must be different' }, { status: 400 });

    const route = `${o}-${d}`;

    const [allRoutes, userRoutes] = await Promise.all([getAllRoutes(), getUserRoutes(user.userId)]);

    if ((allRoutes || []).find((r) => r.route === route) || (userRoutes || []).find((r) => r.route === route)) {
      return NextResponse.json({ success: false, error: 'Route already tracked' }, { status: 409 });
    }

    await addUserRoute(user.userId, route, o, d);
    return NextResponse.json({ success: true, route });
  } catch (err) {
    console.error('Error adding route:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
