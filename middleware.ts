import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/landing', '/login', '/signup', '/deals', '/api/deals'];
const PUBLIC_PREFIXES = ['/api/auth', '/_next', '/favicon'];
const ALLOWED_SERVICE_PATHS = [
  '/api/check-prices', '/api/status', '/api/prices-by-date', '/api/seed',
  '/api/best-deals', '/api/routes', '/api/live-feed', '/api/alerts/history', '/api/debug-test',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (ALLOWED_SERVICE_PATHS.includes(pathname)) return NextResponse.next();
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.redirect(new URL('/landing', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
