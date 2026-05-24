'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, BriefcaseBusiness, Calendar, Cpu, Eye, EyeOff, FileText, FolderOpen, Info, Link2, Loader2, Plus, Save, ShieldCheck, ShieldPlus, Trash2, Upload, X } from 'lucide-react';
import { CARD, ErrorAlert, extractError, INPUT_S, LoaderSection, SECTION_HDR } from './ContextWizardShared';
import { HeatMapModal } from './StepAnalisisControlHeatMap';

export function StepAnalisisControl({ runRaId }: { runRaId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [controls, setControls] = useState<any[]>([]);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [controlTypes, setControlTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [controlNatures, setControlNatures] = useState<Array<{ id: string; name: string }>>([]);
  const [controlFrequencies, setControlFrequencies] = useState<Array<{ id: string; name: string }>>([]);
  const [controlEffectiveness, setControlEffectiveness] = useState<Array<{ id: string; value: number; code: string | null; name: string }>>([]);
  const [controlCoverage, setControlCoverage] = useState<Array<{ id: string; value: number; code: string | null; name: string }>>([]);
  const [justification, setJustification] = useState('');
  const [selectedControlEv, setSelectedControlEv] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loadingEvidences, setLoadingEvidences] = useState(false);

  async function loadEvidences(riskId: string, controlId: string) {
    if (!runRaId || !riskId || !controlId) return;
    setLoadingEvidences(true);
    try {
      const qs = new URLSearchParams({ runRaId, riskId, controlId });
      const res = await fetch(`/api/linear-risk/evidence/upload?${qs.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { evidences: any[] };
        setEvidenceList(data.evidences ?? []);
      }
    } finally {
      setLoadingEvidences(false);
    }
  }
  async function load(riskId?: string) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ runRaId });
      if (riskId) qs.set('riskId', riskId);
      const res = await fetch(`/api/linear-risk/control-analysis?${qs.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, `HTTP ${res.status}`));
      setRisks(data.risks ?? []);
      setCurrent(data.current ?? null);
      setControls(data.controls ?? []);
      setOwners(data.catalogs?.owners ?? []);
      setControlTypes(data.catalogs?.control_types ?? []);
      setControlNatures(data.catalogs?.control_natures ?? []);
      setControlFrequencies(data.catalogs?.control_frequencies ?? []);
      setControlEffectiveness(data.catalogs?.control_effectiveness ?? []);
      setControlCoverage(data.catalogs?.control_coverage ?? []);
      setJustification(data.current?.residual_justification ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar análisis de controles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [runRaId]);

  const selectedIndex = Math.max(0, risks.findIndex((r) => r.id === current?.id));
  const total = risks.length;

  const impactResidual = current?.residual_impact ?? '-';
  const probResidual = current?.residual_probability ?? '-';
  const residualScore = current?.residual_risk_score ?? '-';
  const riskLevelLabel = Number(residualScore) >= 12 ? 'Alto' : Number(residualScore) >= 6 ? 'Medio' : 'Bajo';

  async function handleSave(nextRiskId?: string) {
    if (!current?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/linear-risk/control-analysis', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runRaId,
          riskId: current.id,
          residualJustification: justification,
          controls: controls.map((c: any) => ({
            control_id: c.control_id,
            name: c.name,
            control_type: c.control_type,
            control_nature: c.control_nature,
            owner_id: c.owner_id,
            frequency: c.frequency,
            design: c.design,
            implementation: c.implementation,
            operation: c.operation,
            cobertura: c.cobertura,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, `HTTP ${res.status}`));
      
      if (nextRiskId) {
        await load(nextRiskId);
      } else {
        await load(current.id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddControl() {
    if (!current?.id) return;

    setSaving(true);
    try {
      const defaultType = controlTypes[0]?.id ?? '';
      const defaultNature = controlNatures[0]?.id ?? '';
      const defaultFrequency = controlFrequencies[0]?.id ?? '';
      if (!defaultType) {
        throw new Error('No hay catálogo de tipo de control disponible.');
      }
      const res = await fetch('/api/linear-risk/control-analysis', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_control',
          runRaId,
          riskId: current.id,
          control_name: `Nuevo control ${String(Date.now()).slice(-5)}`,
          control_type: defaultType,
          control_description: '',
          control_nature: defaultNature || null,
          owner_id: owners[0]?.id ?? null,
          frequency: defaultFrequency || null,
          source_control_id: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, `HTTP ${res.status}`));
      await load(current.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar el control.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteControl(controlId: string) {
    if (!current?.id) return;
    setSaving(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ runRaId, riskId: current.id, controlId });
      const res = await fetch(`/api/linear-risk/control-analysis?${qs.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, `HTTP ${res.status}`));
      await load(current.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el control.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoaderSection />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%' }}>
      {error && <ErrorAlert message={error} />}
      <div style={{ ...CARD, padding: '1.1rem 1.4rem', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1.08rem', color: '#f1f5f9' }}>Riesgos evaluados</p>
          <p style={{ margin: '0.18rem 0 0', fontSize: '0.73rem', color: '#64748b' }}>Resumen del riesgo seleccionado y su evaluación actual.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.5fr 0.85fr auto', gap: '1.1rem', alignItems: 'center' }}>
          {/* Col 1: risk identity */}
          <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.28rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.76rem', fontWeight: 700 }}>Riesgo actual</span>
              <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: 999, padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>{selectedIndex + 1} de {total}</span>
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem', marginBottom: '0.45rem', lineHeight: 1.3 }}>
              {current?.name || current?.event || 'Sin nombre'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 0.9rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', color: '#94a3b8', fontSize: '0.71rem' }}>
                <BriefcaseBusiness size={11} /> Categoría: <strong style={{ color: '#cbd5e1' }}>{current?.risk_category || '-'}</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', color: '#94a3b8', fontSize: '0.71rem' }}>
                <AlertCircle size={11} /> Evento: <strong style={{ color: '#cbd5e1' }}>{current?.event || '-'}</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', color: '#94a3b8', fontSize: '0.71rem' }}>
                <Cpu size={11} /> Causa: <strong style={{ color: '#cbd5e1' }}>{current?.cause || '-'}</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', color: '#94a3b8', fontSize: '0.71rem' }}>
                <FileText size={11} /> Consecuencia: <strong style={{ color: '#cbd5e1' }}>{current?.consequence || '-'}</strong>
              </span>
            </div>
          </div>

          {/* Col 2: inherent risk + matrix */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.45rem' }}>
                  <span style={{ color: '#e2e8f0', fontSize: '0.76rem', fontWeight: 700 }}>Nivel de riesgo inherente</span>
                  <Info size={13} style={{ color: '#64748b' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  {(() => {
                    const iScore = Number(current?.inherent_risk_score ?? 0);
                    const label = current?.inherent_level_name || 'Sin nivel';
                    const levelColor = String(current?.inherent_level_color || '#94a3b8');
                    const rgb = levelColor.startsWith('#') && levelColor.length === 7
                      ? `${parseInt(levelColor.slice(1, 3), 16)}, ${parseInt(levelColor.slice(3, 5), 16)}, ${parseInt(levelColor.slice(5, 7), 16)}`
                      : '148, 163, 184';
                    const badgeColor = { bg: `rgba(${rgb},0.18)`, bd: `rgba(${rgb},0.45)`, tx: levelColor };
                    const impCol = Math.min(3, Math.max(0, Math.round(Number(current?.impact_score ?? 2)) - 1));
                    const probRow = Math.min(3, Math.max(0, Math.round(Number(current?.probability_score ?? 2)) - 1));
                    const ROW_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#ef4444'];
                    return (
                      <>
                        <span style={{ background: badgeColor.bg, border: `1px solid ${badgeColor.bd}`, color: badgeColor.tx, borderRadius: 999, padding: '0.22rem 0.65rem', fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ↗ {label}
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 20px)', gap: 3 }}>
                          {Array.from({ length: 16 }).map((_, i) => {
                            const col = i % 4;
                            const row = Math.floor(i / 4);
                            const isDot = row === probRow && col === impCol;
                            return (
                              <div key={i} style={{ width: 20, height: 20, borderRadius: 3, background: ROW_COLORS[row], opacity: 0.88, outline: isDot ? '2px solid #fff' : 'none', outlineOffset: -1 }} />
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div style={{ 
                borderLeft: '1px solid rgba(255,255,255,0.1)', 
                paddingLeft: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <span style={{ 
                  color: '#94a3b8', 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  display: 'block', 
                  textTransform: 'uppercase', 
                  marginBottom: '0.4rem', 
                  letterSpacing: '0.05em',
                  opacity: 0.8
                }}>
                  Total riesgo inherente
                </span>
                <div style={{
                  position: 'relative',
                  padding: '0.2rem 1.2rem',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  boxShadow: '0 0 25px rgba(239, 68, 68, 0.1)'
                }}>
                  <span style={{ 
                    color: '#fff', 
                    fontSize: '2.6rem', 
                    fontWeight: 900, 
                    lineHeight: 1, 
                    background: 'linear-gradient(135deg, #fff 0%, #fca5a5 50%, #ef4444 100%)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.4))'
                  }}>
                    {current?.inherent_risk_score ?? '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: date */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.71rem', marginBottom: '0.3rem' }}>
              <Calendar size={13} /> Fecha de evaluación
            </div>
            <div style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 700 }}>{new Date().toLocaleDateString('es-DO')}</div>
            <div style={{ color: '#475569', fontSize: '0.67rem', marginTop: 2 }}>dd/mm/aaaa</div>
          </div>

          {/* Col 4: nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.1rem' }}>
            <button type="button" title="Anterior" disabled={selectedIndex <= 0 || saving} onClick={() => void load(risks[selectedIndex - 1]?.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.65rem', borderRadius: 12,
              background: selectedIndex <= 0 ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: `1px solid ${selectedIndex <= 0 ? 'rgba(255,255,255,0.05)' : 'rgba(16,185,129,0.35)'}`,
              color: selectedIndex <= 0 ? '#1e2d4d' : '#fff', 
              cursor: selectedIndex <= 0 ? 'not-allowed' : 'pointer', minWidth: 64, minHeight: 48,
              boxShadow: selectedIndex <= 0 ? 'none' : '0 4px 12px rgba(16,185,129,0.2)',
            }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>&lt;&lt;</span>
            </button>
            <button type="button" title="Siguiente" disabled={selectedIndex >= total - 1 || saving} onClick={() => void handleSave(risks[selectedIndex + 1]?.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.65rem', borderRadius: 12,
              background: selectedIndex >= total - 1 ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: `1px solid ${selectedIndex >= total - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(16,185,129,0.35)'}`,
              color: selectedIndex >= total - 1 ? '#1e2d4d' : '#fff',
              cursor: (selectedIndex >= total - 1 || saving) ? 'not-allowed' : 'pointer', minWidth: 64, minHeight: 48,
              boxShadow: (selectedIndex >= total - 1 || saving) ? 'none' : '0 4px 12px rgba(16,185,129,0.2)',
            }}>
              {saving ? <Loader2 size={20} className="animate-spin" /> : <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>&gt;&gt;</span>}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem', alignItems: 'stretch', width: '100%' }}>
        <section
          style={{
            ...CARD,
            padding: '1rem',
            borderTop: '3px solid #3b82f6',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.24)',
          }}
        >
          <p style={{ ...SECTION_HDR, marginBottom: '0.55rem' }}>Controles mitigantes del riesgo</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.12fr 0.58fr 0.78fr 0.58fr 0.7fr 0.7fr 0.7fr 0.6fr 0.6fr 0.7fr 0.35fr 0.35fr', gap: '0.45rem', alignItems: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700 }}>CONTROL</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700 }}>TIPO</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700 }}>RESPONSABLE</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700 }}>FRECUENCIA</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700 }}>DISEÑO</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700 }}>IMPLEMENT.</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700 }}>OPERACIÓN</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700 }}>COBERTURA</div>
            <div style={{ color: '#10b981', fontSize: '0.67rem', fontWeight: 800 }}>EFECTIVIDAD</div>
            <div style={{ color: '#fca5a5', fontSize: '0.67rem', fontWeight: 800 }}>BCE. RESIDUAL</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textAlign: 'center' }}>ACC.</div>
            <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textAlign: 'center' }}>EV.</div>
            {controls.map((c: any) => (
              <React.Fragment key={c.control_id}>
                <div>
                  <input
                    style={{ ...INPUT_S, padding: '0.42rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}
                    value={c.name || ''}
                    onChange={(e) => setControls((prev) => prev.map((x) => x.control_id === c.control_id ? { ...x, name: e.target.value } : x))}
                    placeholder="Nombre del control..."
                  />

                </div>
                
                <select 
                  value={c.control_type || ''} 
                  onChange={(e) => setControls((prev) => prev.map((x) => x.control_id === c.control_id ? { ...x, control_type: e.target.value } : x))}
                  style={{ ...INPUT_S, padding: '0.42rem 0.4rem', fontSize: '0.72rem' }}
                >
                  <option value="">- Seleccionar -</option>
                  {controlTypes.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>

                <select 
                  value={c.owner_id || ''} 
                  onChange={(e) => setControls((prev) => prev.map((x) => x.control_id === c.control_id ? { ...x, owner_id: e.target.value } : x))}
                  style={{ ...INPUT_S, padding: '0.42rem 0.4rem', fontSize: '0.72rem' }}
                >
                  <option value="">- Seleccionar -</option>
                  {owners.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>

                <select 
                  value={c.frequency || ''} 
                  onChange={(e) => setControls((prev) => prev.map((x) => x.control_id === c.control_id ? { ...x, frequency: e.target.value } : x))}
                  style={{ ...INPUT_S, padding: '0.42rem 0.4rem', fontSize: '0.72rem' }}
                >
                  <option value="">- Seleccionar -</option>
                  {controlFrequencies.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>

                {(['design', 'implementation', 'operation'] as const).map((k) => (
                  <select key={k} value={String(c[k] ?? 3)} onChange={(e) => setControls((prev) => prev.map((x) => x.control_id === c.control_id ? { ...x, [k]: Number(e.target.value) } : x))} style={{ ...INPUT_S, width: '100%', padding: '0.42rem 0.4rem', fontSize: '0.72rem' }}>
                    {controlEffectiveness.map((op: any) => <option key={`${k}-${op.id}`} value={op.value}>{`${op.name} (${op.value})`}</option>)}
                  </select>
                ))}
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={c.cobertura ?? 75}
                  onChange={(e) => setControls((prev) => prev.map((x) => x.control_id === c.control_id ? { ...x, cobertura: Number(e.target.value) } : x))}
                  style={{ ...INPUT_S, padding: '0.42rem 0.4rem', fontSize: '0.72rem', textAlign: 'center' }}
                />
                <div style={{ 
                  background: 'rgba(16,185,129,0.1)', 
                  border: '1px solid rgba(16,185,129,0.2)', 
                  borderRadius: 6, 
                  padding: '0.42rem 0.4rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 800, 
                  color: '#10b981', 
                  textAlign: 'center' 
                }}>
                  {(() => {
                    const internalEff = (
                      (Number(c.design ?? 3) / 5 * 0.35) + 
                      (Number(c.implementation ?? 3) / 5 * 0.30) + 
                      (Number(c.operation ?? 3) / 5 * 0.35)
                    );
                    const finalEff = internalEff * (Number(c.cobertura ?? 75) / 100);
                    return `${(finalEff * 100).toFixed(1)}%`;
                  })()}
                </div>

                <div style={{ 
                  background: 'rgba(252,165,165,0.05)', 
                  border: '1px solid rgba(252,165,165,0.15)', 
                  borderRadius: 6, 
                  padding: '0.42rem 0.4rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 800, 
                  color: '#fca5a5', 
                  textAlign: 'center' 
                }}>
                  {(() => {
                    const inherent = Number(current?.inherent_risk_score ?? 0);
                    let runningBalance = inherent;
                    
                    // Encontrar el índice actual para el acumulado aditivo
                    const idx = controls.findIndex(x => x.control_id === c.control_id);
                    for (let i = 0; i <= idx; i++) {
                      const ctrl = controls[i];
                      const internalEff = (
                        (Number(ctrl.design ?? 3) / 5 * 0.35) + 
                        (Number(ctrl.implementation ?? 3) / 5 * 0.30) + 
                        (Number(ctrl.operation ?? 3) / 5 * 0.35)
                      );
                      const finalEff = internalEff * (Number(ctrl.cobertura ?? 75) / 100);
                      // Resta aditiva: Inherente * Efectividad
                      const reduction = inherent * finalEff;
                      runningBalance -= reduction;
                    }

                    // Truncar a 2 decimales sin redondeo
                    const truncated = Math.trunc(runningBalance * 100) / 100;
                    return truncated.toFixed(2);
                  })()}
                </div>
                <button
                  type="button"
                  title="Eliminar control"
                  onClick={() => void handleDeleteControl(c.control_id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.35)',
                    background: 'rgba(127,29,29,0.25)',
                    color: '#fca5a5',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginInline: 'auto',
                  }}
                >
                  <Trash2 size={14} />
                </button>

                <button
                  type="button"
                  title="Cargar evidencia"
                  onClick={() => { setSelectedControlEv(c); setEvidenceList([]); setUploadStatus(null); void loadEvidences(current?.id ?? '', c.control_id); }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: '1px solid rgba(59,130,246,0.35)',
                    background: 'rgba(30,58,138,0.25)',
                    color: '#60a5fa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginInline: 'auto',
                  }}
                >
                  <FileText size={14} />
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* TOTAL BALANCE RESIDUAL - FORMATO IMAGEN */}
          {controls.length > 0 && (
            <div style={{ 
              marginTop: '2.5rem', 
              padding: '1.5rem 2rem',
              background: 'rgba(7, 16, 42, 0.4)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '2.5rem'
            }}>
              {/* Mitigación Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: '50%', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(59, 130, 246, 0.15)'
                }}>
                  <ShieldCheck size={24} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'capitalize' }}>
                    Mitigación acumulada
                  </p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '1.6rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                    {(() => {
                      let totalMitigation = 0;
                      controls.forEach((c: any) => {
                        const internalEff = (
                          (Number(c.design ?? 3) / 5 * 0.35) + 
                          (Number(c.implementation ?? 3) / 5 * 0.30) + 
                          (Number(c.operation ?? 3) / 5 * 0.35)
                        );
                        const finalEff = internalEff * (Number(c.cobertura ?? 75) / 100);
                        totalMitigation += finalEff;
                      });
                      // Truncar porcentaje a 1 decimal sin redondeo (como pide la UI)
                      const truncatedMit = Math.trunc(totalMitigation * 100 * 10) / 10;
                      return `${truncatedMit.toFixed(1)}%`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Vertical Divider */}
              <div style={{ height: '40px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

              {/* Residual Section */}
              <div style={{
                background: 'rgba(56, 189, 248, 0.03)',
                border: '1px solid rgba(56, 189, 248, 0.12)',
                borderRadius: '12px',
                padding: '0.8rem 2.2rem',
                minWidth: '220px',
                textAlign: 'left'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.78rem', 
                  fontWeight: 800, 
                  color: '#7dd3fc', 
                  marginBottom: '0.4rem',
                  textTransform: 'capitalize'
                }}>
                  Riesgo residual final
                </p>
                <div style={{
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  background: 'linear-gradient(to bottom, #ffffff 10%, #7dd3fc 60%, #0ea5e9 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1,
                  filter: 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.6))',
                  letterSpacing: '-0.02em'
                }}>
                  {(() => {
                    const inherent = Number(current?.inherent_risk_score ?? 0);
                    let totalReduction = 0;
                    controls.forEach((c: any) => {
                      const internalEff = (
                        (Number(c.design ?? 3) / 5 * 0.35) + 
                        (Number(c.implementation ?? 3) / 5 * 0.30) + 
                        (Number(c.operation ?? 3) / 5 * 0.35)
                      );
                      const finalEff = internalEff * (Number(c.cobertura ?? 75) / 100);
                      totalReduction += (inherent * finalEff);
                    });
                    const finalResidual = Math.max(0, inherent - totalReduction);
                    // Truncar a 2 decimales sin redondeo
                    const truncatedRes = Math.trunc(finalResidual * 100) / 100;
                    return truncatedRes.toFixed(2);
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Evidence Modal */}
          {selectedControlEv && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}>
              <div style={{
                width: '100%', maxWidth: '760px', background: '#0a0f1e',
                borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', maxHeight: '90vh'
              }}>
                {/* Header */}
                <div style={{
                  padding: '1.2rem 1.5rem', background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} color="#3b82f6" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>Evidencias del riesgo</span>
                      <span style={{ marginLeft: '0.6rem', fontSize: '0.72rem', color: '#64748b' }}>{current?.name ?? ''}</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedControlEv(null); setUploadStatus(null); setEvidenceList([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Body — scrollable */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Control context pill */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Control', value: selectedControlEv.name },
                      { label: 'Tipo', value: controlTypes.find((t:any) => t.id === selectedControlEv.control_type)?.name ?? '-' },
                      { label: 'Responsable', value: owners.find((o:any) => o.id === selectedControlEv.owner_id)?.name ?? '-' },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: '0.3rem 0.75rem', borderRadius: 99, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{item.label}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Evidence grid */}
                  <div>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Evidencias cargadas ({loadingEvidences ? '…' : evidenceList.length})
                    </p>
                    {loadingEvidences ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: '#475569', fontSize: '0.8rem' }}>Cargando…</div>
                    ) : evidenceList.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.2rem', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.07)', color: '#475569', fontSize: '0.78rem' }}>
                        Sin evidencias registradas para este riesgo
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
                        {evidenceList.map((ev: any) => {
                          const ext = String(ev.title ?? '').split('.').pop()?.toLowerCase() ?? '';
                          const iconColor = ext === 'pdf' ? '#ef4444' : ['jpg','jpeg','png'].includes(ext) ? '#a78bfa' : ['xls','xlsx'].includes(ext) ? '#10b981' : '#3b82f6';
                          const date = ev.collected_at ? new Date(String(ev.collected_at)).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
                          return (
                            <div key={ev.id} style={{
                              padding: '0.75rem', borderRadius: 10,
                              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                              display: 'flex', flexDirection: 'column', gap: '0.35rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <FileText size={14} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', wordBreak: 'break-all', lineHeight: 1.3 }}>{ev.title}</span>
                              </div>
                              {ev.control_name && (
                                <span style={{ fontSize: '0.62rem', color: '#475569' }}>Control: {ev.control_name}</span>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                                <span style={{ fontSize: '0.6rem', color: '#334155' }}>{date}</span>
                                <span style={{
                                  fontSize: '0.58rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99,
                                  background: ev.validity_status === 'VALID' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.15)',
                                  color: ev.validity_status === 'VALID' ? '#10b981' : '#64748b'
                                }}>
                                  {ev.validity_status === 'VALID' ? 'Válida' : 'Pendiente'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Upload zone */}
                  <div>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Cargar nueva evidencia
                    </p>
                    <div style={{
                      border: '2px dashed rgba(59,130,246,0.2)', borderRadius: '12px',
                      padding: '1.5rem', textAlign: 'center', background: 'rgba(59,130,246,0.02)',
                      position: 'relative'
                    }}>
                      <input
                        type="file"
                        id="ev-upload"
                        multiple
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: uploading ? 'wait' : 'pointer' }}
                        accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                        disabled={uploading}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;
                          const allowedExts = ['doc','docx','pdf','jpg','jpeg','png','xls','xlsx'];
                          for (const file of files) {
                            const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
                            if (!allowedExts.includes(ext)) {
                              setUploadStatus({ type: 'error', msg: `Formato no permitido: ${file.name}` });
                              return;
                            }
                            if (file.size > 2 * 1024 * 1024) {
                              setUploadStatus({ type: 'error', msg: `Archivo excede 2 MB: ${file.name}` });
                              return;
                            }
                          }
                          setUploading(true);
                          setUploadStatus(null);
                          try {
                            for (const file of files) {
                              const fd = new FormData();
                              fd.append('file', file);
                              fd.append('runRaId', runRaId || '');
                              fd.append('controlId', selectedControlEv.control_id);
                              fd.append('riskId', current?.id || '');
                              const res = await fetch('/api/linear-risk/evidence/upload', { method: 'POST', body: fd });
                              if (!res.ok) throw new Error(`Error al subir: ${file.name}`);
                            }
                            setUploadStatus({ type: 'success', msg: files.length === 1 ? 'Evidencia cargada correctamente' : `${files.length} evidencias cargadas correctamente` });
                            await loadEvidences(current?.id ?? '', selectedControlEv.control_id);
                          } catch (err) {
                            setUploadStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error durante la carga' });
                          } finally {
                            setUploading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                      <FileText size={28} style={{ color: '#3b82f6', opacity: 0.4, marginBottom: '0.5rem' }} />
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                        {uploading ? 'Subiendo…' : 'Clic para seleccionar o arrastra los archivos'}
                      </p>
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.62rem', color: '#475569' }}>
                        DOC, PDF, JPG, PNG, XLS · Máx. 2 MB por archivo · Permite múltiples archivos
                      </p>
                    </div>

                    {uploadStatus && (
                      <div style={{
                        marginTop: '0.75rem', padding: '0.6rem 0.9rem', borderRadius: '8px',
                        background: uploadStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        color: uploadStatus.type === 'success' ? '#10b981' : '#ef4444',
                        fontSize: '0.75rem', fontWeight: 600
                      }}>
                        {uploadStatus.msg}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)',
                  borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex',
                  justifyContent: 'flex-end', gap: '0.8rem', flexShrink: 0
                }}>
                  <button
                    onClick={() => { setSelectedControlEv(null); setUploadStatus(null); setEvidenceList([]); }}
                    style={{
                      padding: '0.5rem 1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'none', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Cerrar
                  </button>
                  <label
                    htmlFor="ev-upload"
                    style={{
                      padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none',
                      background: uploading ? 'rgba(59,130,246,0.4)' : '#3b82f6',
                      color: 'white', fontSize: '0.8rem', fontWeight: 700,
                      cursor: uploading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                    }}
                  >
                    <Plus size={14} /> {uploading ? 'Subiendo…' : 'Agregar evidencia'}
                  </label>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => void handleAddControl()}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: 10,
                border: '1px solid rgba(16,185,129,0.4)',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ShieldPlus size={14} /> + Agregar control
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: 10,
                border: '1px solid rgba(59,130,246,0.45)',
                background: saving ? 'rgba(59,130,246,0.2)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.22)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Save size={14} /> {saving ? 'Grabando...' : 'Grabar'}
            </button>
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem', alignItems: 'center' }}>
        <div style={{ ...CARD, padding: '0.8rem 1rem', border: '1px solid rgba(96,165,250,0.2)' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}><FolderOpen size={13} /> Las evidencias se guardarán en:</span>
          <span style={{ color: '#e2e8f0', fontSize: '0.8rem', marginLeft: 8 }}>C:\\_CRE\\evidencias</span>
        </div>
      </div>
    </div>
  );
}


