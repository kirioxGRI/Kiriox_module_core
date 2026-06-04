export type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low' | null;

export type ServiceSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  criticality_level: CriticalityLevel;
  entity_count: number;
  relation_count: number;
  critical_nodes: number;
  spof_count: number;
  last_analysis_at: string | null;
  last_analysis_type: string | null;
  criticality_score: number | null;
  resilience_score: number | null;
  exposure_score: number | null;
};

export type EntityType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type RelationType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_directional: boolean;
};

export type CreateEntityInput = {
  entity_type_id: string;
  code: string;
  name: string;
  description?: string;
  status?: string;
  criticality_level?: string;
};

export type CreateRelationInput = {
  source_entity_id: string;
  target_entity_id: string;
  relation_type_id: string;
  weight?: number;
  strength?: string;
  description?: string;
};

export type ValidationIssue = {
  severity: 'critical' | 'high' | 'medium' | 'low';
  entity_id: string | null;
  entity_name: string | null;
  entity_code: string | null;
  issue: string;
  recommendation: string;
};

export type ValidationResult = {
  is_valid: boolean;
  issues: ValidationIssue[];
  stats: { total: number; critical: number; high: number; medium: number; low: number };
};
