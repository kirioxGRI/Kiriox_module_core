'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Save, Pencil, Trash2,
  ClipboardList, Plus, X,
} from 'lucide-react';
import styles from './GovernanceActivityNewPage.module.css';

/* ── Types ──────────────────────────────────────────── */
type CompanyOption = { id: string; name: string };
type ProcessOption = { id: string; name: string; code: string };
type UserOption = { id: string; name: string | null; lastName: string | null; email: string };

interface ActivityRow {
  id: string;
  name: string;
  description: string | null;
  code: string;
  isActive: boolean;
  companyId: string;
  elementId: string;
  ownerId: string | null;
  ownerName: string | null;
  processName: string | null;
  processCode: string | null;
  createdAt: string;
}

interface ActivityListResponse {
  items: ActivityRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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

/* ── Inline styles (header botones) ─────────────────── */
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
export default function GovernanceActivityNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formCardRef = useRef<HTMLElement>(null);

  const companyIdParam = searchParams.get('company_id') || '';
  const elementIdParam = searchParams.get('element_id') || '';

  /* ── Context data ───────────────────────────────── */
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  /* ── Form state (dual mode: create | edit) ──────── */
  const EMPTY_FORM = {
    companyId: companyIdParam,
    elementId: elementIdParam,
    ownerId: '',
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

  /* ── Activity list ──────────────────────────────── */
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const LIST_LIMIT = 50;

  /* ── Fetch companies once ───────────────────────── */
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
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch processes & users when company changes ── */
  useEffect(() => {
    if (!form.companyId) { setProcesses([]); setUsers([]); return; }
    let mounted = true;

    setLoadingProcesses(true);
    fetch(`/api/governance/processes?company_id=${form.companyId}`, { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!mounted) return;
        const items: ProcessOption[] = data.items || [];
        setProcesses(items);
        if (!editingId) {
          const exists = items.some(p => p.id === form.elementId);
          if (!exists) setForm(prev => ({ ...prev, elementId: items[0]?.id || '' }));
        }
      })
      .catch(err => { if (mounted) setError(`Error procesos: ${err.message}`); })
      .finally(() => { if (mounted) setLoadingProcesses(false); });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.companyId]);

