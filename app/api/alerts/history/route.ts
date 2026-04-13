import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAlertHistory } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = getAlertHistory(user.userId);
  return NextResponse.json(result);
}