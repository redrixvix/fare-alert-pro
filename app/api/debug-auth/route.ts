import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ConvexHttpClient } from 'convex/browser';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'default';
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'no token' });

    let payload: any;
    let jwtError = '';
    
    // Try with env secret
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e: any) {
      jwtError = e.message;
    }

    // Also try with "fare-alert-pro-jwt-secret-2024-secure" directly
    let payload2: any;
    let jwtError2 = '';
    try {
      payload2 = jwt.verify(token, 'fare-alert-pro-jwt-secret-2024-secure');
    } catch (e: any) {
      jwtError2 = e.message;
    }

    const client = new ConvexHttpClient(CONVEX_URL);
    
    // Try to verify with convex
    let convexPayload: any;
    try {
      // Use convex auth verify
      const { verifyToken } = await import('../../convex/auth');
      convexPayload = await verifyToken(token);
    } catch(e: any) {
      convexPayload = e.message;
    }

    return NextResponse.json({ 
      tokenLength: token.length,
      jwtError,
      jwtError2,
      payload,
      payload2,
      convexPayload,
      envSecret: JWT_SECRET.length > 5 ? JWT_SECRET.substring(0,5) + '...' : 'too short'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
