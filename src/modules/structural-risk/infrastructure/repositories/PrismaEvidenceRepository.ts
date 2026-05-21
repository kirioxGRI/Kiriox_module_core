import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';
import type { EvidenceRow, IEvidenceRepository, UpsertEvidenceInput } from '@/modules/structural-risk/domain/contracts/IEvidenceRepository';

export class PrismaEvidenceRepository implements IEvidenceRepository {
  async getEvidence(runSaId: string, companyId: string): Promise<EvidenceRow[]> {
    companyId = await resolveEffectiveCompanyId(companyId);
    return prisma.$queryRaw<EvidenceRow[]>(Prisma.sql`
      SELECT
        e.control_id::text,
        e.evidence_exists,
        e.evidence_current,
        e.evidence_sufficient,
        e.evidence_traceable,
        e.evidence_capture_mode,
        e.evidence_strength,
        e.evidence_notes,
        COALESCE(h.is_hard_gate, false) AS is_hard_gate
      FROM public.graph_control_evidence e
      JOIN public.graph_run_sa r ON r.id = e.run_id
      LEFT JOIN public.graph_control_hardgate h
        ON h.run_id = e.run_id AND h.control_id = e.control_id
      WHERE e.run_id = ${runSaId}::uuid
        AND r.company_id = ${companyId}::uuid
    `);
  }

  async verifyRun(runSaId: string, companyId: string): Promise<boolean> {
    companyId = await resolveEffectiveCompanyId(companyId);
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id::text FROM public.graph_run_sa
      WHERE id = ${runSaId}::uuid AND company_id = ${companyId}::uuid
      LIMIT 1
    `);
    return Boolean(rows[0]);
  }

  async upsertEvidence(input: UpsertEvidenceInput): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO public.graph_control_evidence (
        evidence_eval_id, run_id, risk_cascade_id, control_id,
        evidence_exists, evidence_current, evidence_sufficient, evidence_traceable,
        evidence_capture_mode, evidence_strength, evidence_notes,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${input.runSaId}::uuid, ${input.riskCascadeId}::uuid, ${input.controlId}::uuid,
        ${input.evidenceExists}, ${input.evidenceCurrent}, ${input.evidenceSufficient}, ${input.evidenceTraceable},
        ${input.captureMode}, ${input.evidenceStrength}, ${input.evidenceNotes},
        now(), now()
      )
      ON CONFLICT (run_id, control_id) DO UPDATE SET
        risk_cascade_id       = EXCLUDED.risk_cascade_id,
        evidence_exists       = EXCLUDED.evidence_exists,
        evidence_current      = EXCLUDED.evidence_current,
        evidence_sufficient   = EXCLUDED.evidence_sufficient,
        evidence_traceable    = EXCLUDED.evidence_traceable,
        evidence_capture_mode = EXCLUDED.evidence_capture_mode,
        evidence_strength     = EXCLUDED.evidence_strength,
        evidence_notes        = EXCLUDED.evidence_notes,
        updated_at            = now()
    `);
  }
}
