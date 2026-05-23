import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';

export async function GET() {
  const companies = await prisma.company.findMany();
  const users = await prisma.users.findMany({ include: { company: true }});
  return NextResponse.json({ companies, users });
}
