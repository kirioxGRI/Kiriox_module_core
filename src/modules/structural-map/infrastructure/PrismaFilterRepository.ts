import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type {
  StructuralMapFilterConfig,
  StructuralMapFilterGroup,
  StructuralMapFilterOption,
  StructuralMapFilterPreferenceInput,
  StructuralMapViewPreference,
  StructuralMapViewRule,
} from '@/modules/structural-map/domain/types/FilterTypes';

type FilterGroupRow = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
};

type FilterOptionRow = {
  id: string;
  group_id: string;
  code: string;
  label: string;
  value: string;
  sort_order: number;
  is_default: boolean;
};

type ViewRuleRow = {
  id: string;
  view_code: string;
  name: string;
  default_depth: number | null;
  allowed_entity_type_codes: string[] | null;
  allowed_relation_type_codes: string[] | null;
  criticality_filter: string[] | null;
  layout_strategy: string | null;
};

type PreferenceRow = {
  entity_id: string;
  default_view_code: string;
  default_depth: number;
  default_mode: string;
};

export class PrismaFilterRepository {
  async getFilterConfig(entityId?: string | null): Promise<StructuralMapFilterConfig> {
    const [groups, options, viewRules, preference] = await Promise.all([
      this.getGroups(),
      this.getOptions(),
      this.getViewRules(),
      entityId ? this.getPreference(entityId) : Promise.resolve<StructuralMapViewPreference | null>(null),
    ]);

    const optionsByGroup = new Map<string, StructuralMapFilterOption[]>();
    for (const option of options) {
      const existing = optionsByGroup.get(option.group_id) ?? [];
      existing.push(option);
      optionsByGroup.set(option.group_id, existing);
    }

    const hydratedGroups: StructuralMapFilterGroup[] = groups.map((group) => ({
      ...group,
      options: (optionsByGroup.get(group.id) ?? []).sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    }));

    return {
      groups: hydratedGroups,
      viewRules,
      preference,
    };
  }

  async savePreference(input: StructuralMapFilterPreferenceInput): Promise<StructuralMapViewPreference> {
    const rows = await prisma.$queryRaw<PreferenceRow[]>(Prisma.sql`
      INSERT INTO public.systemic_filter_view_preferences (
        entity_id,
        default_view_code,
        default_depth,
        default_mode,
        created_at,
        updated_at
      ) VALUES (
        ${input.entityId}::uuid,
        ${input.defaultViewCode},
        ${input.defaultDepth},
        ${input.defaultMode},
        now(),
        now()
      )
      ON CONFLICT (entity_id) DO UPDATE
      SET
        default_view_code = EXCLUDED.default_view_code,
        default_depth = EXCLUDED.default_depth,
        default_mode = EXCLUDED.default_mode,
        updated_at = now()
      RETURNING
        entity_id::text,
        default_view_code,
        default_depth,
        default_mode
    `);

    const row = rows[0];
    if (!row) {
      throw new Error('No fue posible guardar la preferencia de filtros');
    }

    return {
      entity_id: String(row.entity_id),
      default_view_code: row.default_view_code,
      default_depth: Number(row.default_depth),
      default_mode: row.default_mode,
    };
  }

  private async getGroups(): Promise<StructuralMapFilterGroup[]> {
    const rows = await prisma.$queryRaw<FilterGroupRow[]>(Prisma.sql`
      SELECT
        id::text,
        code,
        name,
        sort_order
      FROM public.systemic_filter_groups
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `);

    return rows.map((row) => ({
      ...row,
      id: String(row.id),
      sort_order: Number(row.sort_order),
      options: [],
    }));
  }

  private async getOptions(): Promise<StructuralMapFilterOption[]> {
    const rows = await prisma.$queryRaw<FilterOptionRow[]>(Prisma.sql`
      SELECT
        id::text,
        group_id::text,
        code,
        label,
        value,
        sort_order,
        is_default
      FROM public.systemic_filter_options
      WHERE is_active = true
      ORDER BY sort_order ASC, label ASC
    `);

    return rows.map((row) => ({
      ...row,
      id: String(row.id),
      group_id: String(row.group_id),
      sort_order: Number(row.sort_order),
      is_default: Boolean(row.is_default),
    }));
  }

  private async getViewRules(): Promise<StructuralMapViewRule[]> {
    const rows = await prisma.$queryRaw<ViewRuleRow[]>(Prisma.sql`
      SELECT
        id::text,
        view_code,
        name,
        default_depth,
        allowed_entity_type_codes,
        allowed_relation_type_codes,
        criticality_filter,
        layout_strategy
      FROM public.systemic_filter_view_rules
      WHERE is_active = true
      ORDER BY name ASC
    `);

    return rows.map((row) => ({
      id: String(row.id),
      view_code: row.view_code,
      name: row.name,
      default_depth: Number(row.default_depth ?? 2),
      allowed_entity_type_codes: Array.isArray(row.allowed_entity_type_codes) ? row.allowed_entity_type_codes : [],
      allowed_relation_type_codes: Array.isArray(row.allowed_relation_type_codes) ? row.allowed_relation_type_codes : [],
      criticality_filter: Array.isArray(row.criticality_filter) ? row.criticality_filter : [],
      layout_strategy: row.layout_strategy,
    }));
  }

  private async getPreference(entityId: string): Promise<StructuralMapViewPreference | null> {
    const rows = await prisma.$queryRaw<PreferenceRow[]>(Prisma.sql`
      SELECT
        entity_id::text,
        default_view_code,
        default_depth,
        default_mode
      FROM public.systemic_filter_view_preferences
      WHERE entity_id = ${entityId}::uuid
      LIMIT 1
    `);

    const row = rows[0];
    if (!row) return null;

    return {
      entity_id: String(row.entity_id),
      default_view_code: row.default_view_code,
      default_depth: Number(row.default_depth),
      default_mode: row.default_mode,
    };
  }
}
