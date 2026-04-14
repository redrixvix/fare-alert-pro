import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;

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

    let payload: { userId: number; email: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    } catch {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      plan: 'free',
      telegram_chat_id: null,
    };
  } catch {
    return null;
  }
}

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) throw new Error('Unauthorized');
  return user;
}