import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type { IMonitoringRepository } from '../domain/contracts/IMonitoringRepository';
import type {
  DashboardData, Kpis, CatItem, MonitorItem, AlertaRiesgoResidual, SimpleEvento,
} from '../domain/types/MonitoringDashboardTypes';
import type { RiskRow, ControlRow, TestRow, EvidenceRow, TableKey, FieldKey } from '../domain/types/MonitoringDateTypes';

// ── raw row shapes returned by Prisma.sql ────────────────────────────────────

type ItemRow = {
  id: string; title: string; category: string;
  due_date: Date | null; date_status: string; dias_restantes: number | null;
};

type EventRow = {
  id: string; title: string; category: string; trigger_type: string;
  status: string; sev_key: string; due_date: Date | null;
  event_date: Date; responsible_name: string | null;
  current_value: number | null; threshold_value: number | null;
};

type SimpleEventRow = {
  id: string; title: string; status: string; sev_key: string;
  due_date: Date | null; event_date: Date; responsible_name: string | null;
};

function toDateStr(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : null;
}

const SEV_CTE = Prisma.sql`
  WITH sev AS (
    SELECT id,
      CASE ROW_NUMBER() OVER (ORDER BY sort_order ASC)
        WHEN 1 THEN 'critico' WHEN 2 THEN 'alto' WHEN 3 THEN 'medio' ELSE 'bajo'
      END AS sev_key
    FROM public.catalog_activity_criticality_level WHERE is_active = true
  )
`;

export class PrismaMonitoringRepository implements IMonitoringRepository {

