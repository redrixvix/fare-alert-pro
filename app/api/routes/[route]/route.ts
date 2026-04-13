// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClient } from '@/lib/db-prod';

export async function DELETE(_request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route } = await params;
  const decoded = decodeURIComponent(route);

  try {
    const client = getClient();
    await client.mutation('routes:deleteRoute', { userId: user.userId, route: decoded });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }
}