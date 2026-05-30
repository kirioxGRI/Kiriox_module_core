import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { withAccess } from '@/core/permissions/http/withAccess';

export const POST = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'user_role_assignment', resourceType: 'user_role_assignment' },
  async (request, _context, access) => {
    try {
      const { userId, roleId } = await request.json();
      if (!userId || !roleId) {
        return NextResponse.json({ error: 'userId y roleId son obligatorios' }, { status: 400 });
      }

      const [user, role] = await Promise.all([
        prisma.security_users.findFirst({
          where: { id: userId, company_id: access.company.id },
          select: { id: true },
        }),
        prisma.security_roles.findFirst({
          where: { id: roleId, company_id: access.company.id, is_active: true },
          select: { id: true },
        }),
      ]);

      if (!user) {
        return NextResponse.json({ error: 'El usuario no pertenece a la empresa activa.' }, { status: 404 });
      }

      if (!role) {
        return NextResponse.json({ error: 'El rol no pertenece a la empresa activa.' }, { status: 404 });
      }

      const existing = await prisma.map_user_x_roles.findFirst({
        where: { user_id: userId, role_id: roleId },
        select: { id: true },
      });

      if (existing) {
        await prisma.map_user_x_roles.update({
          where: { id: existing.id },
          data: { is_active: true, updated_at: new Date() },
        });
      } else {
        await prisma.map_user_x_roles.create({
          data: { user_id: userId, role_id: roleId, is_active: true },
        });
      }

      return NextResponse.json({ ok: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);
