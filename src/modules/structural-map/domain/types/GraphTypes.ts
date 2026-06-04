export type GraphEntity = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  criticality_level: string | null;
  entity_type_id: string;
  entity_type_code: string;
  entity_type_name: string;
  is_active: boolean;
  criticality_score: number | null;
  resilience_score: number | null;
  exposure_score: number | null;
  is_spof: boolean;
  is_critical_node: boolean;
  total_degree: number;
};

export type GraphRelation = {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type_id: string;
  relation_type_code: string;
  relation_type_name: string;
  weight: number | null;
  strength: string | null;
  description: string | null;
  is_directional: boolean;
};

export type SubgraphData = {
  root_entity_id: string;
  depth: number;
  entities: GraphEntity[];
  relations: GraphRelation[];
};

export type AnalysisRunResult = {
  run_id: string;
  analysis_type: string;
  status: string;
  message: string;
};

export type SimulationResult = {
  run_id: string;
  status: string;
  affected_count: number;
  max_depth: number;
  message: string;
};
