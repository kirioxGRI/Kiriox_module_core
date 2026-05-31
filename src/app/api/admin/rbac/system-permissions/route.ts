import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { hasSystemPermission } from '@/core/permissions/domain';
import { withSystemAccess } from '@/core/permissions/http';

type AssignmentKey = `${string}:${string}`;

export const GET = withSystemAccess(
  { system: 'security', permission: 'A', submoduleCode: 'role_system_permissions', resourceType: 'role_system_permission' },
  async (_request, _context, access) => {
    try {
      const companyId = access.company.id;

      const [roles, items, permissions, rawAssignments] = await Promise.all([
        prisma.security_roles.findMany({
          where: { company_id: companyId, is_active: true },
          orderBy: { name: 'asc' },
          select: { id: true, code: true, name: true, description: true },
        }),
        prisma.security_system.findMany({
          where: { company_id: companyId, is_active: true },
          orderBy: [{ name: 'asc' }, { code: 'asc' }],
          select: { id: true, code: true, name: true, description: true },
        }),
        prisma.security_permissions.findMany({
          where: { is_active: true },
          orderBy: { code: 'asc' },
          select: { id: true, code: true, name: true, description: true },
        }),
        prisma.map_role_x_system_x_permissions.findMany({
          where: {
            is_active: true,
            security_roles: { company_id: companyId, is_active: true },
            security_system: { company_id: companyId, is_active: true },
            security_permissions: { is_active: true },
          },
          select: {
            role_id: true,
            system_id: true,
            security_permissions: { select: { code: true } },
          },
        }),
      ]);

      const assignments: Record<AssignmentKey, string[]> = {};
      for (const row of rawAssignments) {
        const key = `${row.role_id}:${row.system_id}` as AssignmentKey;
        const current = assignments[key] ?? [];
        current.push(row.security_permissions.code);
        assignments[key] = current.sort();
      }

      const canWrite = access.accessContext
        ? hasSystemPermission(access.accessContext.systemAccess, 'security', 'W')
        : true;

      return NextResponse.json({ roles, items, permissions, assignments, canWrite });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);

export const POST = withSystemAccess(
  { system: 'security', permission: 'W', submoduleCode: 'role_system_permissions', resourceType: 'role_system_permission' },
  async (request, _context, access) => {
    try {
      const companyId = access.company.id;
      const { roleId, systemId, permissionCode, enabled } = await request.json() as {
        roleId?: string;
        systemId?: string;
        permissionCode?: string;
        enabled?: boolean;
      };

      if (!roleId || !systemId || !permissionCode) {
        return NextResponse.json({ error: 'roleId, systemId y permissionCode son obligatorios' }, { status: 400 });
      }

      const [role, permission, system] = await Promise.all([
        prisma.security_roles.findFirst({
          where: { id: roleId, company_id: companyId, is_active: true },
          select: { id: true },
        }),
        prisma.security_permissions.findFirst({
          where: { code: permissionCode, is_active: true },
          select: { id: true },
        }),
        prisma.security_system.findFirst({
          where: { id: systemId, company_id: companyId, is_active: true },
          select: { id: true },
        }),
      ]);

      if (!role) return NextResponse.json({ error: 'Rol no encontrado.' }, { status: 404 });
      if (!permission) return NextResponse.json({ error: 'Permiso no encontrado.' }, { status: 404 });
      if (!system) return NextResponse.json({ error: 'Sistema no encontrado.' }, { status: 404 });

      await prisma.map_role_x_system_x_permissions.upsert({
        where: {
          role_id_system_id_permission_id: {
            role_id: roleId,
            system_id: systemId,
            permission_id: permission.id,
          },
        },
        create: {
          role_id: roleId,
          system_id: systemId,
          permission_id: permission.id,
          is_active: enabled !== false,
        },
        update: {
          is_active: enabled !== false,
          updated_at: new Date(),
        },
      });

      return NextResponse.json({ ok: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Error al actualizar permiso', details: msg }, { status: 500 });
    }
  },
);
