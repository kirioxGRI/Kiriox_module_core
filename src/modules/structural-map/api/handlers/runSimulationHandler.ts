import { NextResponse } from 'next/server';
import { PrismaGraphRepository } from '@/modules/structural-map/infrastructure/PrismaGraphRepository';

const repo = new PrismaGraphRepository();

const VALID_SCENARIOS = ['FAILURE', 'DEGRADATION', 'COMPROMISE'];

export async function runSimulationHandler(req: Request): Promise<NextResponse> {
  const body = await req.json() as { rootEntityId?: string; scenario?: string; userId?: string };
  if (!body.rootEntityId) return NextResponse.json({ error: 'rootEntityId requerido' }, { status: 400 });
  const scenario = (body.scenario ?? 'FAILURE').toUpperCase();
  if (!VALID_SCENARIOS.includes(scenario)) {
    return NextResponse.json({ error: `Escenario inválido. Use: ${VALID_SCENARIOS.join(', ')}` }, { status: 400 });
  }
  const result = await repo.runCascadeSimulation(body.rootEntityId, scenario, body.userId);
  return NextResponse.json({ ...result, status: 'completed', message: 'Simulación ejecutada correctamente' });
}
