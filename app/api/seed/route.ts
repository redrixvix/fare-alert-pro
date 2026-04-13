import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST() {
  try {
    if (!convexUrl) return NextResponse.json({ error: 'Convex not configured' }, { status: 500 });
    
    const client = new ConvexHttpClient(convexUrl);
    
    const result = await client.mutation('users/signUp' as any, {
      email: 'admin@farealertpro.com',
      password: 'FareAlert2026!'
    });
    
    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
