import { NextRequest, NextResponse } from 'next/server';

const JWT_COOKIE = 'cre_auth';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/_next',
  '/favicon',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.DEV_AUTH_BYPASS === '1') {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(JWT_COOKIE)?.value;
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
