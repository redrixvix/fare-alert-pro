import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'default';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'no token' });

    let payload: any;
    let jwtError = '';
    
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e: any) {
      jwtError = e.message;
    }

    let payload2: any;
    let jwtError2 = '';
    try {
      payload2 = jwt.verify(token, 'fare-alert-pro-jwt-secret-2024-secure');
    } catch (e: any) {
      jwtError2 = e.message;
    }

    return NextResponse.json({ 
      tokenLength: token.length,
      tokenStart: token.substring(0, 20),
      jwtError,
      jwtError2,
      payload,
      payload2,
      envSecret: JWT_SECRET.length > 5 ? JWT_SECRET.substring(0,5) + '...' : `short(${JWT_SECRET.length})`,
      envSecretFull: JWT_SECRET
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
