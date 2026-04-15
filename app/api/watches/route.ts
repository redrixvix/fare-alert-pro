// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getWatches, createWatch, deleteWatch, getAllRoutes } from '@/lib/db-pg';

const VALID_CABINS = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];

function isValidDate(dateStr) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysFromNow = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysFromNow >= 0 && daysFromNow <= 90;
}

function isValidRoute(route) {
  return /^[A-Z]{3}-[A-Z]{3}$/.test(route);
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [watches, routesData] = await Promise.all([
    getWatches(user.userId),
    getAllRoutes(),
  ]);

  const routeMap = {};
  for (const r of routesData) routeMap[r.route] = r.last_price ?? null;

  const result = (watches || []).map((watch) => {
    const currentPrice = routeMap[watch.route] ?? null;
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

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { route, cabin = 'ECONOMY', watchDate, targetPrice } = body;

  if (!route || typeof route !== 'string') return NextResponse.json({ error: 'route is required' }, { status: 400 });
  if (!isValidRoute(route)) return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
  if (!VALID_CABINS.includes(cabin)) return NextResponse.json({ error: 'cabin must be one of: ' + VALID_CABINS.join(', ') }, { status: 400 });
  if (!watchDate || typeof watchDate !== 'string') return NextResponse.json({ error: 'watchDate is required' }, { status: 400 });
  if (!isValidDate(watchDate)) return NextResponse.json({ error: 'watchDate must be within 0-90 days from today (YYYY-MM-DD)' }, { status: 400 });
  if (typeof targetPrice !== 'number' || targetPrice <= 0) return NextResponse.json({ error: 'targetPrice must be a positive number' }, { status: 400 });

  try {
    const result = await createWatch(user.userId, route, cabin, watchDate, targetPrice);

    const routesData = await getAllRoutes();
    const routeRow = routesData.find((r) => r.route === route);
    const currentPrice = routeRow?.last_price ?? null;
    const savingsPct = currentPrice !== null && currentPrice > 0
      ? ((targetPrice - currentPrice) / currentPrice) * 100
      : null;

    return NextResponse.json({
      id: result.id,
      route, cabin, watchDate, targetPrice, currentPrice,
      savingsPct: savingsPct !== null ? Math.round(savingsPct * 10) / 10 : null,
    }, { status: 201 });
  } catch (err) {
    console.error('addPriceWatch error:', err);
    return NextResponse.json({ error: 'Failed to create watch' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('id');
  if (!idParam) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const id = parseInt(idParam, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'id must be a number' }, { status: 400 });

  try {
    await deleteWatch(id, user.userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Watch not found' }, { status: 404 });
  }
}
