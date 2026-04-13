import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPriceWatches, addPriceWatch, deletePriceWatch, getAllRoutes } from '@/lib/db';

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
  const routes = getAllRoutes() as { route: string }[];
  return routes.some(r => r.route === route);
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const watches = getPriceWatches(user.userId);

  // Get current prices for each watch from the routes table
  const { getDb } = await import('@/lib/db');
  const db = getDb();

  const result = watches.map(watch => {
    const routeRow = db.prepare('SELECT last_price FROM routes WHERE route = ?').get(watch.route) as { last_price: number | null } | undefined;
    const currentPrice = routeRow?.last_price ?? null;
    const savingsPct = currentPrice !== null && currentPrice > 0
      ? ((watch.target_price - currentPrice) / currentPrice) * 100
      : null;
    return {
      id: watch.id,
      route: watch.route,
      cabin: watch.cabin,
      watchDate: watch.watch_date,
      targetPrice: watch.target_price,
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

  // Validate route
  if (!route || typeof route !== 'string') {
    return NextResponse.json({ error: 'route is required' }, { status: 400 });
  }
  if (!isValidRoute(route)) {
    return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
  }

  // Validate cabin
  if (!VALID_CABINS.includes(cabin)) {
    return NextResponse.json({ error: 'cabin must be one of: ' + VALID_CABINS.join(', ') }, { status: 400 });
  }

  // Validate watchDate
  if (!watchDate || typeof watchDate !== 'string') {
    return NextResponse.json({ error: 'watchDate is required' }, { status: 400 });
  }
  if (!isValidDate(watchDate)) {
    return NextResponse.json({ error: 'watchDate must be within 0-90 days from today (YYYY-MM-DD)' }, { status: 400 });
  }

  // Validate targetPrice
  if (typeof targetPrice !== 'number' || targetPrice <= 0) {
    return NextResponse.json({ error: 'targetPrice must be a positive number' }, { status: 400 });
  }

  try {
    const id = addPriceWatch(user.userId, route, cabin, watchDate, targetPrice);

    const { getDb } = await import('@/lib/db');
    const db = getDb();
    const routeRow = db.prepare('SELECT last_price FROM routes WHERE route = ?').get(route) as { last_price: number | null } | undefined;
    const currentPrice = routeRow?.last_price ?? null;
    const savingsPct = currentPrice !== null && currentPrice > 0
      ? ((targetPrice - currentPrice) / currentPrice) * 100
      : null;

    return NextResponse.json({
      id,
      route,
      cabin,
      watchDate,
      targetPrice,
      currentPrice,
      savingsPct: savingsPct !== null ? Math.round(savingsPct * 10) / 10 : null,
    }, { status: 201 });
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
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

  const deleted = deletePriceWatch(id, user.userId);
  if (!deleted) {
    return NextResponse.json({ error: 'Watch not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}