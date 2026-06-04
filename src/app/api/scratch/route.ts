import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'systemic_entity_relations_strength_check'`);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