  async getDashboardData(companyId: string): Promise<DashboardData> {
    const items = await prisma.$queryRaw<ItemRow[]>(Prisma.sql`
      WITH today AS (SELECT CURRENT_DATE AS d),

      risks_items AS (
        SELECT r.id::text AS id, r.name AS title, 'risks'::text AS category,
               r.next_review_date::date AS due_date
        FROM   public.run_ra_risks r
        JOIN   public.run_ra ra ON ra.id = r.run_ra_id
        WHERE  ra.company_id = ${companyId}::uuid
      ),

      controls_items AS (
        SELECT c.id::text AS id, c.name AS title, 'controls'::text AS category,
               CASE
                 WHEN c.next_execution_date IS NOT NULL AND c.next_review_date IS NOT NULL
                   THEN LEAST(c.next_execution_date, c.next_review_date)::date
                 ELSE COALESCE(c.next_execution_date, c.next_review_date)::date
               END AS due_date
        FROM   public.run_ra_controls c
        JOIN   public.run_ra ra ON ra.id = c.run_ra_id
        WHERE  ra.company_id = ${companyId}::uuid
      ),

      tests_items AS (
        SELECT ct.id::text AS id, ct.test_name AS title, 'tests'::text AS category,
               ct.expiration_date::date AS due_date
        FROM   public.run_ra_control_tests ct
        JOIN   public.run_ra ra ON ra.id = ct.run_ra_id
        WHERE  ra.company_id = ${companyId}::uuid
      ),

      evidences_items AS (
        SELECT e.id::text AS id, e.title, 'evidences'::text AS category,
               e.expiration_date::date AS due_date
        FROM   public.run_ra_evidence e
        JOIN   public.run_ra ra ON ra.id = e.run_ra_id
        WHERE  ra.company_id = ${companyId}::uuid
      ),

      all_items AS (
        SELECT * FROM risks_items
        UNION ALL SELECT * FROM controls_items
        UNION ALL SELECT * FROM tests_items
        UNION ALL SELECT * FROM evidences_items
      ),

      classified AS (
        SELECT
          id, title, category, due_date,
          CASE
            WHEN due_date IS NULL                          THEN 'sin_fecha'
            WHEN due_date < t.d                            THEN 'vencida'
            WHEN due_date <= t.d + INTERVAL '30 days'     THEN 'proxima'
            ELSE                                               'vigente'
          END AS date_status,
          CASE WHEN due_date IS NOT NULL THEN (due_date - t.d)::int END AS dias_restantes
        FROM all_items
        CROSS JOIN today t
      )

      SELECT * FROM classified
      ORDER BY
        CASE date_status
          WHEN 'vencida'   THEN 0
          WHEN 'proxima'   THEN 1
          WHEN 'vigente'   THEN 2
          ELSE                  3
        END,
        dias_restantes ASC NULLS LAST
    `);

    const kpis: Kpis = {
      total:     items.length,
      vencidos:  items.filter(i => i.date_status === 'vencida').length,
      proximos:  items.filter(i => i.date_status === 'proxima').length,
      vigentes:  items.filter(i => i.date_status === 'vigente').length,
      sin_fecha: items.filter(i => i.date_status === 'sin_fecha').length,
      con_fecha: items.filter(i => i.date_status !== 'sin_fecha').length,
    };

    const cats = ['risks', 'controls', 'tests', 'evidences'] as const;
    const por_categoria: CatItem[] = cats.map(cat => {
      const ci = items.filter(i => i.category === cat);
      return {
        category:  cat,
        total:     ci.length,
        vencidos:  ci.filter(i => i.date_status === 'vencida').length,
        proximos:  ci.filter(i => i.date_status === 'proxima').length,
        vigentes:  ci.filter(i => i.date_status === 'vigente').length,
        sin_fecha: ci.filter(i => i.date_status === 'sin_fecha').length,
      };
    });

    const toItem = (i: ItemRow): MonitorItem => ({
      id:             i.id,
      title:          i.title,
      category:       i.category,
      due_date:       i.due_date instanceof Date ? i.due_date.toISOString().slice(0, 10) : String(i.due_date ?? ''),
      dias_restantes: i.dias_restantes ?? 0,
      date_status:    i.date_status,
    });

    const proximos_vencimientos = items.filter(i => i.date_status === 'proxima').slice(0, 8).map(toItem);
    const elementos_vencidos    = items.filter(i => i.date_status === 'vencida').slice(0, 8).map(toItem);

    const eventosRaw = await prisma.$queryRaw<EventRow[]>(Prisma.sql`
      ${SEV_CTE}
      SELECT
        me.id::text,
        me.title,
        me.category,
        me.trigger_type,
        me.status,
        COALESCE(s.sev_key, 'bajo') AS sev_key,
        me.due_date,
        me.event_date,
        me.current_value,
        me.threshold_value,
        TRIM(COALESCE(
          u.name || ' ' || COALESCE(u.last_name, ''),
          u.name,
          u.email
        )) AS responsible_name
      FROM public.monitoring_event me
      LEFT JOIN sev s ON s.id = me.criticality_level_id
      LEFT JOIN public.security_users u ON u.id::text = me.responsible_id::text
      WHERE me.current_value  IS NOT NULL
        AND me.threshold_value IS NOT NULL
        AND me.current_value > me.threshold_value
      ORDER BY
        CASE me.status WHEN 'active' THEN 0 WHEN 'monitored' THEN 1 ELSE 2 END,
        me.current_value DESC
      LIMIT 50
    `);

    const alertas_riesgo_residual: AlertaRiesgoResidual[] = eventosRaw.map(r => ({
      id:               r.id,
      title:            r.title,
      category:         r.category,
      trigger_type:     r.trigger_type,
      status:           r.status,
      sev_key:          r.sev_key,
      due_date:         r.due_date instanceof Date ? r.due_date.toISOString().slice(0, 10) : (r.due_date ? String(r.due_date) : null),
      event_date:       r.event_date instanceof Date ? r.event_date.toISOString().slice(0, 10) : String(r.event_date),
      current_value:    r.current_value,
      threshold_value:  r.threshold_value,
      responsible_name: r.responsible_name ?? null,
    }));

    const simpleEventSql = (category: string, triggerType: string) => Prisma.sql`
      ${SEV_CTE}
      SELECT
        me.id::text, me.title, me.status,
        COALESCE(s.sev_key, 'bajo') AS sev_key,
        me.due_date, me.event_date,
        TRIM(COALESCE(u.name || ' ' || COALESCE(u.last_name,''), u.name, u.email)) AS responsible_name
      FROM public.monitoring_event me
      LEFT JOIN sev s ON s.id = me.criticality_level_id
      LEFT JOIN public.security_users u ON u.id::text = me.responsible_id::text
      WHERE me.category = ${category} AND me.trigger_type = ${triggerType}
      ORDER BY CASE me.status WHEN 'active' THEN 0 WHEN 'monitored' THEN 1 ELSE 2 END, me.event_date DESC
      LIMIT 50
    `;

    const toSimple = (r: SimpleEventRow): SimpleEvento => ({
      id:               r.id,
      title:            r.title,
      status:           r.status,
      sev_key:          r.sev_key,
      due_date:         r.due_date instanceof Date ? r.due_date.toISOString().slice(0, 10) : (r.due_date ? String(r.due_date) : null),
      event_date:       r.event_date instanceof Date ? r.event_date.toISOString().slice(0, 10) : String(r.event_date),
      responsible_name: r.responsible_name ?? null,
    });

    const [controlesSinEvidenciaRaw, riesgosSinControlRaw] = await Promise.all([
      prisma.$queryRaw<SimpleEventRow[]>(simpleEventSql('controls', 'status_change')),
      prisma.$queryRaw<SimpleEventRow[]>(simpleEventSql('risks',    'status_change')),
    ]);

    return {
      kpis,
      por_categoria,
      proximos_vencimientos,
      elementos_vencidos,
      alertas_riesgo_residual,
      controles_sin_evidencia: controlesSinEvidenciaRaw.map(toSimple),
      riesgos_sin_control:     riesgosSinControlRaw.map(toSimple),
      ultima_actualizacion:    new Date().toISOString(),
    };
  }

