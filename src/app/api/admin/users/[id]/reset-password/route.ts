import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { requireCsrf } from '@/core/auth/csrf';
import { hashPassword } from '@/core/auth/password';
import { withAccess } from '@/core/permissions/http/withAccess';

export const POST = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'security_users', resourceType: 'user_password' },
  async (request, context, access) => {
    const params = await (context?.params as Promise<{ id: string }>);
    const { id } = params;
    if (!(await requireCsrf(request))) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

    try {
      const { password } = await request.json();
      if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

      const existingUser = await prisma.security_users.findFirst({
        where: { id, company_id: access.company.id },
        select: { id: true },
      });
      if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const passwordHash = await hashPassword(password);
      await prisma.security_users.update({
        where: { id },
        data: {
          password_hash: passwordHash,
          must_change_password: true,
          password_updated_at: new Date(),
          updated_at: new Date(),
        }
      });

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      console.error('Error resetting password:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
);