  /* ── Fetch activities list ──────────────────────── */
  const fetchActivities = useCallback(async () => {
    if (!form.companyId) return;
    setListLoading(true);
    try {
      const r = await fetch(
        `/api/governance/processes/activities?company_id=${form.companyId}&page=1&limit=${LIST_LIMIT}`,
        { cache: 'no-store' }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: ActivityListResponse = await r.json();
      setActivities(data.items);
    } catch { /* silent */ }
    finally { setListLoading(false); }
  }, [form.companyId]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  /* ── Open create form ──────────────────────────── */
  function openNew() {
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setForm({ ...EMPTY_FORM, companyId: form.companyId, elementId: processes[0]?.id || elementIdParam });
    setShowForm(true);
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  /* ── Load activity into form for editing ────────── */
  const handleStartEdit = (a: ActivityRow) => {
    setEditingId(a.id);
    setError(null);
    setSuccess(null);
    setForm({
      companyId: a.companyId,
      elementId: a.elementId,
      ownerId: a.ownerId ?? '',
      name: a.name,
      description: a.description ?? '',
      isActive: a.isActive,
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
    setForm({ ...EMPTY_FORM });
  };

  /* ── Submit (create or update) ──────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.companyId) { setError('La empresa es obligatoria.'); return; }
    if (!form.elementId) { setError('El proceso es obligatorio.'); return; }
    if (!form.name.trim()) { setError('El nombre de la actividad es obligatorio.'); return; }

    setSaving(true);
    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/governance/processes/activities?id=${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            isActive: form.isActive,
            elementId: form.elementId,
            ownerId: form.ownerId || null,
          }),
        });
      } else {
        res = await fetch('/api/governance/processes/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Error al guardar');

      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      void fetchActivities();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ─────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/governance/processes/activities?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error al eliminar');
      }
      if (editingId === id) handleCloseForm();
      setActivities(prev => prev.filter(a => a.id !== id));
      void fetchActivities();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
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
                  {isEditing ? 'Editar Actividad' : 'Crear Nueva Actividad'}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {isEditing
                    ? 'Modifica los campos y guarda los cambios.'
                    : 'Completa la información para registrar una nueva actividad.'}
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
                    onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value, elementId: '', ownerId: '' }))}
                    disabled={loadingContext || saving}
                  >
                    {loadingContext && <option value="">Cargando empresas...</option>}
                    {!loadingContext && companies.length === 0 && <option value="">Sin empresas disponibles</option>}
                    {!loadingContext && companies.length > 0 && <option value="" disabled>Seleccione una empresa</option>}
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Proceso Vinculado</span>
                  <select
                    className={styles.input}
                    value={form.elementId}
                    onChange={e => setForm(prev => ({ ...prev, elementId: e.target.value }))}
                    disabled={loadingProcesses || saving || !form.companyId}
                  >
                    <option value="">{loadingProcesses ? 'Cargando procesos...' : 'Seleccione Proceso'}</option>
                    {processes.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Líder de la Actividad</span>
                  <select
                    className={styles.input}
                    value={form.ownerId}
                    onChange={e => setForm(prev => ({ ...prev, ownerId: e.target.value }))}
                    disabled={loadingUsers || saving || !form.companyId}
                  >
                    <option value="">{loadingUsers ? 'Cargando usuarios...' : 'Seleccione Líder'}</option>
                    {users.map(u => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Actividad Activa</span>
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
                    <span className={styles.toggleLabel}>{form.isActive ? 'Sí, activa' : 'Inactiva'}</span>
                  </div>
                </label>
              </div>

              {/* Name */}
              <label className={styles.field}>
                <span>Nombre de la Actividad</span>
                <div className={styles.inputWithIcon}>
                  <ClipboardList size={16} className={styles.fieldIcon} />
                  <input
                    className={styles.input}
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Conciliación bancaria diaria"
                    disabled={saving}
                    required
                  />
                </div>
              </label>

              {/* Description */}
              <label className={styles.field}>
                <span>Descripción / Alcance</span>
                <div className={styles.inputWithIcon}>
                  <ClipboardList size={16} className={styles.fieldIcon} />
                  <input
                    className={styles.input}
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describa el objetivo y las tareas principales de esta actividad..."
                    disabled={saving}
                  />
                </div>
              </label>

              {error   && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              <div className={styles.actions}>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  <Save size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {saving
                    ? (isEditing ? 'Actualizando...' : 'Guardando...')
                    : (isEditing ? 'Actualizar Actividad' : 'Crear Actividad')}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ══ ACTIVITY LIST ════════════════════════════ */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><ClipboardList size={16} /></span>
            <div style={{ flex: 1 }}>
              <h2 className={styles.sectionTitle}>Actividades Existentes</h2>
              <p className={styles.sectionSubtitle}>Listado de actividades registradas en el sistema.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button style={S.btnPrimary} onClick={openNew}>
                <Plus size={14} /> Nueva actividad
              </button>
              <button style={S.btnGhost} onClick={() => router.back()}>
                <X size={14} /> Cerrar
              </button>
            </div>
          </div>

          {listLoading && activities.length === 0 ? (
            <p className={styles.emptyMsg}>Cargando actividades...</p>
          ) : activities.length === 0 ? (
            <p className={styles.emptyMsg}>No hay actividades registradas aún.</p>
          ) : (
            <div className={styles.activityList}>
              <div className={styles.activityHeader}>
                <span>Actividad</span>
                <span style={{ textAlign: 'left' }}>Proceso</span>
                <span>Líder</span>
                <span>Estado</span>
                <span></span>
              </div>

              {activities.map(a => (
                <div
                  key={a.id}
                  className={`${styles.activityRow} ${editingId === a.id ? styles.activityRowActive : ''}`}
                >
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>{a.name}</span>
                    <span className={styles.activityDesc}>{a.description || '—'}</span>
                  </div>

                  <div className={styles.activityMeta}>
                    {a.processCode && (
                      <span className={styles.metaTag}>[{a.processCode}] {a.processName}</span>
                    )}
                  </div>

                  <div className={styles.activityOwner}>
                    {a.ownerName ? (
                      <>
                        <span className={styles.avatar}>{initials(a.ownerName)}</span>
                        <div className={styles.ownerText}>
                          <span className={styles.ownerName}>{a.ownerName}</span>
                          <span className={styles.ownerRole}>Líder de la actividad</span>
                        </div>
                      </>
                    ) : (
                      <span className={styles.ownerNone}>Sin asignar</span>
                    )}
                  </div>

                  <span className={`${styles.badge} ${a.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                    <span className={styles.badgeDot} />
                    {a.isActive ? 'Activa' : 'Inactiva'}
                  </span>

                  <div className={styles.rowActions}>
                    <button
                      className={`${styles.iconBtn} ${editingId === a.id ? styles.iconBtnEditActive : ''}`}
                      title={editingId === a.id ? 'Cerrar edición' : 'Editar'}
                      onClick={() => editingId === a.id ? handleCloseForm() : handleStartEdit(a)}
                    >
                      {editingId === a.id ? <X size={14} /> : <Pencil size={14} />}
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      title="Eliminar"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
