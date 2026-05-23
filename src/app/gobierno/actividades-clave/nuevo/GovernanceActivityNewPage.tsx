'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Save, ArrowLeft, Pencil, Trash2, X, Check,
  ClipboardList, Plus,
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

interface EditState {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  saving: boolean;
}

/* ── Helpers ────────────────────────────────────────── */
function initials(name: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/* ── Component ──────────────────────────────────────── */
export default function GovernanceActivityNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyIdParam = searchParams.get('company_id') || '';
  const elementIdParam = searchParams.get('element_id') || '';

  /* context data */
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* create form */
  const [form, setForm] = useState({
    companyId: companyIdParam,
    elementId: elementIdParam,
    ownerId: '',
    name: '',
    description: '',
    isActive: true,
  });

  /* activity list */
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listPage] = useState(1);
  const LIST_LIMIT = 50;

  /* inline edit state */
  const [editState, setEditState] = useState<EditState | null>(null);

  /* ── Fetch companies (once) ─────────────────────── */
  useEffect(() => {
    let mounted = true;
    setLoadingContext(true);
    fetch('/api/governance/companies', { cache: 'no-store' })
      .then(async r => {
        if (r.status === 403) { if (mounted) setError('Sin permisos para cargar empresas.'); return; }
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
      .catch(err => { if (mounted) setError(`Error: ${err.message}`); })
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
        const exists = items.some(p => p.id === form.elementId);
        if (!exists) setForm(prev => ({ ...prev, elementId: items[0]?.id || '' }));
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
        setForm(prev => ({ ...prev, ownerId: '' }));
      })
      .catch(err => { if (mounted) setError(`Error líderes: ${err.message}`); })
      .finally(() => { if (mounted) setLoadingUsers(false); });

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.companyId]);

  /* ── Fetch activities list ──────────────────────── */
  const fetchActivities = useCallback(async (page: number) => {
    if (!form.companyId) return;
    setListLoading(true);
    try {
      const url = `/api/governance/processes/activities?company_id=${form.companyId}&page=${page}&limit=${LIST_LIMIT}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: ActivityListResponse = await r.json();
      setActivities(data.items);
    } catch {
      /* silent */
    } finally {
      setListLoading(false);
    }
  }, [form.companyId]);

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  /* ── Create submit ──────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.companyId) { setError('La empresa es obligatoria.'); return; }
    if (!form.elementId) { setError('El proceso es obligatorio.'); return; }
    if (!form.name.trim()) { setError('El nombre de la actividad es obligatorio.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/governance/processes/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Error al crear la actividad');
      setSuccess('Actividad clave creada exitosamente.');
      setForm(prev => ({ ...prev, name: '', description: '', ownerId: '' }));
      fetchActivities(1);
      setTimeout(() => setSuccess(null), 4000);
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
      fetchActivities(listPage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  /* ── Start inline edit ──────────────────────────── */
  const startEdit = (a: ActivityRow) => {
    setEditState({
      id: a.id,
      name: a.name,
      description: a.description ?? '',
      isActive: a.isActive,
      saving: false,
    });
  };

  /* ── Save inline edit ───────────────────────────── */
  const saveEdit = async () => {
    if (!editState || !editState.name.trim()) return;
    setEditState(prev => prev ? { ...prev, saving: true } : null);
    try {
      const res = await fetch(`/api/governance/processes/activities?id=${editState.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editState.name,
          description: editState.description,
          isActive: editState.isActive,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error al actualizar');
      }
      setEditState(null);
      fetchActivities(listPage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
      setEditState(prev => prev ? { ...prev, saving: false } : null);
    }
  };

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Section 1: Create ──────────────────── */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><Plus size={16} /></span>
            <div>
              <h1 className={styles.sectionTitle}>Crear Nueva Actividad</h1>
              <p className={styles.sectionSubtitle}>Completa la información para registrar una nueva actividad.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formRow4}>
              <label className={styles.field}>
                <span>Empresa</span>
                <select className={styles.input} value={form.companyId} onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value, elementId: '', ownerId: '' }))} disabled={loadingContext || saving}>
                  {loadingContext && <option value="">Cargando empresas...</option>}
                  {!loadingContext && companies.length === 0 && <option value="">Sin empresas disponibles</option>}
                  {!loadingContext && companies.length > 0 && <option value="" disabled>Seleccione una empresa</option>}
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span>Proceso Vinculado</span>
                <select className={styles.input} value={form.elementId} onChange={e => setForm(prev => ({ ...prev, elementId: e.target.value }))} disabled={loadingProcesses || saving || !form.companyId}>
                  <option value="">{loadingProcesses ? 'Cargando procesos...' : 'Seleccione Proceso'}</option>
                  {processes.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span>Líder de la Actividad</span>
                <select className={styles.input} value={form.ownerId} onChange={e => setForm(prev => ({ ...prev, ownerId: e.target.value }))} disabled={loadingUsers || saving || !form.companyId}>
                  <option value="">{loadingUsers ? 'Cargando usuarios...' : 'Seleccione Líder'}</option>
                  {users.map(u => {
                    const label = [u.name, u.lastName].filter(Boolean).join(' ') || u.email;
                    return <option key={u.id} value={u.id}>{label}</option>;
                  })}
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

            <label className={styles.field}>
              <span>Nombre de la Actividad</span>
              <div className={styles.inputWithIcon}>
                <ClipboardList size={16} className={styles.fieldIcon} />
                <input className={styles.input} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ej: Conciliación bancaria diaria" disabled={saving} required />
              </div>
            </label>

            <label className={styles.field}>
              <span>Descripción / Alcance</span>
              <div className={styles.inputWithIcon}>
                <ClipboardList size={16} className={styles.fieldIcon} />
                <input className={styles.input} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Conciliación bancaria diaria – Verificación de saldos bancarios y registros contables." disabled={saving} />
              </div>
            </label>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={() => router.back()} disabled={saving}>
                <ArrowLeft size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                <Save size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {saving ? 'Guardando...' : 'Crear Actividad'}
              </button>
            </div>
          </form>
        </section>

        {/* ── Section 2: Existing ────────────────── */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><ClipboardList size={16} /></span>
            <div>
              <h2 className={styles.sectionTitle}>Actividades Existentes</h2>
              <p className={styles.sectionSubtitle}>Listado de actividades registradas en el sistema.</p>
            </div>
          </div>

          {listLoading && activities.length === 0 ? (
            <p className={styles.emptyMsg}>Cargando actividades...</p>
          ) : activities.length === 0 ? (
            <p className={styles.emptyMsg}>No hay actividades registradas aún.</p>
          ) : (
            <div className={styles.activityList}>
              {activities.map(a => {
                const isEditing = editState?.id === a.id;
                return (
                  <div key={a.id} className={`${styles.activityRow} ${isEditing ? styles.activityRowEditing : ''}`}>
                    {isEditing ? (
                      /* ── Inline edit form ── */
                      <div className={styles.inlineEditGrid}>
                        <input
                          className={`${styles.input} ${styles.editInput}`}
                          value={editState.name}
                          onChange={e => setEditState(prev => prev ? { ...prev, name: e.target.value } : null)}
                          placeholder="Nombre de la actividad"
                          disabled={editState.saving}
                          autoFocus
                        />
                        <input
                          className={`${styles.input} ${styles.editInput}`}
                          value={editState.description}
                          onChange={e => setEditState(prev => prev ? { ...prev, description: e.target.value } : null)}
                          placeholder="Descripción / Alcance"
                          disabled={editState.saving}
                        />
                        <div className={styles.inlineEditActions}>
                          <button
                            className={`${styles.toggle} ${editState.isActive ? styles.toggleOn : ''}`}
                            type="button"
                            role="switch"
                            aria-checked={editState.isActive}
                            onClick={() => setEditState(prev => prev ? { ...prev, isActive: !prev.isActive } : null)}
                            disabled={editState.saving}
                            title={editState.isActive ? 'Activa' : 'Inactiva'}
                          >
                            <span className={styles.toggleDot} />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnSuccess}`}
                            title="Guardar"
                            onClick={saveEdit}
                            disabled={editState.saving || !editState.name.trim()}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className={styles.iconBtn}
                            title="Cancelar edición"
                            onClick={() => setEditState(null)}
                            disabled={editState.saving}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Read-only row ── */
                      <>
                        <div className={styles.activityInfo}>
                          <span className={styles.activityName}>{a.name}</span>
                          <span className={styles.activityDesc}>{a.description || '—'}</span>
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
                          <button className={styles.iconBtn} title="Editar" onClick={() => startEdit(a)}>
                            <Pencil size={14} />
                          </button>
                          <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Eliminar" onClick={() => handleDelete(a.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
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
