import { NextResponse } from 'next/server';
import { getAuthCookieName, getCsrfCookieName } from '@/core/auth/auth-server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  const expired = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };

  response.cookies.set(getAuthCookieName(), '', expired);
  response.cookies.set(getCsrfCookieName(), '', { ...expired, httpOnly: false });

  // Clean up NextAuth OAuth cookies
  response.cookies.set('next-auth.session-token', '', expired);
  response.cookies.set('__Secure-next-auth.session-token', '', expired);
  response.cookies.set('next-auth.callback-url', '', { ...expired, httpOnly: false });
  response.cookies.set('next-auth.csrf-token', '', expired);
  response.cookies.set('__Host-next-auth.csrf-token', '', expired);

  return response;
}
