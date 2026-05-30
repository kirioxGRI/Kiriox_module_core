import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { withAccess } from '@/core/permissions/http/withAccess';

type AssignmentKey = `${string}:${string}`;

type SystemRow = { id: string; code: string; name: string };
type ModuleRow = { id: string; system_id: string };
type AssignmentRow = {
  role_id: string;
  module_id: string;
  system_id: string;
  permission_code: string;
};

export const GET = withAccess(
  { module: 'catalog', permission: 'R', submoduleCode: 'role_module_permissions', resourceType: 'role_module_permission' },
  async (_request, _context, access) => {
    try {
      const companyId = access.company.id;

      const [roles, systems, permissions, rawAssignments] = await Promise.all([
        prisma.security_roles.findMany({
          where: { company_id: companyId, is_active: true },
          orderBy: { name: 'asc' },
          select: { id: true, code: true, name: true, description: true },
        }),

        // Systems that have at least one active module
        prisma.$queryRaw<SystemRow[]>(Prisma.sql`
          SELECT DISTINCT ss.id::text, ss.code, ss.name
          FROM public.security_system ss
          INNER JOIN public.security_module sm ON sm.system_id = ss.id AND sm.is_active = true
          WHERE ss.company_id = ${companyId}::uuid
            AND ss.is_active = true
          ORDER BY ss.name ASC
        `),

        prisma.security_permissions.findMany({
          where: { is_active: true },
          orderBy: { code: 'asc' },
          select: { id: true, code: true, name: true, description: true },
        }),

        // Assignments joined to system via module
        prisma.$queryRaw<AssignmentRow[]>(Prisma.sql`
          SELECT DISTINCT
            mrmp.role_id::text,
            mrmp.module_id::text,
            sm.system_id::text,
            sp.code AS permission_code
          FROM public.map_role_x_module_x_permissions mrmp
          JOIN public.security_module sm ON sm.id = mrmp.module_id AND sm.is_active = true
          JOIN public.security_permissions sp ON sp.id = mrmp.permission_id AND sp.is_active = true
          JOIN public.security_roles sr ON sr.id = mrmp.role_id AND sr.company_id = ${companyId}::uuid
          WHERE sm.company_id = ${companyId}::uuid
            AND sm.system_id IS NOT NULL
            AND COALESCE(mrmp.is_active, true) = true
        `),
      ]);

      // Build system-level assignment map:
      // A system has a permission if ALL its modules have that permission for the role.
      type SystemPermSet = Record<string, Set<string>>; // permCode → set of moduleIds that have it
      const systemModuleCount: Record<string, number> = {};
      const roleSystemPermModules: Record<string, SystemPermSet> = {};

      // Count modules per system (from rawAssignments perspective — use the ones present in assignments)
      // We need total module count per system from DB
      const modulesPerSystem = await prisma.$queryRaw<{ system_id: string; cnt: bigint }[]>(Prisma.sql`
        SELECT system_id::text, COUNT(*)::bigint AS cnt
        FROM public.security_module
        WHERE company_id = ${companyId}::uuid AND is_active = true AND system_id IS NOT NULL
        GROUP BY system_id
      `);

      for (const row of modulesPerSystem) {
        systemModuleCount[row.system_id] = Number(row.cnt);
      }

      for (const row of rawAssignments) {
        if (!row.system_id) continue;
        const rsk = `${row.role_id}:${row.system_id}` as AssignmentKey;
        if (!roleSystemPermModules[rsk]) roleSystemPermModules[rsk] = {};
        if (!roleSystemPermModules[rsk][row.permission_code]) {
          roleSystemPermModules[rsk][row.permission_code] = new Set();
        }
        roleSystemPermModules[rsk][row.permission_code].add(row.module_id);
      }

      // A system permission is "enabled" if ALL modules in the system have it for the role
      const assignments: Record<AssignmentKey, string[]> = {};
      for (const [rsk, permMap] of Object.entries(roleSystemPermModules)) {
        const [roleId, systemId] = rsk.split(':');
        const total = systemModuleCount[systemId] ?? 1;
        const key = `${roleId}:${systemId}` as AssignmentKey;
        const activeCodes: string[] = [];
        for (const [permCode, moduleSet] of Object.entries(permMap)) {
          if (moduleSet.size >= total) activeCodes.push(permCode);
        }
        if (activeCodes.length > 0) assignments[key] = activeCodes.sort();
      }

      return NextResponse.json({ roles, systems, permissions, assignments });
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

      const [role, permission, modules] = await Promise.all([
        prisma.security_roles.findFirst({
          where: { id: roleId, company_id: companyId, is_active: true },
          select: { id: true },
        }),
        prisma.security_permissions.findFirst({
          where: { code: permissionCode, is_active: true },
          select: { id: true },
        }),
        prisma.security_module.findMany({
          where: { system_id: systemId, company_id: companyId, is_active: true },
          select: { id: true },
        }),
      ]);

      if (!role) return NextResponse.json({ error: 'Rol no encontrado.' }, { status: 404 });
      if (!permission) return NextResponse.json({ error: 'Permiso no encontrado.' }, { status: 404 });
      if (modules.length === 0) return NextResponse.json({ error: 'Sistema sin módulos activos.' }, { status: 404 });

      // Toggle permission on ALL modules under the system
      await Promise.all(
        modules.map((mod) =>
          prisma.map_role_x_module_x_permissions.upsert({
            where: {
              role_id_module_id_permission_id: {
                role_id: roleId,
                module_id: mod.id,
                permission_id: permission.id,
              },
            },
            create: {
              role_id: roleId,
              module_id: mod.id,
              permission_id: permission.id,
              is_active: enabled !== false,
            },
            update: {
              is_active: enabled !== false,
              updated_at: new Date(),
            },
          }),
        ),
      );

      return NextResponse.json({ ok: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Error al actualizar permiso', details: msg }, { status: 500 });
    }
  },
);
