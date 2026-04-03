import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('store_session');
  const pathname = request.nextUrl.pathname;

  // Allow login, register pages and API routes (no auth required)
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Protect all other routes (dashboard pages)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
