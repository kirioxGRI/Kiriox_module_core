export type ElenaEngine =
  | 'structural'
  | 'criticality'
  | 'resilience'
  | 'exposure'
  | 'cascade';

export type ElenaRunInput = {
  rootEntityId: string;
  engine: ElenaEngine;
  scopeEntityIds?: string[];
  scenario?: 'FAILURE' | 'DEGRADATION' | 'COMPROMISE';
  userId?: string;
};

export type ElenaRunSummary = {
  analysisType: string;
  rootEntityName?: string;
  totalEntities: number;
  spofCount?: number;
  criticalNodeCount?: number;
  resilienceGaps?: number;
  exposureGaps?: number;
  avgScore?: number;
  maxScore?: number;
  affectedCount?: number;
  directAffected?: number;
  indirectAffected?: number;
  maxDepth?: number;
  scenario?: string;
};

export type ElenaMetricRow = {
  entity_id: string;
  entity_name: string | null;
  entity_code: string;
  entity_type_name: string;
  metric_type?: string | null;
  metric_value?: number | null;
  metric_level?: string | null;
  metric_details?: Record<string, unknown> | null;
  total_degree?: number | null;
  incoming_count?: number | null;
  outgoing_count?: number | null;
  dependency_count?: number | null;
  dependent_count?: number | null;
  is_spof?: boolean | null;
  criticality_score?: number | null;
  criticality_level?: string | null;
  is_critical_node?: boolean | null;
  risk_count?: number | null;
  control_count?: number | null;
  cascade_exposure_score?: number | null;
  resilience_score?: number | null;
  resilience_level?: string | null;
  fragility_score?: number | null;
  has_resilience_gap?: boolean | null;
  support_count?: number | null;
  alternative_support_count?: number | null;
  exposure_score?: number | null;
  exposure_level?: string | null;
  has_exposure_gap?: boolean | null;
  uncontrolled_risk_count?: number | null;
  obligation_count?: number | null;
  data_count?: number | null;
  incident_count?: number | null;
};

export type ElenaCascadeRow = {
  entity_id: string;
  entity_name: string | null;
  entity_code: string;
  entity_type_name: string;
  impact_level: string | null;
  impact_score: number;
  impact_depth: number;
  is_origin: boolean;
  impact_reason?: string | null;
  recommended_action?: string | null;
};

export type ElenaRunResult = {
  ok: boolean;
  engine: ElenaEngine;
  functionName: string;
  runId: string;
  executedAt: string;
  summary: ElenaRunSummary;
  rows: ElenaMetricRow[] | ElenaCascadeRow[];
  error?: string;
};
