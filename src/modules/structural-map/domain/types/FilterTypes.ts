import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';

export type FilterGroupCode = 'view_selector' | 'depth' | 'criticality' | 'mode' | string;

export type StructuralMapFilterOption = {
  id: string;
  group_id: string;
  code: string;
  label: string;
  value: string;
  sort_order: number;
  is_default: boolean;
};

export type StructuralMapFilterGroup = {
  id: string;
  code: FilterGroupCode;
  name: string;
  sort_order: number;
  options: StructuralMapFilterOption[];
};

export type StructuralMapViewRule = {
  id: string;
  view_code: string;
  name: string;
  default_depth: number;
  allowed_entity_type_codes: string[];
  allowed_relation_type_codes: string[];
  criticality_filter: string[];
  layout_strategy: string | null;
};

export type StructuralMapViewPreference = {
  entity_id: string;
  default_view_code: string;
  default_depth: number;
  default_mode: string;
};

export type StructuralMapFilterConfig = {
  groups: StructuralMapFilterGroup[];
  viewRules: StructuralMapViewRule[];
  preference: StructuralMapViewPreference | null;
};

export type StructuralMapFilterSelection = {
  viewCode: string;
  depth: number | null;
  mode: string | null;
  criticalityCodes: string[];
};

export type StructuralMapFilterPreferenceInput = {
  entityId: string;
  defaultViewCode: string;
  defaultDepth: number;
  defaultMode: string;
};

export type StructuralMapFilterView = {
  entities: GraphEntity[];
  relations: GraphRelation[];
  layoutStrategy: string | null;
};
