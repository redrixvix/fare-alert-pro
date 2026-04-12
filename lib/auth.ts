import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'fare-alert-pro-secret-change-in-production';

export interface AuthUser {
  userId: number;
  email: string;
  plan: string;
  telegram_chat_id: string | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    const db = getDb();
    const user = db
      .prepare('SELECT id, email, plan, telegram_chat_id, is_active FROM users WHERE id = ?')
      .get(payload.userId) as any;
    if (!user || !user.is_active) return null;
    return {
      userId: user.id,
      email: user.email,
      plan: user.plan || 'free',
      telegram_chat_id: user.telegram_chat_id || null,
    };
  } catch {
    return null;
  }
}

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
