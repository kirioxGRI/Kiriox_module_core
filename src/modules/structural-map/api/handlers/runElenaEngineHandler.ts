import { NextResponse } from 'next/server';
import { PrismaElenaRepository } from '@/modules/structural-map/infrastructure/PrismaElenaRepository';
import type { ElenaRunInput, ElenaEngine } from '@/modules/structural-map/domain/types/ElenaTypes';

const VALID_ENGINES: ElenaEngine[] = ['structural', 'criticality', 'resilience', 'exposure', 'cascade'];
const VALID_SCENARIOS = ['FAILURE', 'DEGRADATION', 'COMPROMISE'];

const repo = new PrismaElenaRepository();

export async function runElenaEngineHandler(req: Request): Promise<NextResponse> {
  const body = await req.json() as Partial<ElenaRunInput>;

  if (!body.rootEntityId) {
    return NextResponse.json({ ok: false, error: 'rootEntityId es requerido' }, { status: 400 });
  }
  if (!body.engine || !VALID_ENGINES.includes(body.engine)) {
    return NextResponse.json({ ok: false, error: `engine inválido. Use: ${VALID_ENGINES.join(', ')}` }, { status: 400 });
  }
  if (body.engine === 'cascade' && body.scenario && !VALID_SCENARIOS.includes(body.scenario)) {
    return NextResponse.json({ ok: false, error: `scenario inválido. Use: ${VALID_SCENARIOS.join(', ')}` }, { status: 400 });
  }

  const result = await repo.runAndFetch({
    rootEntityId: body.rootEntityId,
    engine:       body.engine,
    scenario:     body.scenario,
    userId:       body.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
