import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getAllRoutes, addRoute, getUserRoutes } from '@/lib/db';

export async function GET() {
  const routes = getAllRoutes() as any[];
  const userRoutes = getUserRoutes();
  const userRouteSet = new Set(userRoutes.map((u) => u.route));

  const routesWithFlag = routes.map((r: any) => ({
    ...r,
    is_custom: userRouteSet.has(r.route),
  }));

  return NextResponse.json({ routes: routesWithFlag });
}

export async function POST(request: Request) {
  try {
    const { origin, destination } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json({ success: false, error: 'Origin and destination required' }, { status: 400 });
    }

    const o = origin.trim().toUpperCase();
    const d = destination.trim().toUpperCase();
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
    origin = resolve_airport('${o}')
    dest = resolve_airport('${d}')
    print('OK')
except Exception as e:
    print('FAIL:' + str(e))
`;

    const output = await new Promise<string>((resolve) => {
      const child = spawn(PYTHON_PATH, ['-c', script], {
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
    if (routes.find((r: any) => r.route === route)) {
      return NextResponse.json({ success: false, error: 'Route already tracked' }, { status: 409 });
    }

    addRoute(route, o, d);

    return NextResponse.json({ success: true, route });
  } catch (err) {
    console.error('Error adding route:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
