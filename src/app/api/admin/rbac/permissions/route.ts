import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';

function isAdmin(roleCode: string) {
  const code = (roleCode || '').trim().toLowerCase();
  return code === 'admin' || code === 'super_admin';
}

// GET → { roles, permissions, assignments: { [role_id]: permission_code[] } }
export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');

  try {
    const [roles, permissions, rawAssignments] = await Promise.all([
      prisma.security_roles.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true, description: true },
      }),
      prisma.users_permission.findMany({
        where: { is_active: true },
        orderBy: [{ module_code: 'asc' }, { name: 'asc' }],
        select: { code: true, module_code: true, name: true, description: true },
      }),
      prisma.map_role_x_permission.findMany({
        where: {
          is_active: true,
          ...(roleId ? { role_id: roleId } : {}),
        },
        select: { role_id: true, permission_code: true },
      }),
    ]);

    const assignments: Record<string, string[]> = {};
    for (const a of rawAssignments) {
      if (!assignments[a.role_id]) assignments[a.role_id] = [];
      assignments[a.role_id].push(a.permission_code);
    }

    return NextResponse.json({ roles, permissions, assignments });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}

// POST → { roleId, permissionCode, enabled }
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(auth.roleCode)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { roleId, permissionCode, enabled } = await request.json();
    if (!roleId || !permissionCode) {
      return NextResponse.json({ error: 'roleId y permissionCode son obligatorios' }, { status: 400 });
    }

    await prisma.map_role_x_permission.upsert({
      where: { role_id_permission_code: { role_id: roleId, permission_code: permissionCode } },
      create: { role_id: roleId, permission_code: permissionCode, is_active: enabled !== false },
      update: { is_active: enabled !== false, updated_at: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al actualizar permiso', details: msg }, { status: 500 });
  }
}
