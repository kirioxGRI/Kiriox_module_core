import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';
import { Prisma } from '@/generated/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const effectiveCompanyId = await resolveEffectiveCompanyId(auth.tenantId);
    const companies = await prisma.$queryRaw<Array<{ id: string; name: string; code: string | null }>>(Prisma.sql`
      SELECT id::text, name, code
      FROM public.company
      WHERE upper(coalesce(status::text, '')) IN ('ACTIVE', 'TRUE', '1', 'YES')
         OR id = ${effectiveCompanyId}::uuid
      ORDER BY name ASC
    `);

    return NextResponse.json({
      items: companies.map((company) => ({
        id: company.id,
        name: company.name,
        code: company.code ?? '',
      })),
    });
  } catch (error: unknown) {
    console.error('Error fetching governance companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
