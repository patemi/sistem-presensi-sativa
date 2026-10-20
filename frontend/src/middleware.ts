import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  // Route definitions
  const isEmployeeRoute = pathname.startsWith('/checkin') || pathname.startsWith('/history');
  const isHrRoute = pathname.startsWith('/dashboard');
  const isOwnerRoute = pathname.startsWith('/owner-dashboard');
  
  const isProtectedRoute = isEmployeeRoute || isHrRoute || isOwnerRoute;
  const isAuthRoute = pathname === '/login' || pathname === '/register';

  // 1. Mandatory login check: If user visits any protected route without token, redirect to /login immediately
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If authenticated user tries to access /login or /register, redirect to their role dashboard
  if (isAuthRoute && token && userRole) {
    if (userRole === 'karyawan') {
      return NextResponse.redirect(new URL('/checkin', request.url));
    } else if (userRole === 'hr') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else if (userRole === 'owner') {
      return NextResponse.redirect(new URL('/owner-dashboard', request.url));
    }
  }

  // 3. Strict Role-based access control (RBAC) at server middleware level
  if (token && userRole) {
    if (isHrRoute && userRole !== 'hr') {
      const target = userRole === 'karyawan' ? '/checkin' : '/owner-dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (isOwnerRoute && userRole !== 'owner') {
      const target = userRole === 'karyawan' ? '/checkin' : '/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (isEmployeeRoute && userRole === 'owner') {
      return NextResponse.redirect(new URL('/owner-dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/checkin/:path*',
    '/history/:path*',
    '/dashboard/:path*',
    '/owner-dashboard/:path*',
    '/login',
    '/register',
  ],
};
