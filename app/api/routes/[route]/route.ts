// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { pg } from '@/lib/db-pg';

export const dynamic = 'force-dynamic';

export async function DELETE(_request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route } = await params;
  const decoded = decodeURIComponent(route);

  try {
    await pg`DELETE FROM user_routes WHERE user_id = ${user.userId} AND route = ${decoded}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }
}
