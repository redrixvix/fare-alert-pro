// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { setUserTelegram } from '@/lib/db-pg';

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await setUserTelegram(user.userId, '', '');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
