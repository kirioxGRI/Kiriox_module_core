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
    const user = await prisma.security_users.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        password_hash: true,
        is_active: true,
        company_id: true,
      },
    });
    return user ?? null;
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await prisma.security_users.update({
      where: { id: userId },
      data: { last_login_at: new Date() },
    });
  }
}
