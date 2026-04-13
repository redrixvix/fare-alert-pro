import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET() {
  const JWT_SECRET = process.env.JWT_SECRET || '';
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return NextResponse.json({ error: 'no token' });
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ 
      status: 'ok', 
      userId: (payload as any).userId,
      tokenPrefix: token.substring(0, 20)
    });
  } catch (e: any) {
    return NextResponse.json({ 
      error: e.message,
      tokenPrefix: token.substring(0, 20),
      secretPrefix: JWT_SECRET.substring(0, 10)
    });
  }
}
