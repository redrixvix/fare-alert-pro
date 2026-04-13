import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ConvexHttpClient } from 'convex/browser';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'no token' });

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    } catch (e: any) {
      return NextResponse.json({ error: 'jwt verify failed', message: e.message });
    }

    const client = new ConvexHttpClient(CONVEX_URL);
    const user = await (client.query as any)('users:getUserById', { userId: payload.userId });
    
    return NextResponse.json({ 
      payload,
      user,
      userId: payload.userId
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
