/**
 * Tipos del Kiriox Structural Stress Simulator.
 *
 * La simulación nace del canvas: se ejecuta sobre el subgrafo visible
 * (scopeEntityIds) usando un nodo origen seleccionado, y proyecta el resultado
 * de `fn_elena_systemic_cascade_simulation` sobre esa misma estructura.
 */

export type NodeState = 'NORMAL' | 'VULNERABLE' | 'DEGRADED' | 'CRITICAL' | 'FAILED';

export type CascadeScenario = 'FAILURE' | 'DEGRADATION' | 'COMPROMISE';

/** Catálogo de tipos de evento del shock inicial. */
export type StressEventType =
  | 'PROVIDER_OUTAGE'
  | 'CYBER_ATTACK'
  | 'PERFORMANCE_DEGRADATION'
  | 'NATURAL_DISASTER'
  | 'KEY_PERSON_LOSS'
  | 'REGULATORY_CHANGE'
  | 'SUPPLY_CHAIN_DISRUPTION'
  | 'DATA_BREACH';

/** Cada tipo de evento determina el escenario de propagación de la función SQL. */
export const EVENT_TYPE_SCENARIO: Record<StressEventType, CascadeScenario> = {
  PROVIDER_OUTAGE:         'FAILURE',
  CYBER_ATTACK:            'COMPROMISE',
  PERFORMANCE_DEGRADATION: 'DEGRADATION',
  NATURAL_DISASTER:        'FAILURE',
  KEY_PERSON_LOSS:         'FAILURE',
  REGULATORY_CHANGE:       'DEGRADATION',
  SUPPLY_CHAIN_DISRUPTION: 'FAILURE',
  DATA_BREACH:             'COMPROMISE',
};

export const STRESS_EVENT_TYPES = Object.keys(EVENT_TYPE_SCENARIO) as StressEventType[];

/** Etiquetas legibles (ES) para la UI. */
export const EVENT_TYPE_LABELS: Record<StressEventType, string> = {
  PROVIDER_OUTAGE:         'Caída de proveedor',
  CYBER_ATTACK:            'Ciberataque',
  PERFORMANCE_DEGRADATION: 'Degradación de desempeño',
  NATURAL_DISASTER:        'Desastre natural',
  KEY_PERSON_LOSS:         'Pérdida de persona clave',
  REGULATORY_CHANGE:       'Cambio regulatorio',
  SUPPLY_CHAIN_DISRUPTION: 'Disrupción de cadena de suministro',
  DATA_BREACH:             'Brecha de datos',
};

export type StructuralStressRequest = {
  /** Id del grafo/servicio raíz mostrado en el canvas (opcional, trazabilidad). */
  graphId?: string;
  /** Nodo seleccionado en el canvas desde el que nace el shock. */
  sourceNodeId: string;
  /** Universo de simulación: ids de las entidades visibles en el canvas. */
  scopeEntityIds: string[];
  /** Severidad del shock inicial 0–100. */
  severity: number;
  /** Duración del shock en horas. */
  durationHours: number;
  /** Tipo de evento (determina el escenario). */
  eventType: StressEventType;
  /** Descripción libre del shock. */
  description?: string;
  userId?: string;
};

/** Estado resultante por nodo, proyectado sobre el grafo visible. */
export type StressNodeStateRow = {
  entityId: string;
  entityName: string | null;
  entityCode: string;
  entityTypeCode: string;
  entityTypeName: string;
  nodeState: NodeState;
  impactScore: number;
  impactDepth: number;
  isOrigin: boolean;
};

/** Nodo con mayor efecto cascada (Top 10). */
export type StressCascadeNode = {
  entityId: string;
  entityName: string | null;
  entityTypeCode: string;
  nodeState: NodeState;
  impactScore: number;
  impactDepth: number;
  /** Nº de nodos que dependen de este (palanca de cascada en el subgrafo visible). */
  dependents: number;
};

/** Ruta principal de propagación. */
export type StressCascadePath = {
  sourceEntityId: string;
  targetEntityId: string;
  targetEntityName: string | null;
  depthLevel: number;
  propagationScore: number;
  relationCode: string | null;
};

export type StressRecommendationKind = 'MITIGATION' | 'CRITICAL_DEPENDENCY' | 'SPOF';

export type StressRecommendation = {
  kind: StressRecommendationKind;
  entityId: string;
  entityName: string | null;
  entityTypeCode: string;
  /** Magnitud (palanca de mitigación, dependientes o severidad SPOF). */
  score: number;
  detail: string;
};

/** Conteo agregado de nodos afectados por categoría. */
export type AffectedEntityRef = {
  entityId: string;
  entityName: string | null;
  nodeState: NodeState;
  impactScore: number;
};

export type StructuralStressResponse = {
  ok: boolean;
  simulationId: string;
  graphId: string | null;
  sourceNodeId: string;
  scenario: CascadeScenario;
  eventType: StressEventType;
  severity: number;
  durationHours: number;
  /** KPIs principales. */
  impactedNodes: number;
  criticalNodes: number;
  fragilityScore: number;
  affectedProcesses: AffectedEntityRef[];
  affectedServices: AffectedEntityRef[];
  affectedControls: AffectedEntityRef[];
  affectedObligations: AffectedEntityRef[];
  topCascadeNodes: StressCascadeNode[];
  cascadePaths: StressCascadePath[];
  recommendations: StressRecommendation[];
  nodeStates: StressNodeStateRow[];
  executedAt: string;
  error?: string;
};

/** Color por estado para el coloreo del canvas y leyendas. NORMAL = sin override. */
export const NODE_STATE_COLORS: Record<Exclude<NodeState, 'NORMAL'>, string> = {
  FAILED:     '#7f1d1d',
  CRITICAL:   '#ef4444',
  DEGRADED:   '#fb923c',
  VULNERABLE: '#fbbf24',
};

export const NODE_STATE_LABELS: Record<NodeState, string> = {
  NORMAL:     'Normal',
  VULNERABLE: 'Vulnerable',
  DEGRADED:   'Degradado',
  CRITICAL:   'Crítico',
  FAILED:     'Caído',
};
