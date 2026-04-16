// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserRoutes, addUserRoute, getUserById } from '@/lib/db-pg';
import { pg } from '@/lib/db-pg';

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

  const userRoutes = await getUserRoutes(user.userId);
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

  try {
    const userData = await getUserById(user.userId);
    const plan = userData?.plan || 'free';
    if (plan !== 'pro') {
      const existingRoutes = await getUserRoutes(user.userId);
      if ((existingRoutes || []).length >= 5) {
        return NextResponse.json({ error: 'Free plan limited to 5 custom routes. Upgrade to Pro for unlimited.' }, { status: 403 });
      }
    }

    await addUserRoute(user.userId, parsed.route, parsed.origin, parsed.destination);
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
    await pg`DELETE FROM user_routes WHERE user_id = ${user.userId} AND route = ${route}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }
}
