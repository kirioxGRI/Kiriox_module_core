import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';
import { requireCsrf } from '@/core/auth/csrf';

function isAdmin(roleCode: string) {
  const code = (roleCode || '').trim().toLowerCase();
  return code === 'admin' || code === 'super_admin';
}

function normalizeRoleCode(code: string): string {
  const value = String(code || '').trim();
  if (!value) return '';
  if (value.toUpperCase() === 'ADMIN' || value.toLowerCase() === 'super_admin') return 'super_admin';
  return value.toLowerCase();
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const user = await prisma.security_users.findUnique({
      where: { id },
      include: {
        map_users_x_roles: {
          where: { is_active: true },
          include: { security_roles: { select: { code: true, name: true } } }
        }
      }
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const roles = user.map_users_x_roles.map(r => ({ roleCode: r.security_roles.code, roleName: r.security_roles.name }));
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
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await requireCsrf(request))) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

  try {
    const body = await request.json();
    const { email, name, lastName, whatsapp, roleCodes, isActive, tenantId } = body;

    const existingUser = await prisma.security_users.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.security_users.findUnique({ where: { email }, select: { id: true } });
      if (emailExists) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { updated_at: new Date() };
      if (tenantId !== undefined) data.company_id        = tenantId;
      if (email    !== undefined) data.email             = email;
      if (name     !== undefined) data.name              = name;
      if (lastName !== undefined) data.last_name         = lastName;
      if (whatsapp !== undefined) data.whatsapp          = whatsapp;
      if (isActive !== undefined) {
        data.is_active         = isActive;
        data.activation_status = isActive ? 'active' : 'inactive';
      }
      await tx.security_users.update({ where: { id }, data });

      if (Array.isArray(roleCodes)) {
        const canonicalRoleCodes = Array.from(new Set(
          roleCodes.map((code: string) => normalizeRoleCode(code)).filter((c: string) => Boolean(c))
        ));
        const roleRows = await tx.security_roles.findMany({
          where: { code: { in: canonicalRoleCodes, mode: 'insensitive' }, is_active: true },
          select: { id: true }
        });
        await tx.map_users_x_roles.deleteMany({ where: { user_id: id } });
        if (roleRows.length > 0) {
          await tx.map_users_x_roles.createMany({
            data: roleRows.map(role => ({ user_id: id, role_id: role.id, is_active: true }))
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
