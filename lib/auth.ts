import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fare-alert-pro-jwt-secret-2024-secure';

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
    if (!token) {
      console.error('[auth] No token found in cookies');
      return null;
    }

    let payload: { userId: number; email: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      console.error('[auth] Token verified, payload:', JSON.stringify(payload));
    } catch (e: any) {
      console.error('[auth] JWT verify failed:', e.message);
      return null;
    }

    // Return minimal user from JWT - the dashboard can fetch full data from Convex client-side
    return {
      userId: payload.userId,
      email: payload.email,
      plan: 'free',  // Default, will be refreshed from Convex client-side
      telegram_chat_id: null,
    };
  } catch (e: any) {
    console.error('[auth] Unexpected error in getAuthUser:', e.message, e.stack);
    return null;
  }
}

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) throw new Error('Unauthorized');
  return user;
}
