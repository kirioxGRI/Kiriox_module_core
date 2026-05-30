import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';
import { requireCsrf } from '@/core/auth/csrf';
import { hashPassword } from '@/core/auth/password';

function isAdmin(roleCode: string) {
  const code = (roleCode || '').trim().toLowerCase();
  return code === 'admin' || code === 'super_admin';
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await requireCsrf(request))) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

  try {
    const { password } = await request.json();
    if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

    const existingUser = await prisma.security_users.findUnique({ where: { id }, select: { id: true } });
    if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const passwordHash = await hashPassword(password);
    await prisma.security_users.update({
      where: { id },
      data: {
        password_hash:        passwordHash,
        must_change_password: true,
        password_updated_at:  new Date(),
        updated_at:           new Date(),
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
