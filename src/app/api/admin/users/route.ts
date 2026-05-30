import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';
import { requireCsrf } from '@/core/auth/csrf';
import { hashPassword } from '@/core/auth/password';
import { Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

function isAdmin(roleCode: string) {
  const code = (roleCode || '').trim().toLowerCase();
  return code === 'admin' || code === 'super_admin';
}

function normalizeRoleCode(code?: string): string {
  const value = String(code || '').trim();
  if (!value) return 'super_admin';
  if (value.toUpperCase() === 'ADMIN' || value.toLowerCase() === 'super_admin') return 'super_admin';
  return value.toLowerCase();
}

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const companyId = String(searchParams.get('companyId') ?? '').trim();

    if (companyId) {
      const rows = await prisma.$queryRaw<{
        id: string; email: string; name: string | null; last_name: string | null;
        is_active: boolean | null; activation_status: string | null;
        created_at: Date | null; updated_at: Date | null;
        role_code: string | null; role_name: string | null;
        company_name: string | null;
      }[]>(Prisma.sql`
        SELECT u.id, u.email, u.name, u.last_name, u.is_active, u.activation_status,
               u.created_at, u.updated_at, r.code AS role_code, r.name AS role_name,
               c.name AS company_name, c.legal_name AS company_legal_name
        FROM public.security_users u
        LEFT JOIN public.map_users_x_roles mur ON mur.user_id = u.id AND COALESCE(mur.is_active, true) = true
        LEFT JOIN public.security_roles r ON r.id = mur.role_id AND COALESCE(r.is_active, true) = true
        LEFT JOIN public.company c ON c.id = u.company_id
        WHERE u.company_id = ${companyId}::uuid
        ORDER BY u.created_at DESC NULLS LAST
      `);

      const grouped = new Map<string, {
        id: string; email: string; name: string | null; lastName: string | null;
        isActive: boolean; activationStatus: string; createdAt: Date | null; updatedAt: Date | null;
        companyName: string | null; roles: { roleCode: string; roleName: string | null }[];
      }>();

      for (const row of rows) {
        if (!grouped.has(row.id)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = row as any;
          grouped.set(row.id, {
            id: row.id, email: row.email, name: row.name, lastName: row.last_name,
            isActive: Boolean(row.is_active), activationStatus: row.activation_status ?? 'active',
            createdAt: row.created_at, updatedAt: row.updated_at, companyName: r.company_legal_name || r.company_name || null, roles: [],
          });
        }
        if (row.role_code) {
          grouped.get(row.id)!.roles.push({ roleCode: row.role_code, roleName: row.role_name });
        }
      }
      return NextResponse.json(Array.from(grouped.values()));
    }

    const users = await prisma.security_users.findMany({
      include: {
        company: { select: { name: true, legal_name: true } },
        map_users_x_roles: {
          where: { is_active: true },
          include: { security_roles: { select: { code: true, name: true } } }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(users.map(u => ({
      id: u.id, email: u.email, name: u.name, lastName: u.last_name,
      isActive: Boolean(u.is_active), activationStatus: u.activation_status ?? 'active',
      createdAt: u.created_at, updatedAt: u.updated_at,
      companyName: u.company?.legal_name || u.company?.name || null,
      roles: u.map_users_x_roles.map(r => ({ roleCode: r.security_roles.code, roleName: r.security_roles.name })),
    })));
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await requireCsrf(request))) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

  try {
    const { tenantId, email, name, lastName, whatsapp, roleCode, roleCodes, password, mustChangePassword } = await request.json();
    if (!email || !name || !tenantId || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 400 });

    const existingUser = await prisma.security_users.findUnique({ where: { email }, select: { id: true } });
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
      where: { code: { in: requestedRoleCodes }, is_active: true },
      select: { id: true, code: true }
    });
    if (roleRows.length === 0) {
      return NextResponse.json({ error: `Roles not found: ${requestedRoleCodes.join(', ')}` }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.security_users.create({
      data: {
        company_id: tenantId, email, password_hash: passwordHash, name,
        last_name: lastName || null, whatsapp: whatsapp || null,
        is_active: true, activation_status: 'active',
        must_change_password: mustChangePassword !== false,
        password_updated_at: new Date(),
      }
    });

    for (const role of roleRows) {
      await prisma.map_users_x_roles.create({ data: { user_id: newUser.id, role_id: role.id, is_active: true } });
    }

    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
