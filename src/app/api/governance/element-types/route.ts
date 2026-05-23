import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const types = await prisma.element_types.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ items: types });
  } catch (error: unknown) {
    console.error('Error fetching element types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
