import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';

export type FullGraph = { entities: GraphEntity[]; relations: GraphRelation[] };

export class PrismaModeloRepository {
  async getFullGraph(): Promise<FullGraph> {
    const [entities, relations] = await Promise.all([
      this.getAllEntities(),
      this.getAllRelations(),
    ]);
    return { entities, relations };
  }

  private async getAllEntities(): Promise<GraphEntity[]> {
    const rows = await prisma.$queryRaw<GraphEntity[]>(Prisma.sql`
      SELECT
        se.id::text,
        se.code,
        se.name,
        se.description,
        se.status,
        se.criticality_level,
        se.entity_type_id::text,
        et.code  AS entity_type_code,
        et.name  AS entity_type_name,
        se.is_active,
        lm.criticality_score::float,
        lm.resilience_score::float,
        lm.exposure_score::float,
        COALESCE(lm.is_spof, false)          AS is_spof,
        COALESCE(lm.is_critical_node, false) AS is_critical_node,
        COALESCE(lm.total_degree, 0)::int    AS total_degree
      FROM systemic_entities se
      JOIN systemic_entity_types et ON et.id = se.entity_type_id
      LEFT JOIN LATERAL (
        SELECT criticality_score, resilience_score, exposure_score,
               is_spof, is_critical_node, total_degree
        FROM systemic_structural_metrics ssm
        WHERE ssm.entity_id = se.id
        ORDER BY ssm.created_at DESC LIMIT 1
      ) lm ON true
      WHERE se.is_active = true
      ORDER BY se.name
    `);
    return rows.map((r) => ({
      ...r,
      id:               String(r.id),
      entity_type_id:   String(r.entity_type_id),
      is_active:        Boolean(r.is_active),
      is_spof:          Boolean(r.is_spof),
      is_critical_node: Boolean(r.is_critical_node),
      total_degree:     Number(r.total_degree ?? 0),
      criticality_score: r.criticality_score != null ? Number(r.criticality_score) : null,
      resilience_score:  r.resilience_score  != null ? Number(r.resilience_score)  : null,
      exposure_score:    r.exposure_score    != null ? Number(r.exposure_score)    : null,
    }));
  }

  private async getAllRelations(): Promise<GraphRelation[]> {
    const rows = await prisma.$queryRaw<GraphRelation[]>(Prisma.sql`
      SELECT
        ser.id::text,
        ser.source_entity_id::text,
        ser.target_entity_id::text,
        ser.relation_type_id::text,
        rt.code AS relation_type_code,
        rt.name AS relation_type_name,
        ser.weight::float,
        ser.strength,
        ser.description,
        rt.is_directional
      FROM systemic_entity_relations ser
      JOIN systemic_relation_types rt ON rt.id = ser.relation_type_id
      WHERE ser.is_active = true
      ORDER BY ser.created_at DESC
    `);
    return rows.map((r) => ({
      ...r,
      id:               String(r.id),
      source_entity_id: String(r.source_entity_id),
      target_entity_id: String(r.target_entity_id),
      relation_type_id: String(r.relation_type_id),
      is_directional:   Boolean(r.is_directional),
      weight:           r.weight != null ? Number(r.weight) : null,
    }));
  }
}
