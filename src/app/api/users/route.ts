import { NextResponse } from 'next/server';
import { getAuthContext } from '@/core/auth/auth-server';
import prisma from '@/infrastructure/db/prisma/client';
import { Prisma } from '@/generated/prisma/client';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  username: string | null;
}

export async function GET() {
  try {
    await getAuthContext();

    const rows = await prisma.$queryRaw<UserRow[]>(Prisma.sql`
      SELECT
        u.id::text,
        COALESCE(u.username, u.email)            AS full_name,
        u.email,
        u.username
      FROM public.security_users u
      WHERE COALESCE(u.is_active, true) = true
      ORDER BY COALESCE(u.username, u.email) ASC
    `);

    return NextResponse.json({ users: rows });
  } catch (err: unknown) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Error interno'
      : (err instanceof Error ? err.message : 'Error interno');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
