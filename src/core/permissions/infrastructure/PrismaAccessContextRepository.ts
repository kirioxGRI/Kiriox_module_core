import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';
import { isDevAuthBypassEnabled } from '@/core/auth/auth-server';
import { buildNavigation } from '@/core/navigation/buildNavigation';
import type { AccessContextRepository } from '../domain/contracts/AccessContextRepository';
import type { AccessContext, ModuleCode } from '@/shared/types';

const ALL_MODULES: ModuleCode[] = [
  'core', 'governance', 'security', 'benchmark',
  'linear-risk', 'structural-risk', 'audit', 'alerts', 'simulation', 'catalog',
  'company', 'incident', 'monitoring', 'hechos-relevantes', 'reportes', 'plugins',
];

function isMissingRelation(error: unknown, table: string): boolean {
  return String((error as { message?: string })?.message ?? '').includes(`relation "${table}" does not exist`);
}

export class PrismaAccessContextRepository implements AccessContextRepository {
  async getAccessContext(input: { userId: string; companyId: string; fallbackEmail?: string }): Promise<AccessContext> {
    const companyId = await resolveEffectiveCompanyId(input.companyId);
    const [user, company, enabledModules, permissions] = await Promise.all([
      this.loadUser(input.userId, input.fallbackEmail),
      this.loadCompany(companyId),
      this.getEnabledModules(companyId),
      this.getPermissions(input.userId, companyId),
    ]);

    const navigation = buildNavigation({ enabledModules, permissions });

    return { user, company, enabledModules, permissions, navigation };
  }

  async getEnabledModules(companyId: string): Promise<ModuleCode[]> {
    void companyId;
    return ALL_MODULES;
  }

  async getPermissions(userId: string, companyId: string): Promise<string[]> {
    void userId; void companyId;
    if (isDevAuthBypassEnabled()) return ['*'];
    return ['*'];
  }

  private async loadUser(userId: string, fallbackEmail?: string) {
    type Row = { id: string; username: string | null; email: string | null };
    let rows: Row[] = [];
    try {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT u.id, u.username, u.email
        FROM public.users u
        WHERE u.id = ${userId}::uuid
        LIMIT 1
      `);
    } catch (err) {
      if (!isMissingRelation(err, 'public.users')) throw err;
    }
    const row = rows[0];
    return { id: userId, name: row?.username ?? 'Usuario', email: row?.email ?? fallbackEmail ?? '' };
  }

  private async loadCompany(companyId: string) {
    type Row = { id: string; code: string | null; name: string | null };
    let rows: Row[] = [];
    try {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT c.id, c.code, c.name
        FROM public.company c
        WHERE c.id = ${companyId}::uuid
        LIMIT 1
      `);
    } catch (err) {
      if (!isMissingRelation(err, 'public.company')) throw err;
    }
    const row = rows[0];
    return { id: companyId, code: row?.code ?? '', name: row?.name ?? 'Empresa' };
  }
}
