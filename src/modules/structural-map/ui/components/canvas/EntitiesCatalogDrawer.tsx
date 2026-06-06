'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, ArrowLeft, PlusCircle, Check, Pencil, Trash2 } from 'lucide-react';
import type { GraphEntity } from '@/modules/structural-map/domain/types/GraphTypes';
import type { EntityType } from '@/modules/structural-map/domain/types/PortfolioTypes';
import { resolveEntityColor, type EntityColorMap } from '@/modules/structural-map/ui/colors/entityColors';
import { CRIT_LEVELS } from '@/modules/structural-map/domain/types/ModeloTypes';
import { useDraggable } from './useDraggable';

type Props = {
  allEntities:      GraphEntity[];
  currentEntityIds: Set<string>;
  entityTypes:      EntityType[];
  colorMap:         EntityColorMap;
  onSelect:         (entity: GraphEntity) => void;
  onCreate:         (input: { entity_type_id: string; code: string; name: string; description?: string; criticality_level: string }) => Promise<void>;
  onEditSave?:      (id: string, patch: { name: string; description: string | null; criticality_level: string }) => Promise<void>;
  onDelete?:        (entityId: string) => Promise<void>;
  onClose:          () => void;
};

function generateCode(typeName: string, existingCodes: string[]): string {
  const prefix = typeName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(3, 'X');
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  const randomPart = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0').toUpperCase();
  let candidate = `${prefix}_${timePart}${randomPart}`;
  while (existingCodes.includes(candidate)) {
    const fallbackRandom = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0').toUpperCase();
    candidate = `${prefix}_${timePart}${fallbackRandom}`;
  }
  return candidate;
}

