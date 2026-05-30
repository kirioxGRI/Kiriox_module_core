import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';

export interface AuthUserRow {
  id: string;
  email: string | null;
  username: string | null;
  password_hash: string;
  is_active: boolean | null;
  company_id: string | null;
}

export class PrismaAuthRepository {
  async findUserByIdentifier(identifier: string): Promise<AuthUserRow | null> {
    const rows = await prisma.$queryRaw<AuthUserRow[]>(Prisma.sql`
      SELECT
        u.id::text,
        u.email,
        u.username,
        u.password_hash,
        COALESCE(u.is_active, true) AS is_active,
        u.company_id::text
      FROM public.security_users u
      WHERE LOWER(COALESCE(u.email, '')) = ${identifier}
         OR LOWER(COALESCE(u.username, '')) = ${identifier}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.security_users SET last_login_at = NOW() WHERE id = ${userId}::uuid
    `);
  }
}
