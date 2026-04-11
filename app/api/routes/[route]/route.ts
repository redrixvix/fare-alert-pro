import { NextResponse } from 'next/server';
import { deleteRoute } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ route: string }> }
) {
  const { route } = await params;
  const decoded = decodeURIComponent(route);

  const ok = deleteRoute(decoded);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'Route not found or cannot be deleted' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
