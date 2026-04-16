// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { setUserAirports } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { airports } = body;
    if (!Array.isArray(airports)) return NextResponse.json({ error: 'airports must be an array' }, { status: 400 });

    await setUserAirports(user.userId, airports);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
