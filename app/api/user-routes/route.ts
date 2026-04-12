import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb, getUserRoutes, addRoute, deleteRoute } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseRoute(raw: string): { route: string; origin: string; destination: string } | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  const match = cleaned.match(/^([A-Z]{3})-([A-Z]{3})$/);
  if (!match) return null;
  return { route: `${match[1]}-${match[2]}`, origin: match[1], destination: match[2] };
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const rows = db
    .prepare('SELECT r.* FROM user_routes ur JOIN routes r ON ur.route = r.route WHERE ur.user_id = ? AND ur.active = 1')
    .all(user.userId) as any[];

  return NextResponse.json({ routes: rows });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = body.route as string | undefined;
  if (!raw) return NextResponse.json({ error: 'route is required (e.g. "PIT-LAS")' }, { status: 400 });

  const parsed = parseRoute(raw);
  if (!parsed) return NextResponse.json({ error: 'Invalid route format. Use "ABC-DEF" airport codes.' }, { status: 400 });

  const db = getDb();
  const dbUser = db.prepare('SELECT plan FROM users WHERE id = ?').get(user.userId) as { plan: string } | undefined;
  if (dbUser?.plan !== 'pro') {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM user_routes WHERE user_id = ? AND active = 1').get(user.userId) as { cnt: number };
    if (count.cnt >= 5) {
      return NextResponse.json({ error: 'Free plan limited to 5 custom routes. Upgrade to Pro for unlimited.' }, { status: 403 });
    }
  }

  try {
    addRoute(parsed.route, parsed.origin, parsed.destination);
    db.prepare('UPDATE user_routes SET user_id = ? WHERE route = ?').run(user.userId, parsed.route);
    return NextResponse.json({ success: true, route: parsed.route });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const route = searchParams.get('route');
  if (!route) return NextResponse.json({ error: 'route is required' }, { status: 400 });

  const db = getDb();
  const row = db.prepare('SELECT * FROM user_routes WHERE route = ? AND user_id = ? AND active = 1').get(route, user.userId);
  if (!row) return NextResponse.json({ error: 'Route not found' }, { status: 404 });

  const ok = deleteRoute(route);
  return NextResponse.json({ success: ok });
}
