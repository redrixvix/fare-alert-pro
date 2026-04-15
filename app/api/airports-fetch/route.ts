import { ConvexHttpClient } from 'convex/browser';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ airports: [] });

    let payload: { userId: number; email: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    } catch {
      return NextResponse.json({ airports: [] });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return NextResponse.json({ airports: [] });

    const client = new ConvexHttpClient(convexUrl);
    const airports = await client.query('airports:getUserAirports' as any, { userId: payload.userId });
    return NextResponse.json({ airports });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error', airports: [] }, { status: 500 });
  }
}