  async getActiveEventCount(): Promise<number> {
    type CountRow = { count: number };
    const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count FROM public.monitoring_event WHERE status = 'active'
    `);
    return rows[0]?.count ?? 0;
  }

  async syncEvents(): Promise<{ inserted: number; resolved: number }> {
    type SyncRow = { result: { inserted?: number; resolved?: number } };
    const rows = await prisma.$queryRaw<SyncRow[]>`
      SELECT public.fn_monitoring() AS result
    `;
    const result = rows[0]?.result ?? {};
    return { inserted: result.inserted ?? 0, resolved: result.resolved ?? 0 };
  }

  async getRisks(companyId: string): Promise<RiskRow[]> {
    type Raw = { id: string; code: string; name: string; next_review_date: unknown };
    const rows = await prisma.$queryRaw<Raw[]>(Prisma.sql`
      SELECT r.id::text, r.code, r.name, r.next_review_date
      FROM   public.run_ra_risks r
      JOIN   public.run_ra       ra ON ra.id = r.run_ra_id
      WHERE  ra.company_id = ${companyId}::uuid
      ORDER  BY r.next_review_date ASC NULLS LAST
      LIMIT  200
    `);
    return rows.map(r => ({ ...r, next_review_date: toDateStr(r.next_review_date) }));
  }

  async getControls(companyId: string): Promise<ControlRow[]> {
    type Raw = {
      id: string; code: string; name: string; is_active: boolean;
      next_execution_date: unknown; next_review_date: unknown;
    };
    const rows = await prisma.$queryRaw<Raw[]>(Prisma.sql`
      SELECT c.id::text, c.code, c.name, c.is_active,
             c.next_execution_date, c.next_review_date
      FROM   public.run_ra_controls c
      JOIN   public.run_ra          ra ON ra.id = c.run_ra_id
      WHERE  ra.company_id = ${companyId}::uuid
      ORDER  BY COALESCE(c.next_execution_date, c.next_review_date) ASC NULLS LAST
      LIMIT  200
    `);
    return rows.map(r => ({
      ...r,
      next_execution_date: toDateStr(r.next_execution_date),
      next_review_date:    toDateStr(r.next_review_date),
    }));
  }

  async getTests(companyId: string): Promise<TestRow[]> {
    type Raw = {
      id: string; test_name: string; status: string;
      expiration_date: unknown; control_name: string;
    };
    const rows = await prisma.$queryRaw<Raw[]>(Prisma.sql`
      SELECT ct.id::text, ct.test_name, ct.status, ct.expiration_date,
             c.name AS control_name
      FROM   public.run_ra_control_tests ct
      JOIN   public.run_ra_controls       c  ON c.id  = ct.run_ra_control_id
      JOIN   public.run_ra                ra ON ra.id = ct.run_ra_id
      WHERE  ra.company_id = ${companyId}::uuid
      ORDER  BY ct.expiration_date ASC NULLS LAST
      LIMIT  200
    `);
    return rows.map(r => ({ ...r, expiration_date: toDateStr(r.expiration_date) }));
  }

  async getEvidences(companyId: string): Promise<EvidenceRow[]> {
    type Raw = {
      id: string; title: string; evidence_type: string;
      validity_status: string; expiration_date: unknown;
    };
    const rows = await prisma.$queryRaw<Raw[]>(Prisma.sql`
      SELECT e.id::text, e.title, e.evidence_type, e.validity_status, e.expiration_date
      FROM   public.run_ra_evidence e
      JOIN   public.run_ra          ra ON ra.id = e.run_ra_id
      WHERE  ra.company_id = ${companyId}::uuid
      ORDER  BY e.expiration_date ASC NULLS LAST
      LIMIT  200
    `);
    return rows.map(r => ({ ...r, expiration_date: toDateStr(r.expiration_date) }));
  }

  async updateDate(
    table: TableKey,
    id: string,
    field: FieldKey,
    value: string | null,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      if (value !== null) {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE public.${Prisma.raw(table)}
          SET    ${Prisma.raw(field)} = ${value}::date::timestamptz,
                 updated_at = NOW()
          WHERE  id = ${id}::uuid
        `);
      } else {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE public.${Prisma.raw(table)}
          SET    ${Prisma.raw(field)} = NULL,
                 updated_at = NOW()
          WHERE  id = ${id}::uuid
        `);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
}
