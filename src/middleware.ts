// src/middleware.ts
// Handles authentication, session cookie cleanup, and environment checks.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-token';

const SETUP_PATH = '/setup';
const LOGIN_PATH = '/login';

const PUBLIC_PATHS = [
  SETUP_PATH,
  LOGIN_PATH,
  '/api/health',
  '/api/auth/login',
  '/_next',
  '/favicon.ico',
];

function isPlaceholder(val: string | undefined): boolean {
  if (!val) return true;
  return (
    val.includes('[YOUR-SUPABASE-PROJECT-REF]') ||
    val.includes('your_anon_key_here') ||
    val.includes('[YOUR-PASSWORD]') ||
    val === ''
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all public paths without checks
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if database is configured — redirect to /setup if not
  const dbUrl = process.env.DATABASE_URL;
  if (isPlaceholder(dbUrl)) {
    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = SETUP_PATH;
    return NextResponse.redirect(setupUrl);
  }

  // Session cookie check — if no valid session cookie, clear it and redirect to login
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    // No session, redirect to login unless already there
    if (!pathname.startsWith(LOGIN_PATH)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = LOGIN_PATH;
      loginUrl.searchParams.set('next', pathname);
      const response = NextResponse.redirect(loginUrl);
      // Clear any stale/corrupted session cookies
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
