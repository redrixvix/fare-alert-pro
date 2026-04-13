import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ConvexHttpClient } = await import('convex/browser');
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return NextResponse.json({ error: 'Convex not configured' }, { status: 500 });

    const client = new ConvexHttpClient(convexUrl);
    await client.mutation('telegram:disconnectTelegram', { userId: user.userId });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}