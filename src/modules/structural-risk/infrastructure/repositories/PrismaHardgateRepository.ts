import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';
import type { HardgateRow, IHardgateRepository, UpsertHardgateInput } from '@/modules/structural-risk/domain/contracts/IHardgateRepository';

export class PrismaHardgateRepository implements IHardgateRepository {
  async getHardgates(runSaId: string, companyId: string): Promise<HardgateRow[]> {
    companyId = await resolveEffectiveCompanyId(companyId);
    return prisma.$queryRaw<HardgateRow[]>(Prisma.sql`
      SELECT
        h.id::text,
        h.run_id::text,
        h.risk_cascade_id::text,
        h.control_id::text,
        h.is_hard_gate,
        h.hardgate_reason,
        h.answered_yes_question
      FROM public.graph_control_hardgate h
      JOIN public.graph_run_sa r ON r.id = h.run_id
      WHERE h.run_id = ${runSaId}::uuid
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

  async upsertHardgate(input: UpsertHardgateInput): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO public.graph_control_hardgate (
        id, run_id, risk_cascade_id, control_id,
        is_hard_gate, hardgate_reason, answered_yes_question,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${input.runSaId}::uuid, ${input.riskCascadeId}::uuid, ${input.controlId}::uuid,
        ${input.isHardGate}, ${input.hardgateReason}, ${input.answeredYesQuestion},
        now(), now()
      )
      ON CONFLICT (run_id, control_id) DO UPDATE SET
        risk_cascade_id        = EXCLUDED.risk_cascade_id,
        is_hard_gate           = EXCLUDED.is_hard_gate,
        hardgate_reason        = EXCLUDED.hardgate_reason,
        answered_yes_question  = EXCLUDED.answered_yes_question,
        updated_at             = now()
    `);
  }
}
