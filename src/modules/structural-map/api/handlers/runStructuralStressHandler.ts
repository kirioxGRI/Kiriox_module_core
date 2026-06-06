import { NextResponse } from 'next/server';
import { PrismaStressSimulationRepository } from '@/modules/structural-map/infrastructure/PrismaStressSimulationRepository';
import {
  EVENT_TYPE_SCENARIO,
  type StructuralStressRequest,
  type StressEventType,
} from '@/modules/structural-map/domain/types/StressSimTypes';

const repo = new PrismaStressSimulationRepository();
const VALID_EVENT_TYPES = Object.keys(EVENT_TYPE_SCENARIO) as StressEventType[];

export async function runStructuralStressHandler(req: Request): Promise<NextResponse> {
  let body: Partial<StructuralStressRequest>;
  try {
    body = (await req.json()) as Partial<StructuralStressRequest>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  if (!body.sourceNodeId || typeof body.sourceNodeId !== 'string') {
    return NextResponse.json({ ok: false, error: 'sourceNodeId es requerido' }, { status: 400 });
  }
  const scope = Array.isArray(body.scopeEntityIds)
    ? body.scopeEntityIds.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : [];
  if (scope.length === 0) {
    return NextResponse.json({ ok: false, error: 'scopeEntityIds (grafo visible) es requerido y no puede estar vacío' }, { status: 400 });
  }
  if (!body.eventType || !VALID_EVENT_TYPES.includes(body.eventType)) {
    return NextResponse.json({ ok: false, error: `eventType inválido. Use: ${VALID_EVENT_TYPES.join(', ')}` }, { status: 400 });
  }
  const severity = Number(body.severity);
  if (!Number.isFinite(severity) || severity < 0 || severity > 100) {
    return NextResponse.json({ ok: false, error: 'severity debe estar entre 0 y 100' }, { status: 400 });
  }
  const durationHours = Number(body.durationHours);
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    return NextResponse.json({ ok: false, error: 'durationHours debe ser mayor que 0' }, { status: 400 });
  }

  try {
    const result = await repo.run({
      graphId: typeof body.graphId === 'string' ? body.graphId : undefined,
      sourceNodeId: body.sourceNodeId,
      scopeEntityIds: scope,
      severity,
      durationHours,
      eventType: body.eventType,
      description: typeof body.description === 'string' ? body.description : undefined,
      userId: typeof body.userId === 'string' ? body.userId : undefined,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Error inesperado ejecutando la simulación de estrés';
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
