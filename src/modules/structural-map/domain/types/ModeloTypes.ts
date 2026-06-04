export type CanvasMode =
  | 'idle'
  | 'node_selected'
  | 'creating_entity'
  | 'creating_relation'
  | 'editing_relation'
  | 'dragging_node'
  | 'panning_canvas';

export type ScreenPos  = { x: number; y: number };
export type GraphPos   = { x: number; y: number };

export type CanvasState = {
  mode:                CanvasMode;
  selectedNodeId:      string | null;
  selectedEdgeId:      string | null;
  pendingSourceId:     string | null;
  clickScreenPos:      ScreenPos | null;
  clickGraphPos:       GraphPos | null;
  nodeRenderedPos:     ScreenPos | null;
  mousePos:            ScreenPos | null;
  isDirty:             boolean;
};

export type CanvasAction =
  | { type: 'SELECT_NODE'; nodeId: string; renderedPos: ScreenPos }
  | { type: 'DESELECT' }
  | { type: 'START_CREATE_ENTITY'; screenPos: ScreenPos; graphPos: GraphPos }
  | { type: 'CANCEL_CREATE_ENTITY' }
  | { type: 'START_CREATE_RELATION'; sourceId: string }
  | { type: 'SET_PENDING_TARGET'; targetId: string }
  | { type: 'CANCEL_RELATION' }
  | { type: 'SELECT_EDGE'; edgeId: string }
  | { type: 'DESELECT_EDGE' }
  | { type: 'START_DRAG'; nodeId: string }
  | { type: 'END_DRAG' }
  | { type: 'UPDATE_MOUSE'; pos: ScreenPos }
  | { type: 'UPDATE_NODE_POS'; renderedPos: ScreenPos }
  | { type: 'ESCAPE' }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' };

export const INITIAL_CANVAS_STATE: CanvasState = {
  mode:            'idle',
  selectedNodeId:  null,
  selectedEdgeId:  null,
  pendingSourceId: null,
  clickScreenPos:  null,
  clickGraphPos:   null,
  nodeRenderedPos: null,
  mousePos:        null,
  isDirty:         false,
};

export const STRENGTH_OPTIONS = ['weak', 'medium', 'strong', 'critical'] as const;
export type StrengthLevel = (typeof STRENGTH_OPTIONS)[number];

export const STRENGTH_STYLE: Record<StrengthLevel, { color: string; width: number; label: string }> = {
  weak:     { color: '#ffffff', width: 1,   label: 'Débil' },
  medium:   { color: '#22c55e', width: 2,   label: 'Media' },
  strong:   { color: '#fbbf24', width: 3.5, label: 'Fuerte' },
  critical: { color: '#f87171', width: 5,   label: 'Crítica' },
};

export const CRIT_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
