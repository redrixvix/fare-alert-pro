import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return NextResponse.json({ 
    cookieHeader: cookieHeader.substring(0, 100),
    hasAuthToken: cookieHeader.includes('auth_token'),
  });
}
