// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

export const dynamic = 'force-dynamic';

function parseRoute(raw) {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  const match = cleaned.match(/^([A-Z]{3})-([A-Z]{3})$/);
  if (!match) return null;
  return { route: `${match[1]}-${match[2]}`, origin: match[1], destination: match[2] };
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getClient();
  const userRoutes = await client.query('routes:getUserRoutes', { userId: user.userId }) as any[];
  return NextResponse.json({ routes: userRoutes || [] });
}

export async function POST(req) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = body.route;
  if (!raw) return NextResponse.json({ error: 'route is required (e.g. "PIT-LAS")' }, { status: 400 });

  const parsed = parseRoute(raw);
  if (!parsed) return NextResponse.json({ error: 'Invalid route format. Use "ABC-DEF" airport codes.' }, { status: 400 });

  const client = getClient();

  const userData = await client.query('users:getUserById', { id: user.userId }) as any;
  const plan = userData?.plan || 'free';
  if (plan !== 'pro') {
    const existingRoutes = await client.query('routes:getUserRoutes', { userId: user.userId }) as any[];
    if ((existingRoutes || []).length >= 5) {
      return NextResponse.json({ error: 'Free plan limited to 5 custom routes. Upgrade to Pro for unlimited.' }, { status: 403 });
    }
  }

  try {
    await (client.mutation as any)('routes:addRoute', {
      userId: user.userId, route: parsed.route, origin: parsed.origin, destination: parsed.destination
    });
    return NextResponse.json({ success: true, route: parsed.route });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const route = searchParams.get('route');
  if (!route) return NextResponse.json({ error: 'route is required' }, { status: 400 });

  try {
    const client = getClient();
    await (client.mutation as any)('routes:deleteRoute', { userId: user.userId, route });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }
}