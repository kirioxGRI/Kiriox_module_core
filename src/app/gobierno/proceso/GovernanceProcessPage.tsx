'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Save, Pencil, X,
  Workflow, Plus, Trash2,
} from 'lucide-react';
import styles from './GovernanceProcessPage.module.css';

/* ── Types ──────────────────────────────────────────── */
type CompanyOption = { id: string; name: string };
type ElementTypeOption = { id: string; name: string; code: string };
type UserOption = { id: string; name: string | null; lastName: string | null; email: string };

interface ProcessRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  companyId: string;
  elementTypeId: string;
  elementTypeName: string | null;
  leaderId: string | null;
  createdAt: string;
}

interface ProcessListResponse {
  items: ProcessRow[];
}

/* ── Helpers ────────────────────────────────────────── */
function initials(name: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function userLabel(u: UserOption): string {
  return [u.name, u.lastName].filter(Boolean).join(' ') || u.email;
}

/* ── Inline styles (header — fuera de card) ─────────── */
const S = {
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: 10,
    background: 'linear-gradient(180deg, #1e5fd6, #1148ad)',
    color: '#fff', border: '1px solid #2b73ef',
    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
  } as React.CSSProperties,
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: 10,
    background: 'rgba(10, 23, 48, 0.35)', color: '#d9e8ff',
    border: '1px solid rgba(73, 111, 186, 0.4)',
    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
  } as React.CSSProperties,
};

