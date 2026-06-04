import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type {
  ServiceSummary,
  EntityType,
  RelationType,
  CreateEntityInput,
  CreateRelationInput,
  UpdateRelationInput,
  ValidationResult,
  ValidationIssue,
} from '@/modules/structural-map/domain/types/PortfolioTypes';

function normalizeRelationWeight(weight: number | null | undefined): number | null {
  if (weight == null || Number.isNaN(weight)) return null;

  const normalized = weight > 1 ? weight / 100 : weight;
  const clamped = Math.min(Math.max(normalized, 0), 1);

  return Number(clamped.toFixed(4));
}

export class PrismaPortfolioRepository {
  async getAllEntities(): Promise<any[]> {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        se.id::text,
        se.code,
        se.name,
        se.description,
        se.status,
        se.criticality_level,
        se.entity_type_id::text,
        et.code AS entity_type_code,
        et.name AS entity_type_name,
        se.is_active
      FROM systemic_entities se
      JOIN systemic_entity_types et ON et.id = se.entity_type_id
      WHERE se.is_active = true
      ORDER BY se.name ASC
    `);
    return rows.map((r) => ({
      ...r,
      id: String(r.id),
      entity_type_id: String(r.entity_type_id),
      is_active: Boolean(r.is_active),
      is_spof: false,
      is_critical_node: false,
      total_degree: 0,
      criticality_score: null,
      resilience_score: null,
      exposure_score: null,
    }));
  }

  async getServices(): Promise<ServiceSummary[]> {
    const rows = await prisma.$queryRaw<ServiceSummary[]>(Prisma.sql`
      SELECT
        se.id::text,
        se.code,
        se.name,
        se.description,
        se.status,
        se.criticality_level,
        (
          SELECT COUNT(DISTINCT CASE
            WHEN ser.source_entity_id = se.id THEN ser.target_entity_id
            ELSE ser.source_entity_id END)::int
          FROM systemic_entity_relations ser
          WHERE (ser.source_entity_id = se.id OR ser.target_entity_id = se.id) AND ser.is_active = true
        ) AS entity_count,
        (
          SELECT COUNT(*)::int FROM systemic_entity_relations ser
          WHERE (ser.source_entity_id = se.id OR ser.target_entity_id = se.id) AND ser.is_active = true
        ) AS relation_count,
        (
          SELECT COUNT(*)::int FROM systemic_structural_metrics ssm
          WHERE ssm.entity_id = se.id AND ssm.is_critical_node = true
        ) AS critical_nodes,
        (
          SELECT COUNT(*)::int FROM systemic_structural_metrics ssm
          WHERE ssm.entity_id = se.id AND ssm.is_spof = true
        ) AS spof_count,
        (
          SELECT sar.completed_at::text
          FROM systemic_structural_analysis_runs sar
          JOIN systemic_structural_metrics ssm ON ssm.structural_analysis_run_id = sar.id
          WHERE ssm.entity_id = se.id
          ORDER BY sar.created_at DESC LIMIT 1
        ) AS last_analysis_at,
        (
          SELECT sar.analysis_type
          FROM systemic_structural_analysis_runs sar
          JOIN systemic_structural_metrics ssm ON ssm.structural_analysis_run_id = sar.id
          WHERE ssm.entity_id = se.id
          ORDER BY sar.created_at DESC LIMIT 1
        ) AS last_analysis_type,
        (
          SELECT ssm.criticality_score::float
          FROM systemic_structural_metrics ssm
          WHERE ssm.entity_id = se.id AND ssm.criticality_score IS NOT NULL
          ORDER BY ssm.created_at DESC LIMIT 1
        ) AS criticality_score,
        (
          SELECT ssm.resilience_score::float
          FROM systemic_structural_metrics ssm
          WHERE ssm.entity_id = se.id AND ssm.resilience_score IS NOT NULL
          ORDER BY ssm.created_at DESC LIMIT 1
        ) AS resilience_score,
        (
          SELECT ssm.exposure_score::float
          FROM systemic_structural_metrics ssm
          WHERE ssm.entity_id = se.id AND ssm.exposure_score IS NOT NULL
          ORDER BY ssm.created_at DESC LIMIT 1
        ) AS exposure_score
      FROM systemic_entities se
      JOIN systemic_entity_types set2 ON se.entity_type_id = set2.id
      WHERE set2.code = 'SERVICE' AND se.is_active = true
      ORDER BY
        CASE se.criticality_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        se.name
    `);
    return rows.map((r) => ({
      ...r,
      id:             String(r.id),
      entity_count:   Number(r.entity_count   ?? 0),
      relation_count: Number(r.relation_count  ?? 0),
      critical_nodes: Number(r.critical_nodes  ?? 0),
      spof_count:     Number(r.spof_count       ?? 0),
      criticality_score: r.criticality_score != null ? Number(r.criticality_score) : null,
      resilience_score:  r.resilience_score  != null ? Number(r.resilience_score)  : null,
      exposure_score:    r.exposure_score    != null ? Number(r.exposure_score)    : null,
    }));
  }

  async getEntityTypes(): Promise<EntityType[]> {
    const rows = await prisma.$queryRaw<EntityType[]>(Prisma.sql`
      SELECT id::text, code, name, description
      FROM systemic_entity_types
      WHERE is_active = true
      ORDER BY name
    `);
    return rows.map((r) => ({ ...r, id: String(r.id) }));
  }

  async getRelationTypes(): Promise<RelationType[]> {
    const rows = await prisma.$queryRaw<RelationType[]>(Prisma.sql`
      SELECT id::text, code, name, description, is_directional
      FROM systemic_relation_types
      WHERE is_active = true
      ORDER BY name
    `);
    return rows.map((r) => ({ ...r, id: String(r.id), is_directional: Boolean(r.is_directional) }));
  }

  async createEntity(input: CreateEntityInput): Promise<{ id: string }> {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO systemic_entities (entity_type_id, code, name, description, status, criticality_level)
      VALUES (
        ${input.entity_type_id}::uuid,
        ${input.code},
        ${input.name},
        ${input.description ?? null},
        ${input.status ?? 'active'},
        ${input.criticality_level ?? 'medium'}
      )
      RETURNING id::text
    `);
    return { id: String(rows[0].id) };
  }

  async createRelation(input: CreateRelationInput): Promise<{ id: string }> {
    const normalizedWeight = normalizeRelationWeight(input.weight);
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO systemic_entity_relations
        (source_entity_id, target_entity_id, relation_type_id, weight, strength, description)
      VALUES (
        ${input.source_entity_id}::uuid,
        ${input.target_entity_id}::uuid,
        ${input.relation_type_id}::uuid,
        ${normalizedWeight},
        ${input.strength ?? null},
        ${input.description ?? null}
      )
      RETURNING id::text
    `);
    return { id: String(rows[0].id) };
  }

  async deleteRelation(id: string): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE systemic_entity_relations SET is_active = false WHERE id = ${id}::uuid
    `);
  }

  async deleteEntity(id: string): Promise<void> {
    await prisma.$transaction([
      prisma.$executeRaw(Prisma.sql`
        UPDATE systemic_entity_relations
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true
          AND (source_entity_id = ${id}::uuid OR target_entity_id = ${id}::uuid)
      `),
      prisma.$executeRaw(Prisma.sql`
        UPDATE systemic_entities
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id}::uuid
      `),
    ]);
  }

  async updateEntity(id: string, input: { name?: string; description?: string | null; criticality_level?: string; status?: string }): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    if (input.name !== undefined) { setClauses.push(`name = $${values.length + 2}`); values.push(input.name); }
    if (input.description !== undefined) { setClauses.push(`description = $${values.length + 2}`); values.push(input.description); }
    if (input.criticality_level !== undefined) { setClauses.push(`criticality_level = $${values.length + 2}`); values.push(input.criticality_level); }
    if (input.status !== undefined) { setClauses.push(`status = $${values.length + 2}`); values.push(input.status); }
    if (setClauses.length === 0) return;
    setClauses.push('updated_at = NOW()');
    await prisma.$executeRawUnsafe(
      `UPDATE systemic_entities SET ${setClauses.join(', ')} WHERE id = $1::uuid AND is_active = true`,
      id, ...values,
    );
  }

  async updateRelation(id: string, input: UpdateRelationInput): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (input.source_entity_id !== undefined) {
      setClauses.push(`source_entity_id = $${values.length + 2}::uuid`);
      values.push(input.source_entity_id);
    }
    if (input.target_entity_id !== undefined) {
      setClauses.push(`target_entity_id = $${values.length + 2}::uuid`);
      values.push(input.target_entity_id);
    }
    if (input.relation_type_id !== undefined) {
      setClauses.push(`relation_type_id = $${values.length + 2}::uuid`);
      values.push(input.relation_type_id);
    }
    if (input.weight !== undefined) {
      setClauses.push(`weight = $${values.length + 2}`);
      values.push(normalizeRelationWeight(input.weight));
    }
    if (input.strength !== undefined) {
      setClauses.push(`strength = $${values.length + 2}`);
      values.push(input.strength);
    }
    if (input.description !== undefined) {
      setClauses.push(`description = $${values.length + 2}`);
      values.push(input.description);
    }

    if (setClauses.length === 0) return;

    setClauses.push('updated_at = NOW()');

    await prisma.$executeRawUnsafe(
      `UPDATE systemic_entity_relations SET ${setClauses.join(', ')} WHERE id = $1::uuid AND is_active = true`,
      id,
      ...values,
    );
  }

  async validateModel(rootEntityId: string): Promise<ValidationResult> {
    const rows = await prisma.$queryRaw<{
      entity_id: string; entity_name: string; entity_code: string;
      entity_type_code: string; has_relations: boolean; has_risks: boolean;
      has_controls: boolean; has_process: boolean;
    }[]>(Prisma.sql`
      WITH subgraph AS (
        SELECT DISTINCT e.id, e.name, e.code, et.code AS type_code
        FROM systemic_entities e
        JOIN systemic_entity_types et ON et.id = e.entity_type_id
        WHERE e.id = ${rootEntityId}::uuid OR e.id IN (
          SELECT CASE WHEN ser.source_entity_id = ${rootEntityId}::uuid
                      THEN ser.target_entity_id ELSE ser.source_entity_id END
          FROM systemic_entity_relations ser
          WHERE (ser.source_entity_id = ${rootEntityId}::uuid OR ser.target_entity_id = ${rootEntityId}::uuid)
            AND ser.is_active = true
        )
      )
      SELECT
        sg.id::text AS entity_id,
        sg.name AS entity_name,
        sg.code AS entity_code,
        sg.type_code AS entity_type_code,
        EXISTS(SELECT 1 FROM systemic_entity_relations r
          WHERE (r.source_entity_id = sg.id OR r.target_entity_id = sg.id) AND r.is_active = true
        ) AS has_relations,
        EXISTS(SELECT 1 FROM systemic_entity_relations r
          JOIN systemic_entity_types et ON et.id = (
            SELECT entity_type_id FROM systemic_entities WHERE id = r.target_entity_id)
          WHERE r.source_entity_id = sg.id AND et.code = 'RISK' AND r.is_active = true
        ) AS has_risks,
        EXISTS(SELECT 1 FROM systemic_entity_relations r
          JOIN systemic_entity_types et ON et.id = (
            SELECT entity_type_id FROM systemic_entities WHERE id = r.target_entity_id)
          WHERE r.source_entity_id = sg.id AND et.code = 'CONTROL' AND r.is_active = true
        ) AS has_controls,
        EXISTS(SELECT 1 FROM systemic_entity_relations r
          JOIN systemic_entity_types et ON et.id = (
            SELECT entity_type_id FROM systemic_entities WHERE id = r.target_entity_id)
          WHERE r.source_entity_id = sg.id AND et.code = 'PROCESS' AND r.is_active = true
        ) AS has_process
      FROM subgraph sg
    `);

    const issues: ValidationIssue[] = [];
    for (const r of rows) {
      if (!r.has_relations) {
        issues.push({ severity: 'high', entity_id: r.entity_id, entity_name: r.entity_name, entity_code: r.entity_code, issue: 'Entidad aislada sin relaciones', recommendation: 'Conectar al grafo mediante al menos una relación' });
      }
      if (r.entity_type_code === 'RISK' && !r.has_controls) {
        issues.push({ severity: 'critical', entity_id: r.entity_id, entity_name: r.entity_name, entity_code: r.entity_code, issue: 'Riesgo sin control asociado', recommendation: 'Asociar al menos un control mitigante' });
      }
      if (r.entity_type_code === 'SERVICE' && !r.has_process) {
        issues.push({ severity: 'medium', entity_id: r.entity_id, entity_name: r.entity_name, entity_code: r.entity_code, issue: 'Servicio sin proceso asociado', recommendation: 'Conectar el servicio a sus procesos operativos' });
      }
    }

    const stats = {
      total:    issues.length,
      critical: issues.filter((i) => i.severity === 'critical').length,
      high:     issues.filter((i) => i.severity === 'high').length,
      medium:   issues.filter((i) => i.severity === 'medium').length,
      low:      issues.filter((i) => i.severity === 'low').length,
    };
    return { is_valid: stats.critical === 0 && stats.high === 0, issues, stats };
  }
}
