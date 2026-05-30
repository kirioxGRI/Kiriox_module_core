import { NextResponse } from 'next/server';
import { verifyPassword } from '@/core/auth/password';
import { signAuthToken, getAuthCookieName, getCsrfCookieName } from '@/core/auth/auth-server';
import { createCsrfToken } from '@/core/auth/csrf';
import { PrismaAuthRepository } from '@/core/auth/infrastructure/PrismaAuthRepository';

const DEFAULT_COMPANY_ID    = '05cb4cc6-c215-4d41-84b3-98c6013cda27';
const DEFAULT_ADMIN_EMAIL   = 'admin@intervalafi.com';
const DEFAULT_ADMIN_USERNAME = 'admin';
const AUTH_COOKIE_MAX_AGE   = 60 * 60 * 24 * 365 * 10;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; username?: string; password?: string; company_id?: string };
    const { email, username, password, company_id } = body;
    const identifier        = String(email ?? username ?? '').trim().toLowerCase();
    const selectedCompanyId = String(company_id ?? '').trim();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    const repo = new PrismaAuthRepository();
    const user = await repo.findUserByIdentifier(identifier);

    if (!user?.is_active) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isValid = await verifyPassword(String(password), user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    await repo.updateLastLoginAt(user.id);

    const isDefaultAdmin =
      user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL &&
      user.username?.toLowerCase() === DEFAULT_ADMIN_USERNAME;

    const tenantId =
      selectedCompanyId ||
      user.company_id ||
      (isDefaultAdmin ? DEFAULT_COMPANY_ID : DEFAULT_COMPANY_ID);

    const token = await signAuthToken({
      userId: user.id,
      tenantId,
      email: user.email ?? undefined,
    });
    const csrfToken = createCsrfToken();

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username },
      message: 'Inicio de sesión exitoso',
    });

    const cookieOpts = {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE,
    };

    response.cookies.set(getAuthCookieName(), token, cookieOpts);
    response.cookies.set(getCsrfCookieName(), csrfToken, { ...cookieOpts, httpOnly: false });

    return response;
  } catch (err: unknown) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : (err instanceof Error ? err.message : 'Error interno del servidor');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
