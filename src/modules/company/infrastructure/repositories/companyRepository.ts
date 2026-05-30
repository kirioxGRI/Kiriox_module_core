import { Prisma } from "@/generated/prisma/client";
import prisma from "@/infrastructure/db/prisma/client";
import { CompanyRecord, CompanyTopSummary } from "../../domain/types";

function normalizeCodeSeed(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export class CompanyRepository {
  async findAll(): Promise<CompanyRecord[]> {
    return prisma.$queryRaw<CompanyRecord[]>(Prisma.sql`
      SELECT id, code, name, legal_name, description, status, created_at, updated_at
      FROM public.company
      ORDER BY created_at ASC, code ASC
    `);
  }

  async findById(id: string): Promise<CompanyRecord | null> {
    const rows = await prisma.$queryRaw<CompanyRecord[]>(Prisma.sql`
      SELECT id, code, name, legal_name, description, status, created_at, updated_at
      FROM public.company
      WHERE id = ${id}::uuid
      LIMIT 1
    `);
    return rows[0] || null;
  }

  async buildUniqueCode(name: string): Promise<string> {
    const seed = normalizeCodeSeed(name).slice(0, 40) || "COMPANY";
    const rows = await prisma.$queryRaw<{ code: string }[]>(Prisma.sql`
      SELECT code FROM public.company
      WHERE code = ${seed} OR code LIKE ${`${seed}_%`}
    `);
    const existing = new Set(rows.map((r) => r.code));
    if (!existing.has(seed)) return seed;
    let suffix = 2;
    while (existing.has(`${seed}_${suffix}`)) suffix += 1;
    return `${seed}_${suffix}`;
  }

  async create(data: {
    code: string;
    name: string;
    legalName: string | null;
    description: string | null;
    status: boolean;
    createdAt?: string;
    updatedAt?: string;
  }): Promise<CompanyRecord> {
    const rows = await prisma.$queryRaw<CompanyRecord[]>(Prisma.sql`
      INSERT INTO public.company (code, name, legal_name, description, status, created_at, updated_at)
      VALUES (
        ${data.code},
        ${data.name},
        ${data.legalName || null},
        ${data.description || null},
        ${data.status},
        ${data.createdAt ? Prisma.sql`${data.createdAt}::timestamp` : Prisma.sql`now()`},
        ${data.updatedAt ? Prisma.sql`${data.updatedAt}::timestamp` : Prisma.sql`now()`}
      )
      RETURNING id, code, name, legal_name, description, status, created_at, updated_at
    `);
    return rows[0];
  }

  async update(
    id: string,
    data: {
      name: string;
      legalName: string | null;
      description: string | null;
      status: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<CompanyRecord> {
    const rows = await prisma.$queryRaw<CompanyRecord[]>(Prisma.sql`
      UPDATE public.company
      SET
        name = ${data.name},
        legal_name = ${data.legalName || null},
        description = ${data.description || null},
        status = ${data.status},
        created_at = ${data.createdAt ? Prisma.sql`${data.createdAt}::timestamp` : Prisma.sql`created_at`},
        updated_at = ${data.updatedAt ? Prisma.sql`${data.updatedAt}::timestamp` : Prisma.sql`now()`}
      WHERE id = ${id}::uuid
      RETURNING id, code, name, legal_name, description, status, created_at, updated_at
    `);
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM public.company WHERE id = ${id}::uuid
    `);
  }

  async getSummary(companyId?: string): Promise<CompanyTopSummary> {
    const hasCompany = companyId && companyId.length > 20;
    const rows = await prisma.$queryRaw<CompanyTopSummary[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::int FROM public.elements WHERE ${hasCompany ? Prisma.sql`company_id = ${companyId}::uuid` : Prisma.sql`1=1`}) AS elements_count,
        (SELECT COUNT(*)::int FROM public.activities WHERE ${hasCompany ? Prisma.sql`element_id IN (SELECT id FROM public.elements WHERE company_id = ${companyId}::uuid)` : Prisma.sql`1=1`}) AS activities_count,
        (SELECT COUNT(*)::int FROM public.run_ra_risks WHERE ${hasCompany ? Prisma.sql`run_ra_id IN (SELECT id FROM public.run_ra WHERE company_id = ${companyId}::uuid)` : Prisma.sql`1=1`}) AS risks_count,
        (SELECT COUNT(*)::int FROM public.run_ra_controls WHERE ${hasCompany ? Prisma.sql`run_ra_id IN (SELECT id FROM public.run_ra WHERE company_id = ${companyId}::uuid)` : Prisma.sql`1=1`}) AS controls_count,
        (SELECT COUNT(*)::int FROM public.run_ra_control_tests WHERE ${hasCompany ? Prisma.sql`run_ra_id IN (SELECT id FROM public.run_ra WHERE company_id = ${companyId}::uuid)` : Prisma.sql`1=1`}) AS tests_count,
        (SELECT COUNT(*)::int FROM public.security_users WHERE ${hasCompany ? Prisma.sql`company_id = ${companyId}::uuid` : Prisma.sql`1=1`}) AS users_count
    `);
    return rows[0] || { elements_count: 0, activities_count: 0, risks_count: 0, controls_count: 0, tests_count: 0, users_count: 0 };
  }
}

export const companyRepository = new CompanyRepository();
