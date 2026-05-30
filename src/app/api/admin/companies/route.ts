import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { withAccess } from '@/core/permissions/http/withAccess';

export const GET = withAccess(
  { module: 'catalog', permission: 'R', submoduleCode: 'security_companies', resourceType: 'company' },
  async (_request, _context, access) => {
    try {
      const companies = await prisma.company.findMany({
        where: { id: access.company.id },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json(companies.map((company) => ({
        id: company.id,
        name: company.name,
        code: company.code ?? '',
      })));
    } catch (error: unknown) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
);
