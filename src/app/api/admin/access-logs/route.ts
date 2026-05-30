import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { withAccess } from '@/core/permissions/http/withAccess';

type AccessLogRow = {
  id: string;
  created_at: Date;
  action_code: string;
  access_result: string;
  resource_type: string;
  user_email: string | null;
  module_code: string | null;
  submodule_code: string | null;
  metadata: Prisma.JsonValue;
};

export const GET = withAccess(
  { module: 'catalog', permission: 'R', submoduleCode: 'access_logs', resourceType: 'security_logs_access' },
  async (request, _context, access) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 200);

      const [coreModule, recentLogs] = await Promise.all([
        prisma.security_module.findFirst({
          where: { company_id: access.company.id, code: 'core' },
          select: {
            id: true,
            security_submodule: {
              where: { code: 'access_logs' },
              select: { id: true, is_active: true, updated_at: true },
              take: 1,
            },
          },
        }),
        prisma.$queryRaw<AccessLogRow[]>(Prisma.sql`
          SELECT
            sla.id::text,
            sla.created_at,
            sla.action_code,
            sla.access_result,
            sla.resource_type,
            su.email AS user_email,
            sm.code AS module_code,
            ss.code AS submodule_code,
            sla.metadata
          FROM public.security_logs_access sla
          JOIN public.security_users su
            ON su.id = sla.user_id
          LEFT JOIN public.security_module sm
            ON sm.id = sla.module_id
          LEFT JOIN public.security_submodule ss
            ON ss.id = sla.submodule_id
          WHERE sla.user_id IN (
            SELECT id FROM public.security_users WHERE company_id = ${access.company.id}::uuid
          )
          ORDER BY sla.created_at DESC
          LIMIT ${limit}
        `),
      ]);

      const switchRow = coreModule?.security_submodule[0] ?? null;

      return NextResponse.json({
        logging: {
          enabled: Boolean(switchRow?.is_active),
          moduleId: coreModule?.id ?? null,
          submoduleId: switchRow?.id ?? null,
          updatedAt: switchRow?.updated_at ?? null,
        },
        logs: recentLogs.map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          actionCode: row.action_code,
          accessResult: row.access_result,
          resourceType: row.resource_type,
          userEmail: row.user_email,
          moduleCode: row.module_code,
          submoduleCode: row.submodule_code,
          metadata: row.metadata,
        })),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);

export const PATCH = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'access_logs', resourceType: 'security_logs_access' },
  async (request, _context, access) => {
    try {
      const { enabled } = await request.json();
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled debe ser boolean' }, { status: 400 });
      }

      const coreModule = await prisma.security_module.findFirst({
        where: { company_id: access.company.id, code: 'core' },
        select: { id: true },
      });

      if (!coreModule) {
        return NextResponse.json({ error: 'El módulo core no está habilitado para la empresa activa.' }, { status: 404 });
      }

      const existing = await prisma.security_submodule.findFirst({
        where: { module_id: coreModule.id, code: 'access_logs' },
        select: { id: true },
      });

      if (existing) {
        await prisma.security_submodule.update({
          where: { id: existing.id },
          data: { is_active: enabled, updated_at: new Date() },
        });
      } else {
        await prisma.security_submodule.create({
          data: {
            module_id: coreModule.id,
            code: 'access_logs',
            name: 'Access Logs',
            description: 'Switch global para auditoría crítica de accesos.',
            is_active: enabled,
          },
        });
      }

      return NextResponse.json({ ok: true, enabled });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
    }
  },
);
