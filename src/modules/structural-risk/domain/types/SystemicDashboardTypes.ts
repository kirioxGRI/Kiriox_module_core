export type SystemicStats = {
  total_entities: number;
  total_analysis_runs: number;
  total_simulations: number;
  critical_nodes_count: number;
  spof_count: number;
};

export type SystemicAnalysisRun = {
  id: string;
  name: string;
  analysis_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type SystemicCriticalNode = {
  entity_id: string;
  code: string | null;
  name: string | null;
  entity_type_name: string;
  criticality_score: number;
  criticality_level: string | null;
  is_critical_node: boolean;
  total_degree: number;
  dependency_count: number;
  dependent_count: number;
  control_count: number;
  risk_count: number;
  cascade_exposure_score: number;
};

export type SystemicResilienceNode = {
  entity_id: string;
  code: string | null;
  name: string | null;
  entity_type_name: string;
  is_spof: boolean;
  resilience_score: number;
  resilience_level: string | null;
  fragility_score: number;
  has_resilience_gap: boolean;
  support_count: number;
  alternative_support_count: number;
};

export type SystemicExposureNode = {
  entity_id: string;
  code: string | null;
  name: string | null;
  entity_type_name: string;
  exposure_score: number;
  exposure_level: string | null;
  has_exposure_gap: boolean;
  uncontrolled_risk_count: number;
  risk_count: number;
  total_degree: number;
};

export type SystemicSimulation = {
  id: string;
  name: string;
  simulation_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  trigger_entity_name: string | null;
  trigger_entity_code: string | null;
  affected_count: number;
  max_impact_score: number;
};

export type SystemicDashboardData = {
  stats: SystemicStats;
  latest_runs: SystemicAnalysisRun[];
  critical_nodes: SystemicCriticalNode[];
  resilience_nodes: SystemicResilienceNode[];
  exposure_nodes: SystemicExposureNode[];
  recent_simulations: SystemicSimulation[];
};
