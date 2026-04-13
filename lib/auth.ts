import { ConvexHttpClient } from 'convex/browser';
import { cookies } from 'next/headers';
import { verifyToken } from '../convex/auth';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export interface AuthUser {
  userId: number;
  email: string;
  plan: string;
  telegram_chat_id: string | null;
}

async function convexQuery(queryPath: string, args: Record<string, any>) {
  const client = new ConvexHttpClient(CONVEX_URL);
  return (client.query as any)(queryPath, args);
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    // Query Convex to get user data
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
