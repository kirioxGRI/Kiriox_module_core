import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { withAccess } from '@/core/permissions/http/withAccess';
import { getOfficialModuleCodes } from '@/core/permissions/domain/permissionResolver';

type AssignmentKey = `${string}:${string}`;

export const GET = withAccess(
  { module: 'catalog', permission: 'R', submoduleCode: 'role_module_permissions', resourceType: 'role_module_permission' },
  async (_request, _context, access) => {
    try {
      const [roles, modules, permissions, rawAssignments] = await Promise.all([
        prisma.security_roles.findMany({
          where: { company_id: access.company.id, is_active: true },
          orderBy: { name: 'asc' },
          select: { id: true, code: true, name: true, description: true },
        }),
        prisma.security_module.findMany({
          where: {
            company_id: access.company.id,
            is_active: true,
            code: { in: getOfficialModuleCodes() },
          },
          orderBy: { name: 'asc' },
          select: { id: true, code: true, name: true, description: true },
        }),
        prisma.security_permissions.findMany({
          where: { is_active: true },
          orderBy: { code: 'asc' },
          select: { id: true, code: true, name: true, description: true },
        }),
        prisma.map_role_x_module_x_permissions.findMany({
          where: {
            is_active: true,
            security_roles: { company_id: access.company.id },
            security_module: { company_id: access.company.id },
          },
          select: {
            role_id: true,
            module_id: true,
            permission_id: true,
            security_permissions: { select: { code: true } },
          },
        }),
      ]);

      const assignments: Record<AssignmentKey, string[]> = {};
      for (const row of rawAssignments) {
        const key = `${row.role_id}:${row.module_id}` as AssignmentKey;
        if (!assignments[key]) assignments[key] = [];
        assignments[key].push(row.security_permissions.code);
      }

      return NextResponse.json({ roles, modules, permissions, assignments });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);

export const POST = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'role_module_permissions', resourceType: 'role_module_permission' },
  async (request, _context, access) => {
    try {
      const { roleId, moduleId, permissionCode, enabled } = await request.json();
      if (!roleId || !moduleId || !permissionCode) {
        return NextResponse.json({ error: 'roleId, moduleId y permissionCode son obligatorios' }, { status: 400 });
      }

      const [role, moduleRow, permission] = await Promise.all([
        prisma.security_roles.findFirst({
          where: { id: roleId, company_id: access.company.id, is_active: true },
          select: { id: true },
        }),
        prisma.security_module.findFirst({
          where: { id: moduleId, company_id: access.company.id, is_active: true },
          select: { id: true },
        }),
        prisma.security_permissions.findFirst({
          where: { code: permissionCode, is_active: true },
          select: { id: true },
        }),
      ]);

      if (!role) {
        return NextResponse.json({ error: 'Rol no encontrado.' }, { status: 404 });
      }
      if (!moduleRow) {
        return NextResponse.json({ error: 'Módulo no encontrado.' }, { status: 404 });
      }
      if (!permission) {
        return NextResponse.json({ error: 'Permiso no encontrado.' }, { status: 404 });
      }

      await prisma.map_role_x_module_x_permissions.upsert({
        where: {
          role_id_module_id_permission_id: {
            role_id: roleId,
            module_id: moduleId,
            permission_id: permission.id,
          },
        },
        create: {
          role_id: roleId,
          module_id: moduleId,
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
