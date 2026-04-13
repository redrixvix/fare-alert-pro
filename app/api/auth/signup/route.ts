import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl!);

    let result;
    try {
      result = await client.mutation('users:signUp' as any, { email, password });
    } catch (e: any) {
      if (e.message?.includes('already registered')) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }
      throw e;
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
