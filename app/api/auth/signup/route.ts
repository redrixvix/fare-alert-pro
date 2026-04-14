// @ts-nocheck
import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl!);
    let result;
    try {
      result = await (client.mutation as any)('users:signUp', { email, password });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      user: { id: result.userId, email: result.email, plan: result.plan },
    });

    response.cookies.set('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (e: any) {
    console.error('Signup error:', e.message);
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 });
  }
}