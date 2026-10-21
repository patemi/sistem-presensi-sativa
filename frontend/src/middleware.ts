import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Helper to safely decode and parse JWT payload in Next.js Edge Runtime
 */
function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Validate JWT token format and check if it has expired
 */
function validateToken(token: string | undefined): { isValid: boolean; role?: string } {
  if (!token) return { isValid: false };
  const payload = parseJwtPayload(token);
  if (!payload) return { isValid: false };

  // Check expiration (exp is in epoch seconds)
  if (payload.exp && typeof payload.exp === 'number') {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowInSeconds) {
      return { isValid: false }; // Token has expired
    }
  }

  return { isValid: true, role: payload.role };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('token')?.value;
  const cookieRole = request.cookies.get('user_role')?.value;

  // Route definitions
  const isEmployeeRoute =
    pathname === '/checkin' ||
    pathname.startsWith('/checkin/') ||
    pathname === '/history' ||
    pathname.startsWith('/history/');

  const isHrRoute =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/');

  const isOwnerRoute =
    pathname === '/owner-dashboard' ||
    pathname.startsWith('/owner-dashboard/');

  const isProtectedRoute = isEmployeeRoute || isHrRoute || isOwnerRoute;

  // 1. Mandatory login check for ALL protected routes
  // Users MUST go through the login page first before they can access any protected page.
  if (isProtectedRoute) {
    const { isValid, role: tokenRole } = validateToken(token);

    if (!isValid) {
      // Unauthenticated or invalid/expired token: redirect to /login immediately
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(loginUrl);

      // Clean up stale or invalid cookies so they don't linger
      response.cookies.delete('token');
      response.cookies.delete('user_role');
      return response;
    }

    // 2. Strict Role-based access control (RBAC) at server middleware level
    // Prioritize the verified role signed inside the JWT payload over the raw cookie
    const activeRole = tokenRole || cookieRole;

    if (isHrRoute && activeRole !== 'hr' && activeRole !== 'owner') {
      // Non-HR trying to access HR dashboard: redirect to their own portal
      const target = activeRole === 'karyawan' ? '/checkin' : '/owner-dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (isOwnerRoute && activeRole !== 'owner') {
      // Non-Owner trying to access Owner dashboard
      const target = activeRole === 'hr' ? '/dashboard' : '/checkin';
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (isEmployeeRoute && activeRole === 'owner') {
      // Owner redirected to executive dashboard
      return NextResponse.redirect(new URL('/owner-dashboard', request.url));
    }
  }

  // NOTE: We deliberately DO NOT auto-redirect users who open /login or /register!
  // Any user (HR, karyawan, owner) who wishes to log in MUST be able to view and interact
  // with the login form directly rather than being bypassed unexpectedly.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svgs, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
