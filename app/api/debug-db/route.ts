import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, plan, is_active FROM users WHERE id = ?').get(1);
    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack });
  }
}
