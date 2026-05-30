import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_COOKIE = 'cre_auth';
const CSRF_COOKIE = 'csrf_token';

export type AuthContext = {
  userId: string;
  tenantId: string;
  roleCode?: string;
  email?: string;
};

export function isDevAuthBypassEnabled(): boolean {
  return process.env.DEV_AUTH_BYPASS === '1';
}

function getDevBypassFallback(): AuthContext {
  return {
    userId: process.env.DEV_AUTH_USER_ID || '11111111-1111-1111-1111-111111111111',
    tenantId: process.env.DEV_AUTH_TENANT_ID || '22222222-2222-2222-2222-222222222222',
    roleCode: process.env.DEV_AUTH_ROLE_CODE || 'ADMIN',
    email: process.env.DEV_AUTH_EMAIL || 'dev@local',
  };
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: AuthContext): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    tenant_id: payload.tenantId,
    email: payload.email,
    ...(payload.roleCode ? { role_code: payload.roleCode } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .sign(secret);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE)?.value;

  if (!token) {
    return isDevAuthBypassEnabled() ? getDevBypassFallback() : null;
  }

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    const tenantId = payload.tenant_id;
    const roleCode = payload.role_code;
    if (!userId || !tenantId) return null;

    return {
      userId: String(userId),
      tenantId: String(tenantId),
      roleCode: roleCode ? String(roleCode) : undefined,
      email: payload.email ? String(payload.email) : undefined,
    };
  } catch {
    return isDevAuthBypassEnabled() ? getDevBypassFallback() : null;
  }
}

export function getAuthCookieName(): string {
  return JWT_COOKIE;
}

export function getCsrfCookieName(): string {
  return CSRF_COOKIE;
}
