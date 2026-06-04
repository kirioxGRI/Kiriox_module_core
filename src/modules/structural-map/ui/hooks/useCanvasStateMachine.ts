'use client';

import { useReducer, useCallback } from 'react';
import type { CanvasState, CanvasAction, ScreenPos, GraphPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { INITIAL_CANVAS_STATE } from '@/modules/structural-map/domain/types/ModeloTypes';

function reducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SELECT_NODE':
      return { ...state, mode: 'node_selected', selectedNodeId: action.nodeId, selectedEdgeId: null, pendingSourceId: null, nodeRenderedPos: action.renderedPos };

    case 'DESELECT':
      return { ...state, mode: 'idle', selectedNodeId: null, selectedEdgeId: null, nodeRenderedPos: null };

    case 'START_CREATE_ENTITY':
      return { ...state, mode: 'creating_entity', selectedNodeId: null, selectedEdgeId: null, clickScreenPos: action.screenPos, clickGraphPos: action.graphPos };

    case 'CANCEL_CREATE_ENTITY':
      return { ...state, mode: 'idle', clickScreenPos: null, clickGraphPos: null };

    case 'START_CREATE_RELATION':
      return { ...state, mode: 'creating_relation', pendingSourceId: action.sourceId };

    case 'SET_PENDING_TARGET':
      return { ...state, mode: 'editing_relation' };

    case 'CANCEL_RELATION':
      return { ...state, mode: state.selectedNodeId ? 'node_selected' : 'idle', pendingSourceId: null };

    case 'SELECT_EDGE':
      return { ...state, mode: 'editing_relation', selectedEdgeId: action.edgeId, selectedNodeId: null, nodeRenderedPos: null };

    case 'DESELECT_EDGE':
      return { ...state, mode: 'idle', selectedEdgeId: null };

    case 'START_DRAG':
      return { ...state, mode: 'dragging_node', selectedNodeId: action.nodeId };

    case 'END_DRAG':
      return { ...state, mode: 'node_selected' };

    case 'UPDATE_MOUSE':
      return { ...state, mousePos: action.pos };

    case 'UPDATE_NODE_POS':
      return { ...state, nodeRenderedPos: action.renderedPos };

    case 'ESCAPE': {
      if (state.mode === 'idle') return state;
      return { ...INITIAL_CANVAS_STATE, isDirty: state.isDirty };
    }

    case 'MARK_DIRTY':  return { ...state, isDirty: true };
    case 'MARK_CLEAN':  return { ...state, isDirty: false };

    default: return state;
  }
}

export function useCanvasStateMachine() {
  const [state, dispatch] = useReducer(reducer, INITIAL_CANVAS_STATE);

  const selectNode       = useCallback((nodeId: string, renderedPos: ScreenPos) => dispatch({ type: 'SELECT_NODE', nodeId, renderedPos }), []);
  const deselect         = useCallback(() => dispatch({ type: 'DESELECT' }), []);
  const startCreateEntity = useCallback((screenPos: ScreenPos, graphPos: GraphPos) => dispatch({ type: 'START_CREATE_ENTITY', screenPos, graphPos }), []);
  const cancelCreateEntity = useCallback(() => dispatch({ type: 'CANCEL_CREATE_ENTITY' }), []);
  const startCreateRelation = useCallback((sourceId: string) => dispatch({ type: 'START_CREATE_RELATION', sourceId }), []);
  const setPendingTarget = useCallback(() => dispatch({ type: 'SET_PENDING_TARGET', targetId: '' }), []);
  const cancelRelation   = useCallback(() => dispatch({ type: 'CANCEL_RELATION' }), []);
  const selectEdge       = useCallback((edgeId: string) => dispatch({ type: 'SELECT_EDGE', edgeId }), []);
  const deselectEdge     = useCallback(() => dispatch({ type: 'DESELECT_EDGE' }), []);
  const startDrag        = useCallback((nodeId: string) => dispatch({ type: 'START_DRAG', nodeId }), []);
  const endDrag          = useCallback(() => dispatch({ type: 'END_DRAG' }), []);
  const updateMouse      = useCallback((pos: ScreenPos) => dispatch({ type: 'UPDATE_MOUSE', pos }), []);
  const updateNodePos    = useCallback((renderedPos: ScreenPos) => dispatch({ type: 'UPDATE_NODE_POS', renderedPos }), []);
  const escape           = useCallback(() => dispatch({ type: 'ESCAPE' }), []);
  const markDirty        = useCallback(() => dispatch({ type: 'MARK_DIRTY' }), []);
  const markClean        = useCallback(() => dispatch({ type: 'MARK_CLEAN' }), []);

  return {
    state, dispatch,
    selectNode, deselect, startCreateEntity, cancelCreateEntity,
    startCreateRelation, setPendingTarget, cancelRelation,
    selectEdge, deselectEdge, startDrag, endDrag,
    updateMouse, updateNodePos, escape, markDirty, markClean,
  };
}
