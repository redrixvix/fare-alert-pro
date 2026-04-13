// @ts-nocheck
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getClient } from '@/lib/db-prod';

const JWT_SECRET = process.env.JWT_SECRET || 'fare-alert-pro-jwt-secret-2024-secure';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ step: 'no_token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    } catch (e) {
      return NextResponse.json({ step: 'invalid_token', error: e.message });
    }

    const client = getClient();
    let user;
    try {
      user = await (client.query as any)('users:getUserById', { id: payload.userId });
    } catch (e) {
      return NextResponse.json({ step: 'convex_query_failed', error: e.message, token: payload });
    }

    return NextResponse.json({ step: 'success', user, token: payload });
  } catch (e) {
    return NextResponse.json({ step: 'unknown_error', error: e.message });
  }
}