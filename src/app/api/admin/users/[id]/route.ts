import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { requireCsrf } from '@/core/auth/csrf';
import { withAccess } from '@/core/permissions/http/withAccess';

function normalizeRoleCode(code: string): string {
  const value = String(code || '').trim();
  if (!value) return '';
  if (value.toUpperCase() === 'ADMIN' || value.toLowerCase() === 'super_admin') return 'super_admin';
  return value.toLowerCase();
}

export const GET = withAccess(
  { module: 'catalog', permission: 'R', submoduleCode: 'security_users', resourceType: 'user' },
  async (_request, context, access) => {
    const params = await (context?.params as Promise<{ id: string }>);
    const { id } = params;

    try {
      const user = await prisma.security_users.findFirst({
        where: { id, company_id: access.company.id },
      include: {
        map_user_x_roles: {
          where: { is_active: true },
          include: { security_roles: { select: { code: true, name: true } } }
        }
      }
      });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const roles = user.map_user_x_roles.map(r => ({ roleCode: r.security_roles.code, roleName: r.security_roles.name }));
      return NextResponse.json({
        user: {
          id: user.id, tenantId: user.company_id, email: user.email, name: user.name,
          lastName: user.last_name, whatsapp: user.whatsapp,
          isActive: Boolean(user.is_active), activationStatus: user.activation_status ?? 'active',
          mustChangePassword: Boolean(user.must_change_password),
          createdAt: user.created_at, updatedAt: user.updated_at,
          roles, roleCode: roles[0]?.roleCode || 'OPERATOR',
        },
        scopes: [],
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);

export const PATCH = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'security_users', resourceType: 'user' },
  async (request, context, access) => {
    const params = await (context?.params as Promise<{ id: string }>);
    const { id } = params;
    if (!(await requireCsrf(request))) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

    try {
      const body = await request.json();
      const { email, name, lastName, whatsapp, roleCodes, isActive, tenantId } = body;

      const existingUser = await prisma.security_users.findFirst({
        where: { id, company_id: access.company.id },
        select: { id: true, email: true },
      });
      if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const normalizedEmail = email ? String(email).trim().toLowerCase() : undefined;
      if (normalizedEmail && normalizedEmail !== existingUser.email) {
        const emailExists = await prisma.security_users.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
        if (emailExists) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      const targetCompanyId = tenantId !== undefined ? String(tenantId).trim() : access.company.id;
      if (targetCompanyId !== access.company.id) {
        return NextResponse.json({ error: 'No puede mover usuarios a otra empresa.' }, { status: 403 });
      }

      await prisma.$transaction(async (tx) => {
        const data: Record<string, unknown> = { updated_at: new Date() };
        if (tenantId !== undefined) data.company_id = targetCompanyId;
        if (normalizedEmail !== undefined) data.email = normalizedEmail;
        if (name !== undefined) data.name = name;
        if (lastName !== undefined) data.last_name = lastName;
        if (whatsapp !== undefined) data.whatsapp = whatsapp;
        if (isActive !== undefined) {
          data.is_active = isActive;
          data.activation_status = isActive ? 'active' : 'inactive';
        }
        await tx.security_users.update({ where: { id }, data });

        if (Array.isArray(roleCodes)) {
          const canonicalRoleCodes = Array.from(new Set(
            roleCodes.map((code: string) => normalizeRoleCode(code)).filter((c: string) => Boolean(c))
          ));
          const roleRows = await tx.security_roles.findMany({
            where: {
              company_id: access.company.id,
              code: { in: canonicalRoleCodes, mode: 'insensitive' },
              is_active: true,
            },
            select: { id: true, code: true }
          });

          if (roleRows.length !== canonicalRoleCodes.length) {
            throw new Error('One or more roles are not available for the active company.');
          }

          await tx.map_user_x_roles.deleteMany({ where: { user_id: id } });
          if (roleRows.length > 0) {
            await tx.map_user_x_roles.createMany({
              data: roleRows.map(role => ({ user_id: id, role_id: role.id, is_active: true }))
            });
          }
        }
      });

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      const details = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details }, { status: 500 });
    }
  },
);
