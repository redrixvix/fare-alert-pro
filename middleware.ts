import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/', '/landing', '/login', '/signup'];
const PUBLIC_PREFIXES = ['/api/auth', '/_next', '/favicon'];

// Cron/service-to-service APIs — no auth required
const ALLOWED_SERVICE_PATHS = [
  '/api/check-prices', '/api/status', '/api/prices-by-date',
  '/api/best-deals', '/api/routes', '/api/debug-auth',
  '/api/live-feed',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  // Allow service APIs (these are called by cron/scripts, not browsers)
  if (ALLOWED_SERVICE_PATHS.includes(pathname)) return NextResponse.next();

  // Check auth token for all other routes
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/landing', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
