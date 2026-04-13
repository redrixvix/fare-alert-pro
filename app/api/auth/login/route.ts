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
      result = await client.mutation('users:signIn' as any, { email, password });
    } catch (e: any) {
      if (e.message?.includes('Invalid email or password')) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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
    console.error('Login error:', e.message);
    return NextResponse.json({ error: e.message || 'Login failed' }, { status: 500 });
  }
}
