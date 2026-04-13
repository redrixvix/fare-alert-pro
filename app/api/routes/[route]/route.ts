import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { deleteRoute } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ route: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { route } = await params;
  const decoded = decodeURIComponent(route);

  const ok = deleteRoute(user.userId, decoded);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'Route not found or cannot be deleted' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