export function EntitiesCatalogDrawer({
  allEntities,
  currentEntityIds,
  entityTypes,
  colorMap,
  onSelect,
  onCreate,
  onEditSave,
  onDelete,
  onClose,
}: Props) {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [query, setQuery] = useState('');

  const W = typeof window !== 'undefined' ? Math.min(1300, window.innerWidth * 0.95) : 1300;
  const H = 390;

  const initialPos = useMemo(() => {
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth / 2, y: window.innerHeight - H - 20 };
    }
    return { x: 500, y: 400 };
  }, []);

  const { pos, startDragging } = useDraggable(initialPos, W, H, 0);
  
  // Create state
  const [typeId, setTypeId] = useState('');
  const [name, setName] = useState('');

  // Inline edit state
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; description: string; criticality_level: string } | null>(null);
  const [desc, setDesc] = useState('');
  const [crit, setCrit] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Handle ESC to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Sort and filter entities alphabetically
  const filteredEntities = useMemo(() => {
    const sorted = [...allEntities].sort((a, b) => {
      const nameA = a.name || a.code || '';
      const nameB = b.name || b.code || '';
      return nameA.localeCompare(nameB);
    });

    if (!query.trim()) return sorted;

    const lowerQuery = query.toLowerCase();
    return sorted.filter(
      (e) =>
        e.name?.toLowerCase().includes(lowerQuery) ||
        e.code.toLowerCase().includes(lowerQuery) ||
        e.entity_type_name.toLowerCase().includes(lowerQuery)
    );
  }, [allEntities, query]);

  const selectedType = entityTypes.find((t) => t.id === typeId);
  const autoCode = useMemo(() => {
    if (!selectedType) return '';
    const existing = allEntities.map(e => e.code);
    return generateCode(selectedType.code, existing);
  }, [selectedType, allEntities]);

  async function handleSaveNew() {
    if (!typeId) {
      setError('Por favor, selecciona un tipo de entidad');
      return;
    }
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate({
        entity_type_id: typeId,
        code: autoCode,
        name: name.trim(),
        description: desc.trim() || undefined,
        criticality_level: crit,
      });
      // Reset form & toggle back to list
      setTypeId('');
      setName('');
      setDesc('');
      setCrit('medium');
      setMode('list');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la entidad');
    } finally {
      setSaving(false);
    }
  }

  function handleStartInlineEdit(e: GraphEntity) {
    setEditEntityId(e.id);
    setEditForm({
      name: e.name || '',
      description: e.description || '',
      criticality_level: e.criticality_level || 'medium',
    });
  }

  async function handleSaveInline(id: string) {
    if (!editForm || !onEditSave) return;
    if (!editForm.name.trim()) {
      window.alert('El nombre es requerido');
      return;
    }
    setSaving(true);
    try {
      await onEditSave(id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        criticality_level: editForm.criticality_level,
      });
      setEditEntityId(null);
      setEditForm(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  // Styles
  const inp: React.CSSProperties = {
    width: '100%',
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#e7efff',
    fontSize: '0.82rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const lbl: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#9babc4',
    marginBottom: 4,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const tblInp: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '0.76rem',
    padding: '4px 8px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const tblSelect: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '0.74rem',
    padding: '3px 6px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto',
  };

  return (
    <div
      data-draggable-root
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: W,
        height: H,
        background: 'rgba(8, 12, 28, 0.97)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.65)',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        onPointerDown={startDragging}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(0, 0, 0, 0.2)',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {mode === 'create' ? (
            <button
              onClick={() => { setMode('list'); setError(''); }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ArrowLeft size={13} /> Volver al catálogo
            </button>
          ) : (
            <span style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 800 }}>
              Catálogo de Entidades Existentes
            </span>
          )}
          <span style={{ color: '#475569', fontSize: '0.72rem' }}>
            {mode === 'create'
              ? 'Crea una nueva entidad única'
              : `Total: ${allEntities.length} registradas en el sistema`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {mode === 'list' && (
            <button
              onClick={() => { setMode('create'); setError(''); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                background: 'linear-gradient(180deg, #1e5fd6, #1148ad)',
                color: '#fff',
                border: '1px solid #2b73ef',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={13} /> Crear Nueva Entidad
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 8,
              width: 28,
              height: 28,
              color: '#8b9ec0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        
        {/* CREATE MODE */}
        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr 2fr', gap: '1rem' }}>
              <div>
                <label style={lbl}>Tipo de Entidad *</label>
                <select value={typeId} onChange={(e) => setTypeId(e.target.value)} style={inp}>
                  <option value="">— Seleccionar —</option>
                  {entityTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Nombre de Entidad *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Servicio de Autenticación"
                  style={inp}
                />
              </div>

              <div>
                <label style={lbl}>Criticidad</label>
                <select value={crit} onChange={(e) => setCrit(e.target.value)} style={inp}>
                  {CRIT_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Descripción (opcional)</label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Ej. Orquesta el segundo factor de acceso digital"
                  style={inp}
                />
              </div>
            </div>

            {selectedType && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.65rem', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 8, alignSelf: 'flex-start', fontSize: '0.72rem' }}>
                <span style={{ color: '#64748b' }}>Código del sistema auto-generado:</span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 800 }}>{autoCode}</span>
              </div>
            )}

            {error && (
              <p style={{ margin: 0, color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => void handleSaveNew()}
                disabled={saving || !typeId || !name.trim()}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  background: 'linear-gradient(180deg, #10b981, #047857)',
                  color: '#fff',
                  border: '1px solid #10b981',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: (!typeId || !name.trim() || saving) ? 'not-allowed' : 'pointer',
                  opacity: (!typeId || !name.trim() || saving) ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {saving ? 'Guardando…' : 'Crear y Agregar'}
              </button>
              <button
                onClick={() => { setMode('list'); setError(''); }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* LIST MODE */}
        {mode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', height: '100%' }}>
            {/* Search inputs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '0.4rem 0.75rem',
                flexShrink: 0,
              }}
            >
              <Search size={14} color="#64748b" style={{ flexShrink: 0 }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar entidad en orden alfabético por nombre, código o tipo corporativo..."
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f1f5f9',
                  fontSize: '0.78rem',
                  outline: 'none',
                  flex: 1,
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Grid Table Container */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 10, background: 'rgba(0,0,0,0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#090e1f', zIndex: 10 }}>
                  <tr>
                    <th style={tableThStyle}>Nombre</th>
                    <th style={tableThStyle}>Código</th>
                    <th style={tableThStyle}>Tipo</th>
                    <th style={tableThStyle}>Criticidad</th>
                    <th style={tableThStyle}>Descripción</th>
                    <th style={{ ...tableThStyle, textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntities.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.78rem' }}>
                        No se encontraron entidades coincidentes en el catálogo.
                      </td>
                    </tr>
                  ) : (
                    filteredEntities.map((e) => {
                      const typeColor = resolveEntityColor(e.entity_type_code, colorMap);
                      const isAdded = currentEntityIds.has(e.id);
                      const isEditing = e.id === editEntityId && editForm;
                      return (
                        <tr
                          key={e.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                            background: isAdded ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                          }}
                        >
                          {isEditing ? (
                            <>
                              <td style={tableTdStyle}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      background: typeColor,
                                      display: 'inline-block',
                                      marginRight: 8,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <input
                                    value={editForm.name}
                                    onChange={(evt) => setEditForm(f => f ? { ...f, name: evt.target.value } : null)}
                                    style={tblInp}
                                    placeholder="Nombre"
                                  />
                                </div>
                              </td>
                              <td style={tableTdStyle}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b', background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: 5 }}>
                                  {e.code}
                                </span>
                              </td>
                              <td style={{ ...tableTdStyle, color: '#64748b' }}>
                                {e.entity_type_name}
                              </td>
                              <td style={tableTdStyle}>
                                <select
                                  value={editForm.criticality_level}
                                  onChange={(evt) => setEditForm(f => f ? { ...f, criticality_level: evt.target.value } : null)}
                                  style={tblSelect}
                                >
                                  {CRIT_LEVELS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={tableTdStyle}>
                                <input
                                  value={editForm.description}
                                  onChange={(evt) => setEditForm(f => f ? { ...f, description: evt.target.value } : null)}
                                  style={tblInp}
                                  placeholder="Descripción"
                                />
                              </td>
                              <td style={{ ...tableTdStyle, textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                                  <button
                                    onClick={() => void handleSaveInline(e.id)}
                                    title="Guardar"
                                    disabled={saving}
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                      color: '#10b981',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    <Check size={11} /> {saving ? '...' : 'Guardar'}
                                  </button>
                                  <button
                                    onClick={() => { setEditEntityId(null); setEditForm(null); }}
                                    title="Cancelar"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.04)',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      color: '#94a3b8',
                                      padding: '5px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ ...tableTdStyle, fontWeight: 700, color: '#f1f5f9' }}>
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: typeColor,
                                    display: 'inline-block',
                                    marginRight: 8,
                                  }}
                                />
                                {e.name ?? e.code}
                              </td>
                              <td style={tableTdStyle}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.72rem',
                                    color: '#38bdf8',
                                    background: 'rgba(56, 189, 248, 0.08)',
                                    padding: '2px 6px',
                                    borderRadius: 5,
                                  }}
                                >
                                  {e.code}
                                </span>
                              </td>
                              <td style={{ ...tableTdStyle, color: '#94a3b8' }}>
                                {e.entity_type_name}
                              </td>
                              <td style={tableTdStyle}>
                                <span
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 99,
                                    border: `1px solid ${
                                      e.criticality_level === 'critical'
                                        ? 'rgba(239, 68, 68, 0.3)'
                                        : e.criticality_level === 'high'
                                        ? 'rgba(249, 115, 22, 0.3)'
                                        : 'rgba(100, 116, 139, 0.3)'
                                    }`,
                                    color:
                                      e.criticality_level === 'critical'
                                        ? '#f87171'
                                        : e.criticality_level === 'high'
                                        ? '#fb923c'
                                        : '#94a3b8',
                                    background:
                                      e.criticality_level === 'critical'
                                        ? 'rgba(239, 68, 68, 0.08)'
                                        : e.criticality_level === 'high'
                                        ? 'rgba(249, 115, 22, 0.08)'
                                        : 'rgba(100, 116, 139, 0.08)',
                                  }}
                                >
                                  {e.criticality_level || 'medium'}
                                </span>
                              </td>
                              <td style={{ ...tableTdStyle, color: '#64748b', fontSize: '0.74rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {e.description ?? '—'}
                              </td>
                              <td style={{ ...tableTdStyle, textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                                  <button
                                    onClick={() => handleStartInlineEdit(e)}
                                    title="Editar entidad"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.04)',
                                      border: '1px solid rgba(255, 255, 255, 0.06)',
                                      color: '#94a3b8',
                                      padding: '5px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'background 0.1s',
                                    }}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={() => onDelete?.(e.id)}
                                    title="Eliminar del catálogo"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      color: '#f87171',
                                      padding: '5px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'background 0.1s',
                                    }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                  
                                  {isAdded ? (
                                    <span style={{ fontSize: '0.68rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
                                      <Check size={11} /> En lienzo
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => onSelect(e)}
                                      style={{
                                        background: 'rgba(56, 189, 248, 0.09)',
                                        border: '1px solid rgba(56, 189, 248, 0.25)',
                                        color: '#38bdf8',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        transition: 'background 0.1s',
                                      }}
                                    >
                                      <PlusCircle size={12} /> Agregar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const tableThStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '0.65rem',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
};

const tableTdStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '0.76rem',
  color: '#cbd5e1',
  verticalAlign: 'middle',
};
