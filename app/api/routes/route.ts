import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getAuthUser } from '@/lib/auth';
import { getAllRoutes, addRoute, getUserRoutes } from '@/lib/db';

function sanitizeAirportCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const routes = getAllRoutes() as any[];
  const userRoutes = getUserRoutes(user.userId);
  const userRouteSet = new Set(userRoutes.map((u) => u.route));

  const routeMap = new Map<string, any>();
  for (const r of routes) routeMap.set(r.route, { ...r, is_custom: userRouteSet.has(r.route) });
  for (const r of userRoutes) routeMap.set(r.route, { ...r, is_custom: true });
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

    // Validate airports via fli
    const PYTHON_PATH = '/usr/bin/python3';
    const script = `
import sys
sys.path.insert(0, '/home/rixvix/.local/lib/python3.12/site-packages')
from fli.core.parsers import resolve_airport
try:
    origin = resolve_airport(sys.argv[1])
    dest = resolve_airport(sys.argv[2])
    print('OK')
except Exception as e:
    print('FAIL:' + str(e))
`;

    const output = await new Promise<string>((resolve) => {
      const child = spawn(PYTHON_PATH, ['-c', script, o, d], {
        env: { ...process.env, PYTHONPATH: '/home/rixvix/.local/lib/python3.12/site-packages' },
      });
      let out = '';
      child.stdout?.on('data', (data) => { out += data.toString(); });
      child.on('close', () => resolve(out.trim()));
      child.on('error', () => resolve('FAIL:error'));
    });

    if (!output.includes('OK')) {
      return NextResponse.json({ success: false, error: 'Invalid airport code' }, { status: 400 });
    }

    // Check if already exists
    const routes = getAllRoutes() as any[];
    const userRoutes = getUserRoutes(user.userId);
    if (routes.find((r: any) => r.route === route) || userRoutes.find((r: any) => r.route === route)) {
      return NextResponse.json({ success: false, error: 'Route already tracked' }, { status: 409 });
    }

    addRoute(user.userId, route, o, d);

    return NextResponse.json({ success: true, route });
  } catch (err) {
    console.error('Error adding route:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