/* ── Component ──────────────────────────────────────── */
export default function GovernanceProcessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formCardRef = useRef<HTMLElement>(null);

  const companyIdParam = searchParams.get('company_id') || '';

  /* ── Context data ───────────────────────────────── */
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [elementTypes, setElementTypes] = useState<ElementTypeOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  /* ── Form state (dual mode: create | edit) ──────── */
  const EMPTY_FORM = {
    companyId: companyIdParam,
    elementTypeId: '',
    leaderId: '',
    code: '',
    name: '',
    description: '',
    isActive: true,
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ── Process list ──────────────────────────────── */
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [listLoading, setListLoading] = useState(false);

  /* ── Fetch companies and types (once) ──────────────── */
  useEffect(() => {
    let mounted = true;
    setLoadingContext(true);
    fetch('/api/governance/companies', { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!mounted) return;
        const list: CompanyOption[] = data.items || [];
        setCompanies(list);
        const paramId = searchParams.get('company_id') || searchParams.get('companyId');
        const found = list.find(c => c.id === paramId);
        if (found) setForm(prev => ({ ...prev, companyId: found.id }));
        else if (list.length > 0 && !form.companyId) setForm(prev => ({ ...prev, companyId: list[0].id }));
      })
      .catch(err => { if (mounted) setError(`Error cargando empresas: ${err.message}`); })
      .finally(() => { if (mounted) setLoadingContext(false); });

    setLoadingTypes(true);
    fetch('/api/governance/element-types', { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!mounted) return;
        const list: ElementTypeOption[] = data.items || [];
        setElementTypes(list);
        if (list.length > 0) setForm(prev => ({ ...prev, elementTypeId: list[0].id }));
      })
      .catch(err => { if (mounted) setError(`Error cargando tipos de proceso: ${err.message}`); })
      .finally(() => { if (mounted) setLoadingTypes(false); });

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch users when company changes ── */
  useEffect(() => {
    if (!form.companyId) { setUsers([]); return; }
    let mounted = true;
    setLoadingUsers(true);
    fetch(`/api/admin/users?companyId=${form.companyId}`, { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!mounted) return;
        setUsers(Array.isArray(data) ? data : data.users || []);
      })
      .catch(err => { if (mounted) setError(`Error líderes: ${err.message}`); })
      .finally(() => { if (mounted) setLoadingUsers(false); });
    return () => { mounted = false; };
  }, [form.companyId]);

  /* ── Fetch processes list ──────────────────────── */
  const fetchProcesses = useCallback(async () => {
    if (!form.companyId) return;
    setListLoading(true);
    try {
      const r = await fetch(
        `/api/governance/processes?company_id=${form.companyId}`,
        { cache: 'no-store' }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: ProcessListResponse = await r.json();
      setProcesses(data.items);
      setError(null);
    } catch (err) {
      setProcesses([]);
      setError(err instanceof Error ? `Error cargando procesos: ${err.message}` : 'Error cargando procesos.');
    }
    finally { setListLoading(false); }
  }, [form.companyId]);

  useEffect(() => { fetchProcesses(); }, [fetchProcesses]);

  /* ── Open create form ──────────────────────────── */
  function openNew() {
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setForm({ ...EMPTY_FORM, companyId: form.companyId, elementTypeId: elementTypes[0]?.id ?? '' });
    setShowForm(true);
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  /* ── Load process into form for editing ────────── */
  const handleStartEdit = (p: ProcessRow) => {
    setEditingId(p.id);
    setError(null);
    setSuccess(null);
    setForm({
      companyId: p.companyId,
      elementTypeId: p.elementTypeId || (elementTypes[0]?.id ?? ''),
      leaderId: p.leaderId ?? '',
      code: p.code,
      name: p.name,
      description: p.description ?? '',
      isActive: p.isActive,
    });
    setShowForm(true);
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  /* ── Close form ─────────────────────────────────── */
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setForm({ ...EMPTY_FORM, companyId: form.companyId, elementTypeId: elementTypes[0]?.id ?? '' });
  };

  /* ── Submit (create or update) ──────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.companyId)    { setError('La empresa es obligatoria.'); return; }
    if (!form.elementTypeId){ setError('El tipo de proceso es obligatorio.'); return; }
    if (!form.code.trim())  { setError('El código es obligatorio.'); return; }
    if (!form.name.trim())  { setError('El nombre del proceso es obligatorio.'); return; }

    setSaving(true);
    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/governance/processes?id=${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            code: form.code,
            description: form.description,
            isActive: form.isActive,
            elementTypeId: form.elementTypeId,
            leaderId: form.leaderId || null,
          }),
        });
      } else {
        res = await fetch('/api/governance/processes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Error al guardar');

      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM, companyId: form.companyId, elementTypeId: elementTypes[0]?.id ?? '' });
      void fetchProcesses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  /* ── Toggle Active Status ───────────────────────── */
  const handleToggleActive = async (p: ProcessRow) => {
    try {
      setProcesses(prev => prev.map(item => item.id === p.id ? { ...item, isActive: !p.isActive } : item));
      const res = await fetch(`/api/governance/processes?id=${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error('Error al cambiar el estado');
      if (editingId === p.id) setForm(prev => ({ ...prev, isActive: !p.isActive }));
    } catch (err: unknown) {
      setProcesses(prev => prev.map(item => item.id === p.id ? { ...item, isActive: p.isActive } : item));
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado');
    }
  };

  const handleDelete = async (p: ProcessRow) => {
    const confirmed = window.confirm(
      `¿Está seguro de eliminar físicamente el proceso [${p.code}] ${p.name}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/governance/processes?id=${p.id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el proceso');

      if (editingId === p.id) {
        handleCloseForm();
      }

      setProcesses((prev) => prev.filter((item) => item.id !== p.id));
      setSuccess(`Proceso [${p.code}] eliminado correctamente.`);
      void fetchProcesses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el proceso');
    }
  };

  const isEditing = editingId !== null;

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ══ INLINE FORM (condicional) ════════════════ */}
        {showForm && (
          <section className={styles.card} ref={formCardRef}>
            <div className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${isEditing ? styles.sectionIconEdit : ''}`}>
                {isEditing ? <Pencil size={16} /> : <Plus size={16} />}
              </span>
              <div style={{ flex: 1 }}>
                <h2 className={styles.sectionTitle}>
                  {isEditing ? 'Editar Proceso' : 'Crear Nuevo Proceso'}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {isEditing
                    ? 'Modifica los campos y guarda los cambios.'
                    : 'Completa la información para registrar un nuevo proceso.'}
                </p>
              </div>
              <button className={styles.cancelEditBtn} onClick={handleCloseForm} title="Cerrar">
                <X size={16} />
                <span>{isEditing ? 'Cancelar edición' : 'Cerrar'}</span>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Row 1: 4 fields */}
              <div className={styles.formRow4}>
                <label className={styles.field}>
                  <span>Empresa</span>
                  <select
                    className={styles.input}
                    value={form.companyId}
                    onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value, leaderId: '' }))}
                    disabled={loadingContext || saving}
                  >
                    {loadingContext && <option value="">Cargando empresas...</option>}
                    {!loadingContext && companies.length === 0 && <option value="">Sin empresas disponibles</option>}
                    {!loadingContext && companies.length > 0 && <option value="" disabled>Seleccione una empresa</option>}
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Tipo de Proceso</span>
                  <select
                    className={styles.input}
                    value={form.elementTypeId}
                    onChange={e => setForm(prev => ({ ...prev, elementTypeId: e.target.value }))}
                    disabled={loadingTypes || saving}
                  >
                    <option value="">{loadingTypes ? 'Cargando tipos...' : 'Seleccione Tipo'}</option>
                    {elementTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Líder del Proceso</span>
                  <select
                    className={styles.input}
                    value={form.leaderId}
                    onChange={e => setForm(prev => ({ ...prev, leaderId: e.target.value }))}
                    disabled={loadingUsers || saving || !form.companyId}
                  >
                    <option value="">{loadingUsers ? 'Cargando usuarios...' : 'Seleccione Líder'}</option>
                    {users.map(u => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Proceso Activo</span>
                  <div className={styles.toggleWrapper}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isActive}
                      className={`${styles.toggle} ${form.isActive ? styles.toggleOn : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                      disabled={saving}
                    >
                      <span className={styles.toggleDot} />
                    </button>
                    <span className={styles.toggleLabel}>{form.isActive ? 'Sí, activo' : 'Inactivo'}</span>
                  </div>
                </label>
              </div>

              {/* Row 2: Code and Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '14px', marginTop: '14px' }}>
                <label className={styles.field}>
                  <span>Código</span>
                  <div className={styles.inputWithIcon}>
                    <Workflow size={16} className={styles.fieldIcon} />
                    <input
                      className={styles.input}
                      value={form.code}
                      onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="Ej: FIN-01"
                      disabled={saving}
                      required
                    />
                  </div>
                </label>

                <label className={styles.field}>
                  <span>Nombre del Proceso</span>
                  <div className={styles.inputWithIcon}>
                    <Workflow size={16} className={styles.fieldIcon} />
                    <input
                      className={styles.input}
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Gestión Financiera"
                      disabled={saving}
                      required
                    />
                  </div>
                </label>
              </div>

              {/* Description */}
              <label className={styles.field} style={{ marginTop: '14px' }}>
                <span>Descripción / Alcance</span>
                <div className={styles.inputWithIcon}>
                  <Workflow size={16} className={styles.fieldIcon} />
                  <input
                    className={styles.input}
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describa el objetivo y las tareas principales de este proceso..."
                    disabled={saving}
                  />
                </div>
              </label>

              {error   && <div className={styles.error}   style={{ marginTop: '14px' }}>{error}</div>}
              {success && <div className={styles.success} style={{ marginTop: '14px' }}>{success}</div>}

              <div className={styles.actions}>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  <Save size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {saving
                    ? (isEditing ? 'Actualizando...' : 'Guardando...')
                    : (isEditing ? 'Actualizar Proceso' : 'Crear Proceso')}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ══ PROCESS LIST ════════════════════════════ */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><Workflow size={16} /></span>
            <div style={{ flex: 1 }}>
              <h2 className={styles.sectionTitle}>Procesos Existentes</h2>
              <p className={styles.sectionSubtitle}>Listado de procesos registrados en el sistema.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button style={S.btnPrimary} onClick={openNew}>
                <Plus size={14} /> Nuevo proceso
              </button>
              <button style={S.btnGhost} onClick={() => router.push('/modelo/gobernanza/catalogo')}>
                <X size={14} /> Cerrar
              </button>
            </div>
          </div>

          {!showForm && error && (
            <div className={styles.error}>{error}</div>
          )}
          {!showForm && success && (
            <div className={styles.success}>{success}</div>
          )}

          {listLoading && processes.length === 0 ? (
            <p className={styles.emptyMsg}>Cargando procesos...</p>
          ) : processes.length === 0 ? (
            <p className={styles.emptyMsg}>No hay procesos registrados aún.</p>
          ) : (
            <div className={styles.activityList}>
              <div className={styles.activityHeader}>
                <span>Proceso</span>
                <span>Tipo</span>
                <span>Líder</span>
                <span>Estado</span>
                <span></span>
              </div>

              {processes.map(p => {
                const leader = users.find(u => u.id === p.leaderId);
                const leaderName = leader ? userLabel(leader) : null;

                return (
                  <div
                    key={p.id}
                    className={`${styles.activityRow} ${editingId === p.id ? styles.activityRowActive : ''}`}
                  >
                    <div className={styles.activityInfo}>
                      <span className={styles.activityName}>[{p.code}] {p.name}</span>
                      <span className={styles.activityDesc}>{p.description || '—'}</span>
                    </div>

                    <div className={styles.activityMeta}>
                      <span className={styles.metaTag}>{p.elementTypeName || '—'}</span>
                    </div>

                    <div className={styles.activityOwner}>
                      {leaderName ? (
                        <>
                          <span className={styles.avatar}>{initials(leaderName)}</span>
                          <div className={styles.ownerText}>
                            <span className={styles.ownerName}>{leaderName}</span>
                            <span className={styles.ownerRole}>Líder del proceso</span>
                          </div>
                        </>
                      ) : (
                        <span className={styles.ownerNone}>Sin asignar</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      className={`${styles.badge} ${p.isActive ? styles.badgeActive : styles.badgeInactive}`}
                      style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      title={`Haz clic para ${p.isActive ? 'inactivar' : 'activar'}`}
                    >
                      <span className={styles.badgeDot} />
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </button>

                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${editingId === p.id ? styles.iconBtnEditActive : ''}`}
                        title={editingId === p.id ? 'Cerrar edición' : 'Editar'}
                        onClick={() => editingId === p.id ? handleCloseForm() : handleStartEdit(p)}
                      >
                        {editingId === p.id ? <X size={14} /> : <Pencil size={14} />}
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title="Eliminar"
                        onClick={() => void handleDelete(p)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
