// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAllRoutes, getUserRoutes } from '@/lib/db-pg';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: { userId: number; email: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const [allRoutes, userRoutes] = await Promise.all([
      getAllRoutes(),
      getUserRoutes(payload.userId),
    ]);

    const userRouteSet = new Set((userRoutes || []).map((r) => r.route));
    const routeMap = new Map();
    for (const r of allRoutes) routeMap.set(r.route, { ...r, is_custom: userRouteSet.has(r.route) });
    for (const r of userRoutes || []) routeMap.set(r.route, { ...r, is_custom: true });
    const routesWithFlag = Array.from(routeMap.values());

    return NextResponse.json({ routes: routesWithFlag });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
