import { NextResponse } from 'next/server';
import { verifyToken } from '../../convex/auth';
import { ConvexHttpClient } from 'convex/browser';
import { cookies } from 'next/headers';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'no token' });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'verifyToken failed', token: token.substring(0, 50) });

    const client = new ConvexHttpClient(CONVEX_URL);
    const user = await (client.query as any)('users:getUserById', { userId: payload.userId });
    
    return NextResponse.json({ 
      payload,
      user,
      userId: payload.userId,
      convexUrl: CONVEX_URL.substring(0, 40)
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.split('\n').slice(0,3) }, { status: 500 });
  }
}
