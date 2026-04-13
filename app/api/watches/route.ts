import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

const VALID_CABINS = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];

function isValidDate(dateStr: string): boolean {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysFromNow = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysFromNow >= 0 && daysFromNow <= 90;
}

function isValidRoute(route: string): boolean {
  // Just validate format XXX-XXX (3 uppercase letters, dash, 3 uppercase letters)
  return /^[A-Z]{3}-[A-Z]{3}$/.test(route);
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = getClient();
  const [watches, routesData] = await Promise.all([
    client.query('watches:getWatches', { userId: user.userId }),
    client.query('routes:getAllRoutes', {}),
  ]) as [any[], any[]];

  const routeMap: Record<string, number> = {};
  for (const r of routesData) routeMap[r.route] = r.lastPrice ?? null;

  const result = (watches || []).map((watch: any) => {
    const currentPrice = routeMap[watch.route] ?? null;
    const savingsPct = currentPrice !== null && currentPrice > 0
      ? ((watch.targetPrice - currentPrice) / currentPrice) * 100
      : null;
    return {
      id: watch.id,
      route: watch.route,
      cabin: watch.cabin,
      watchDate: watch.watchDate,
      targetPrice: watch.targetPrice,
      currentPrice,
      savingsPct: savingsPct !== null ? Math.round(savingsPct * 10) / 10 : null,
    };
  });

  return NextResponse.json({ watches: result });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { route?: string; cabin?: string; watchDate?: string; targetPrice?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { route, cabin = 'ECONOMY', watchDate, targetPrice } = body;

  if (!route || typeof route !== 'string') {
    return NextResponse.json({ error: 'route is required' }, { status: 400 });
  }
  if (!isValidRoute(route)) {
    return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
  }
  if (!VALID_CABINS.includes(cabin)) {
    return NextResponse.json({ error: 'cabin must be one of: ' + VALID_CABINS.join(', ') }, { status: 400 });
  }
  if (!watchDate || typeof watchDate !== 'string') {
    return NextResponse.json({ error: 'watchDate is required' }, { status: 400 });
  }
  if (!isValidDate(watchDate)) {
    return NextResponse.json({ error: 'watchDate must be within 0-90 days from today (YYYY-MM-DD)' }, { status: 400 });
  }
  if (typeof targetPrice !== 'number' || targetPrice <= 0) {
    return NextResponse.json({ error: 'targetPrice must be a positive number' }, { status: 400 });
  }

  try {
    const client = getClient();
    const result = await client.mutation('watches:addWatch', {
      userId: user.userId,
      route,
      cabin,
      watchDate,
      targetPrice,
    }) as any;

    // Get current price for savings calculation
    const routesData = await client.query('routes:getAllRoutes', {}) as any[];
    const routeRow = routesData.find((r: any) => r.route === route);
    const currentPrice = routeRow?.lastPrice ?? null;
    const savingsPct = currentPrice !== null && currentPrice > 0
      ? ((targetPrice - currentPrice) / currentPrice) * 100
      : null;

    return NextResponse.json({
      id: result,
      route,
      cabin,
      watchDate,
      targetPrice,
      currentPrice,
      savingsPct: savingsPct !== null ? Math.round(savingsPct * 10) / 10 : null,
    }, { status: 201 });
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'A watch for this route, cabin, and date already exists' }, { status: 409 });
    }
    console.error('addPriceWatch error:', err);
    return NextResponse.json({ error: 'Failed to create watch' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('id');

  if (!idParam) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'id must be a number' }, { status: 400 });
  }

  try {
    const client = getClient();
    await client.mutation('watches:deleteWatch', { id, userId: user.userId });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Watch not found' }, { status: 404 });
  }
}