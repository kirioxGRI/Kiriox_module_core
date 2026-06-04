import { NextResponse } from 'next/server';
import { PrismaSystemicDashboardRepository } from '@/modules/structural-risk/infrastructure/repositories/PrismaSystemicDashboardRepository';

export async function getSystemicDashboardHandler(): Promise<NextResponse> {
  const repo = new PrismaSystemicDashboardRepository();
  const data = await repo.getDashboardData();
  return NextResponse.json(data);
}
