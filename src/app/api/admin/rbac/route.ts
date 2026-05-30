import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { withAccess } from '@/core/permissions/http/withAccess';

export const GET = withAccess(
  { module: 'catalog', permission: 'R', submoduleCode: 'security_roles', resourceType: 'role' },
  async (request, _context, access) => {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    try {
      if (roleId) {
        const role = await prisma.security_roles.findFirst({
          where: {
            id: roleId,
            company_id: access.company.id,
          },
          include: {
            map_user_x_roles: {
              where: { is_active: true },
              include: {
                security_users: {
                  select: { id: true, name: true, last_name: true, email: true },
                },
              },
              orderBy: { security_users: { name: 'asc' } },
            },
          },
        });

        if (!role) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const users = role.map_user_x_roles.map((row) => ({
          assignment_id: row.id,
          user_id: row.user_id,
          is_active: row.is_active,
          name: row.security_users.name,
          last_name: row.security_users.last_name,
          email: row.security_users.email,
        }));

        return NextResponse.json({ ...role, users });
      }

      const roles = await prisma.security_roles.findMany({
        where: {
          company_id: access.company.id,
          ...(includeInactive ? {} : { is_active: true }),
        },
        include: { _count: { select: { map_user_x_roles: true } } },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json(roles.map((role) => ({
        ...role,
        userCount: role._count.map_user_x_roles,
      })));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);

export const POST = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'security_roles', resourceType: 'role' },
  async (request, _context, access) => {
    try {
      const { code, name, description, isActive } = await request.json();
      if (!code?.trim() || !name?.trim()) {
        return NextResponse.json({ error: 'code y name son obligatorios' }, { status: 400 });
      }

      const newRole = await prisma.security_roles.create({
        data: {
          company_id: access.company.id,
          code: code.trim().toLowerCase().replace(/\s+/g, '_'),
          name: name.trim(),
          description: description?.trim() || null,
          is_active: isActive !== false,
        },
      });

      return NextResponse.json({ id: newRole.id }, { status: 201 });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if ((error as { code?: string }).code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe un rol con ese código' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Error al crear rol', details: msg }, { status: 500 });
    }
  },
);

export const PUT = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'security_roles', resourceType: 'role' },
  async (request, _context, access) => {
    try {
      const { id, code, name, description, isActive } = await request.json();
      if (!id) {
        return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });
      }

      const role = await prisma.security_roles.findFirst({
        where: { id, company_id: access.company.id },
        select: { id: true },
      });

      if (!role) {
        return NextResponse.json({ error: 'Rol no encontrado en la empresa activa.' }, { status: 404 });
      }

      const data: Record<string, unknown> = { updated_at: new Date() };
      if (code !== undefined) data.code = code.trim().toLowerCase().replace(/\s+/g, '_');
      if (name !== undefined) data.name = name.trim();
      if (description !== undefined) data.description = description?.trim() || null;
      if (isActive !== undefined) data.is_active = isActive;

      await prisma.security_roles.update({ where: { id }, data });
      return NextResponse.json({ ok: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);

export const DELETE = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'security_roles', resourceType: 'role' },
  async (request, _context, access) => {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');
    const assignmentId = searchParams.get('assignment_id');

    try {
      if (assignmentId) {
        const assignment = await prisma.map_user_x_roles.findFirst({
          where: {
            id: assignmentId,
            security_roles: { company_id: access.company.id },
          },
          select: { id: true },
        });

        if (!assignment) {
          return NextResponse.json({ error: 'Asignación no encontrada.' }, { status: 404 });
        }

        await prisma.map_user_x_roles.delete({ where: { id: assignmentId } });
        return NextResponse.json({ ok: true });
      }

      if (roleId) {
        const role = await prisma.security_roles.findFirst({
          where: { id: roleId, company_id: access.company.id },
          select: { id: true },
        });

        if (!role) {
          return NextResponse.json({ error: 'Rol no encontrado.' }, { status: 404 });
        }

        await prisma.security_roles.update({
          where: { id: roleId },
          data: { is_active: false, updated_at: new Date() },
        });
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ error: 'Falta id o assignment_id' }, { status: 400 });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);
