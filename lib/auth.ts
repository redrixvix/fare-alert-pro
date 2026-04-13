import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { ConvexHttpClient } from 'convex/browser';

const JWT_SECRET = process.env.JWT_SECRET || 'fare-alert-pro-secret-change-in-production';
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

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

    // Verify JWT locally
    let payload: { userId: number; email: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    } catch {
      return null; // Invalid token
    }

    // Fetch user from Convex
    const client = new ConvexHttpClient(CONVEX_URL);
    const user = await (client.query as any)('users:getUserById', { userId: payload.userId });
    
    if (!user || !user.is_active) return null;
    return {
      userId: user.numeric_id,
      email: user.email,
      plan: user.plan || 'free',
      telegram_chat_id: user.telegram_chat_id || null,
    };
  } catch {
    return null;
  }
}

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) throw new Error('Unauthorized');
  return user;
}
