import { NextResponse } from 'next/server';
import { PrismaGraphRepository } from '@/modules/structural-map/infrastructure/PrismaGraphRepository';

const repo = new PrismaGraphRepository();

const VALID_TYPES = ['structural', 'criticality', 'resilience', 'exposure'];

export async function runAnalysisHandler(req: Request, analysisType: string): Promise<NextResponse> {
  if (!VALID_TYPES.includes(analysisType)) {
    return NextResponse.json({ error: `Tipo de análisis inválido: ${analysisType}` }, { status: 400 });
  }
  const body = await req.json() as { rootEntityId?: string; userId?: string };
  if (!body.rootEntityId) return NextResponse.json({ error: 'rootEntityId requerido' }, { status: 400 });

  const runId = await repo.runAnalysis(body.rootEntityId, analysisType, body.userId);
  return NextResponse.json({ run_id: runId, analysis_type: analysisType, status: 'completed', message: 'Análisis ejecutado correctamente' });
}
