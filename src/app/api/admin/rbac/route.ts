import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';

function isAdmin(roleCode: string) {
  const code = (roleCode || '').trim().toLowerCase();
  return code === 'admin' || code === 'super_admin';
}

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('id');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  try {
    if (roleId) {
      const role = await prisma.security_roles.findUnique({
        where: { id: roleId },
        include: {
          map_users_x_roles: {
            include: {
              security_users: { select: { id: true, name: true, last_name: true, email: true } }
            },
            orderBy: { security_users: { name: 'asc' } }
          }
        }
      });
      if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const users = role.map_users_x_roles.map(r => ({
        assignment_id: r.id,
        user_id:       r.user_id,
        is_active:     r.is_active,
        name:          r.security_users.name,
        last_name:     r.security_users.last_name,
        email:         r.security_users.email,
      }));
      return NextResponse.json({ ...role, users });
    }

    const where: { is_active?: boolean } = {};
    if (!includeInactive) where.is_active = true;

    const roles = await prisma.security_roles.findMany({
      where,
      include: { _count: { select: { map_users_x_roles: true } } },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(roles.map(r => ({ ...r, userCount: r._count.map_users_x_roles })));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { code, name, description, isActive } = await request.json();
    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'code y name son obligatorios' }, { status: 400 });
    }
    const newRole = await prisma.security_roles.create({
      data: {
        code:        code.trim().toLowerCase().replace(/\s+/g, '_'),
        name:        name.trim(),
        description: description?.trim() || null,
        is_active:   isActive !== false,
      }
    });
    return NextResponse.json({ id: newRole.id }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un rol con ese código' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear rol', details: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id, code, name, description, isActive } = await request.json();
    if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });

    const data: Record<string, unknown> = { updated_at: new Date() };
    if (code        !== undefined) data.code        = code.trim().toLowerCase().replace(/\s+/g, '_');
    if (name        !== undefined) data.name        = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (isActive    !== undefined) data.is_active   = isActive;

    await prisma.security_roles.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const roleId       = searchParams.get('id');
  const assignmentId = searchParams.get('assignment_id');

  try {
    if (assignmentId) {
      await prisma.map_users_x_roles.delete({ where: { id: assignmentId } });
      return NextResponse.json({ ok: true });
    }
    if (roleId) {
      await prisma.security_roles.update({ where: { id: roleId }, data: { is_active: false, updated_at: new Date() } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Falta id o assignment_id' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}
