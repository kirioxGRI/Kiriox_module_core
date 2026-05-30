import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { requireCsrf } from '@/core/auth/csrf';
import { hashPassword } from '@/core/auth/password';
import { withAccess } from '@/core/permissions/http/withAccess';

export const dynamic = 'force-dynamic';

function normalizeRoleCode(code?: string): string {
  const value = String(code || '').trim();
  if (!value) return 'super_admin';
  if (value.toUpperCase() === 'ADMIN' || value.toLowerCase() === 'super_admin') return 'super_admin';
  return value.toLowerCase();
}

export const GET = withAccess(
  { module: 'catalog', permission: 'R', submoduleCode: 'security_users', resourceType: 'user' },
  async (request, _context, access) => {
    try {
      const { searchParams } = new URL(request.url);
      const companyId = String(searchParams.get('companyId') ?? access.company.id).trim();

      if (companyId !== access.company.id) {
        return NextResponse.json({ error: 'No puede consultar otra empresa.' }, { status: 403 });
      }

      const rows = await prisma.$queryRaw<{
        id: string;
        email: string;
        name: string | null;
        last_name: string | null;
        is_active: boolean | null;
        activation_status: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        role_code: string | null;
        role_name: string | null;
        company_name: string | null;
        company_legal_name: string | null;
      }[]>(Prisma.sql`
        SELECT
          u.id,
          u.email,
          u.name,
          u.last_name,
          u.is_active,
          u.activation_status,
          u.created_at,
          u.updated_at,
          r.code AS role_code,
          r.name AS role_name,
          c.name AS company_name,
          c.legal_name AS company_legal_name
        FROM public.security_users u
        LEFT JOIN public.map_user_x_roles mur
          ON mur.user_id = u.id
         AND COALESCE(mur.is_active, true) = true
        LEFT JOIN public.security_roles r
          ON r.id = mur.role_id
         AND COALESCE(r.is_active, true) = true
        LEFT JOIN public.company c
          ON c.id = u.company_id
        WHERE u.company_id = ${companyId}::uuid
        ORDER BY u.created_at DESC NULLS LAST
      `);

      const grouped = new Map<string, {
        id: string;
        email: string;
        name: string | null;
        lastName: string | null;
        isActive: boolean;
        activationStatus: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyName: string | null;
        roles: { roleCode: string; roleName: string | null }[];
      }>();

      for (const row of rows) {
        if (!grouped.has(row.id)) {
          grouped.set(row.id, {
            id: row.id,
            email: row.email,
            name: row.name,
            lastName: row.last_name,
            isActive: Boolean(row.is_active),
            activationStatus: row.activation_status ?? 'active',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            companyName: row.company_legal_name || row.company_name || null,
            roles: [],
          });
        }

        if (row.role_code) {
          grouped.get(row.id)!.roles.push({
            roleCode: row.role_code,
            roleName: row.role_name,
          });
        }
      }

      return NextResponse.json(Array.from(grouped.values()));
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
);

export const POST = withAccess(
  { module: 'catalog', permission: 'W', submoduleCode: 'security_users', resourceType: 'user' },
  async (request, _context, access) => {
    if (!(await requireCsrf(request))) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    try {
      const { tenantId, email, name, lastName, whatsapp, roleCode, roleCodes, password, mustChangePassword } = await request.json();
      if (!email || !name || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const targetCompanyId = String(tenantId || access.company.id).trim();
      if (targetCompanyId !== access.company.id) {
        return NextResponse.json({ error: 'No puede crear usuarios en otra empresa.' }, { status: 403 });
      }

      const company = await prisma.company.findUnique({ where: { id: targetCompanyId }, select: { id: true } });
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 400 });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await prisma.security_users.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
      if (existingUser) {
        return NextResponse.json({ error: 'User already exists', userId: existingUser.id }, { status: 409 });
      }

      const requestedRoleCodes = Array.from(new Set(
        (Array.isArray(roleCodes) && roleCodes.length > 0 ? roleCodes : [roleCode])
          .map((code: string) => normalizeRoleCode(code))
          .filter((code: string) => Boolean(code))
      ));

      if (requestedRoleCodes.length === 0) {
        return NextResponse.json({ error: 'At least one role is required' }, { status: 400 });
      }

      const roleRows = await prisma.security_roles.findMany({
        where: {
          company_id: access.company.id,
          code: { in: requestedRoleCodes },
          is_active: true,
        },
        select: { id: true, code: true },
      });

      if (roleRows.length !== requestedRoleCodes.length) {
        return NextResponse.json({ error: `Roles not found: ${requestedRoleCodes.join(', ')}` }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const newUser = await prisma.security_users.create({
        data: {
          company_id: targetCompanyId,
          email: normalizedEmail,
          password_hash: passwordHash,
          name,
          last_name: lastName || null,
          whatsapp: whatsapp || null,
          is_active: true,
          activation_status: 'active',
          must_change_password: mustChangePassword !== false,
          password_updated_at: new Date(),
        },
      });

      await prisma.map_user_x_roles.createMany({
        data: roleRows.map((role) => ({
          user_id: newUser.id,
          role_id: role.id,
          is_active: true,
        })),
      });

      return NextResponse.json({ success: true, userId: newUser.id });
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
);
