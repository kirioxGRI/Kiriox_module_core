'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityRow, DependencyRow, SharedResourceRow, WizardActivitiesResponse, WizardData } from './types';
import type { DependencyDraft } from './DependencyCaptureCard';
import type { StructuralStep } from './types';

export function useStructuralCaptureWizard(initialRunSaId?: string) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardData | null>(null);
  const [runId, setRunId] = useState('');
  const [title, setTitle] = useState('');
  const [scopeType, setScopeType] = useState('');
  const [methodology, setMethodology] = useState('');
  const [lifecycleId, setLifecycleId] = useState('');
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [dependencies, setDependencies] = useState<DependencyRow[]>([]);
  const [sharedResources, setSharedResources] = useState<SharedResourceRow[]>([]);
  const [linearRiskContext, setLinearRiskContext] = useState<WizardActivitiesResponse['linear_risk_context']>([]);
  const [riskCascadeCatalog, setRiskCascadeCatalog] = useState<WizardActivitiesResponse['risk_cascade_catalog']>([]);
  const [riskResourceCatalog, setRiskResourceCatalog] = useState<WizardActivitiesResponse['risk_resource_catalog']>([]);
  const [riskCascades, setRiskCascades] = useState<WizardActivitiesResponse['risk_cascades']>([]);
  const [linearControlContext, setLinearControlContext] = useState<WizardActivitiesResponse['linear_control_context']>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [people, setPeople] = useState<Array<{ id: string; full_name: string; email: string | null }>>([]);
  const [dependencyCatalogs, setDependencyCatalogs] = useState<WizardActivitiesResponse['catalogs']>({
    dependencyResources: [],
    failureEffects: [],
    dependencyStrengths: [],
    alternativeLevels: [],
    impacts: [],
    criticalities: [],
  });
  const [dependencyDraft, setDependencyDraft] = useState<DependencyDraft>({
    activityId: '',
    dependencyResourceId: '',
    dependencyActivityId: '',
    dependencySystemName: '',
    dependencyDataName: '',
    dependencyPersonId: '',
    dependencyProviderName: '',
    dependencyDocumentName: '',
    failureEffectId: '',
    dependencyStrengthId: '',
    alternativeLevelId: '',
    impactCode: '',
    criticalityCode: '',
  });
  const [editingDependencyId, setEditingDependencyId] = useState<string | null>(null);
  const [editingSharedResourceId, setEditingSharedResourceId] = useState<string | null>(null);
  const [sharedResourceDraft, setSharedResourceDraft] = useState({
    activityId: '',
    resourceName: '',
    resourceTypeId: '',
    ownerId: '',
    failureEffectId: '',
    dependencyStrengthId: '',
    alternativeLevelId: '',
    criticalityCode: '',
  });
  const [riskCascadeDraft, setRiskCascadeDraft] = useState({
    riskId: '',
    cascadeCode: '',
    affectedResourceId: '',
    notes: '',
  });
  const [editingRiskCascadeId, setEditingRiskCascadeId] = useState<string | null>(null);
  const lastAutoSavedCascadeSigRef = useRef<string>('');

  async function load(runSaId?: string) {
    setLoading(true);
    setError(null);
    try {
      let currentRunId = runSaId || '';
      let runData: any = null;

      // Si no hay ID, obtenemos el run por defecto primero
      if (!currentRunId) {
        const runRes = await fetch('/api/structural-risk/wizard-run', { cache: 'no-store' });
        runData = (await runRes.json()) as WizardData & { error?: string };
        if (!runRes.ok) throw new Error(runData.error || `HTTP ${runRes.status}`);
        currentRunId = runData.currentRun?.id || '';
      }

      const runUrl = currentRunId 
        ? `/api/structural-risk/wizard-run?runSaId=${encodeURIComponent(currentRunId)}` 
        : '/api/structural-risk/wizard-run';
        
      const query = new URLSearchParams();
      if (currentRunId) query.set('runSaId', currentRunId);
      const activityUrl = `/api/structural-risk/wizard-activities?${query.toString()}`;

      // Peticiones en paralelo
      const [finalRunRes, depRes] = await Promise.all([
        runData ? Promise.resolve(null) : fetch(runUrl, { cache: 'no-store' }),
        fetch(activityUrl, { cache: 'no-store' })
      ]);

      const finalRunData = runData || (await finalRunRes!.json());
      const depData = await depRes.json() as WizardActivitiesResponse;

      if (finalRunRes && !finalRunRes.ok) throw new Error(finalRunData.error || `HTTP ${finalRunRes.status}`);
      if (!depRes.ok) throw new Error(depData.error || `HTTP ${depRes.status}`);

      setWizard(finalRunData);
      const current = finalRunData.currentRun;
      setRunId(currentRunId);
      setTitle(current?.title || '');
      setScopeType(current?.scope_type || '');
      setMethodology(current?.methodology || '');
      setLifecycleId(current?.lifecycle_id || finalRunData.catalogs.lifecycle[0]?.id || '');

      setActivities(depData.activities || []);
      setPeople(depData.people || []);
      setDependencies(depData.dependencies || []);
      setSharedResources(depData.shared_resources || []);
      setLinearRiskContext(depData.linear_risk_context || []);
      setRiskCascadeCatalog(depData.risk_cascade_catalog || []);
      setRiskResourceCatalog(depData.risk_resource_catalog || []);
      setRiskCascades(depData.risk_cascades || []);
      setLinearControlContext(depData.linear_control_context || []);
      setSelectedActivities(depData.selected_activity_ids || []);
      setDependencyCatalogs(depData.catalogs);

      // Auto-select first activity if none selected
      if (!dependencyDraft.activityId && depData.selected_activity_ids.length > 0) {
        setDependencyDraft(prev => ({ ...prev, activityId: depData.selected_activity_ids[0] }));
        setSharedResourceDraft(prev => ({ ...prev, activityId: depData.selected_activity_ids[0] }));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el wizard estructural.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!dependencyDraft.activityId || activities.length === 0) return;
    const act = activities.find(a => a.id === dependencyDraft.activityId);
    if (act) {
      setDependencyDraft(prev => ({
        ...prev,
        impactCode: act.impact_code || '',
        criticalityCode: act.criticality_code || '',
      }));
      setSharedResourceDraft(prev => ({
        ...prev,
        activityId: prev.activityId || act.id,
      }));
    }
  }, [dependencyDraft.activityId, activities]);

  useEffect(() => {
    void load(initialRunSaId || undefined);
  }, [initialRunSaId]);

  async function createRun() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/structural-risk/wizard-run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json() as { runSaId?: string; error?: string };
      if (!res.ok || !data.runSaId) throw new Error(data.error || `HTTP ${res.status}`);
      await load(data.runSaId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el run estructural.');
    } finally {
      setSaving(false);
    }
  }

  // --- AUTO-SAVE LOGIC ---
  useEffect(() => {
    if (!runId || loading) return;
    const timer = setTimeout(() => {
      void saveRun();
    }, 1000);
    return () => clearTimeout(timer);
  }, [title]);

  useEffect(() => {
    if (!runId || loading) return;
    void saveRun();
  }, [scopeType, methodology, lifecycleId]);

  useEffect(() => {
    if (!runId || loading || !dependencyDraft.activityId) return;
    if (dependencyDraft.impactCode || dependencyDraft.criticalityCode) {
      void saveImpact();
    }
  }, [dependencyDraft.impactCode, dependencyDraft.criticalityCode, dependencyDraft.activityId]);

  async function saveRun() {
    if (!runId || saving) return;
    try {
      await fetch('/api/structural-risk/wizard-run', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runSaId: runId,
          title,
          scope_type: scopeType,
          methodology,
          lifecycle_id: lifecycleId || null,
          change_reason: 'Auto-guardado de metadatos',
        }),
      });
    } catch (e) {
      console.error('Error in auto-save run:', e);
    }
  }

  function resolveLifecycleIdForStep(stepKey: StructuralStep['key']): string | null {
    const lifecycleCode =
      stepKey === 'evidencia'
        ? 'IN_TREATMENT'
        : 'IN_PROGRESS';
    return wizard?.catalogs.lifecycle.find((l) => l.code === lifecycleCode)?.id ?? lifecycleId ?? null;
  }

  async function saveRunForStep(stepKey: StructuralStep['key']) {
    if (!runId || saving) return false;
    const nextLifecycleId = resolveLifecycleIdForStep(stepKey);
    try {
      const res = await fetch('/api/structural-risk/wizard-run', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runSaId: runId,
          title,
          scope_type: scopeType,
          methodology,
          lifecycle_id: nextLifecycleId,
          change_reason: `Cierre desde paso ${stepKey}`,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (nextLifecycleId) setLifecycleId(nextLifecycleId);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el run estructural.');
      return false;
    }
  }

  async function completeRun(): Promise<boolean> {
    if (!runId || saving) return false;
    const completedLifecycle = wizard?.catalogs.lifecycle.find((l) => l.code === 'COMPLETED');
    if (!completedLifecycle) {
      setError('No se encontró el estado COMPLETED en el catálogo.');
      return false;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/structural-risk/wizard-run', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runSaId: runId,
          title,
          scope_type: scopeType,
          methodology,
          lifecycle_id: completedLifecycle.id,
          change_reason: 'Completado desde paso 6 — Evidencia de controles',
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Error al completar el run.');
        return false;
      }
      setLifecycleId(completedLifecycle.id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al completar el run.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveImpact() {
    if (!runId || saving) return;
    try {
      await fetch('/api/structural-risk/wizard-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runSaId: runId,
          dependencyInput: {
            activityId: dependencyDraft.activityId,
            impactCode: dependencyDraft.impactCode,
            criticalityCode: dependencyDraft.criticalityCode,
          },
        }),
      });
    } catch (e) {
      console.error('Error in auto-save impact:', e);
    }
  }

  async function selectRun(nextRunId: string) {
    setRunId(nextRunId);
    await load(nextRunId);
  }

  async function toggleActivity(activityId: string) {
    const next = selectedActivities.includes(activityId) ? selectedActivities.filter((id) => id !== activityId) : [...selectedActivities, activityId];
    if (!runId) return;
    setError(null);
    try {
      setSelectedActivities(next);
      const saveRes = await fetch('/api/structural-risk/wizard-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runSaId: runId, selectedActivityIds: next }),
      });
      const saveData = await saveRes.json() as { ok?: boolean; error?: string };
      if (!saveRes.ok || !saveData.ok) throw new Error(saveData.error || `HTTP ${saveRes.status}`);

      const query = new URLSearchParams();
      query.set('runSaId', runId);
      const depRes = await fetch(`/api/structural-risk/wizard-activities?${query.toString()}`, { cache: 'no-store' });
      const depData = await depRes.json() as WizardActivitiesResponse;
      if (!depRes.ok) throw new Error(depData.error || `HTTP ${depRes.status}`);
      setDependencies(depData.dependencies || []);
      setSharedResources(depData.shared_resources || []);
      setLinearRiskContext(depData.linear_risk_context || []);
      setRiskCascadeCatalog(depData.risk_cascade_catalog || []);
      setRiskResourceCatalog(depData.risk_resource_catalog || []);
      setRiskCascades(depData.risk_cascades || []);
      setLinearControlContext(depData.linear_control_context || []);
      setSelectedActivities(depData.selected_activity_ids || []);
      setDependencyCatalogs(depData.catalogs);
      setPeople(depData.people || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la selección de actividades.');
      await load(runId);
    }
  }

  async function saveDependency() {
    if (!runId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/structural-risk/wizard-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runSaId: runId,
          dependencyInput: { ...dependencyDraft, dependencyId: editingDependencyId || undefined },
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await load(runId);
      setDependencyDraft((prev) => ({
        ...prev,
        dependencyActivityId: '',
        dependencyResourceId: '',
        failureEffectId: '',
        dependencyStrengthId: '',
        alternativeLevelId: '',
        dependencyPersonId: '',
        dependencySystemName: '',
        dependencyDataName: '',
        dependencyProviderName: '',
        dependencyDocumentName: '',
      }));
      setEditingDependencyId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la dependencia.');
    } finally {
      setSaving(false);
    }
  }

  async function saveSharedResource() {
    if (!runId) return;
    const effectiveActivityId = sharedResourceDraft.activityId || selectedActivities[0] || '';
    if (!effectiveActivityId || !sharedResourceDraft.resourceName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const resourceId = editingSharedResourceId || undefined;
      const res = await fetch('/api/structural-risk/wizard-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runSaId: runId,
          sharedResourceInput: {
            mode: resourceId ? 'update' : 'create',
            resourceId,
            activityId: effectiveActivityId,
            resourceName: sharedResourceDraft.resourceName,
            resourceTypeId: sharedResourceDraft.resourceTypeId,
            ownerId: sharedResourceDraft.ownerId || undefined,
            failureEffectId: sharedResourceDraft.failureEffectId,
            dependencyStrengthId: sharedResourceDraft.dependencyStrengthId,
            alternativeLevelId: sharedResourceDraft.alternativeLevelId,
            criticalityCode: sharedResourceDraft.criticalityCode,
          },
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await load(runId);
      setEditingSharedResourceId(null);
      setSharedResourceDraft((prev) => ({
        ...prev,
        resourceName: '',
        resourceTypeId: '',
        ownerId: '',
        failureEffectId: '',
        dependencyStrengthId: '',
        alternativeLevelId: '',
        criticalityCode: '',
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el recurso compartido.');
    } finally {
      setSaving(false);
    }
  }

  async function saveRiskCascade(options?: { resetDraft?: boolean }) {
    if (!runId) return;
    if (!riskCascadeDraft.riskId || !riskCascadeDraft.cascadeCode) return;
    const resetDraft = options?.resetDraft ?? false;
    setSaving(true);
    setError(null);
    try {
      const sig = JSON.stringify({
        editingRiskCascadeId: editingRiskCascadeId || '',
        riskId: riskCascadeDraft.riskId,
        cascadeCode: riskCascadeDraft.cascadeCode,
        affectedResourceId: riskCascadeDraft.affectedResourceId || '',
        notes: riskCascadeDraft.notes || '',
      });
      const res = await fetch('/api/structural-risk/wizard-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runSaId: runId,
          riskCascadeInput: {
            riskCascadeId: editingRiskCascadeId || undefined,
            riskId: riskCascadeDraft.riskId,
            cascadeCode: riskCascadeDraft.cascadeCode,
            affectedResourceId: riskCascadeDraft.affectedResourceId || undefined,
            notes: riskCascadeDraft.notes || undefined,
          },
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: unknown; risk_cascade_id?: string };
      if (!res.ok || !data.ok) {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : (data.error && typeof data.error === 'object' && 'message' in data.error)
              ? String((data.error as { message?: unknown }).message || '')
              : '';
        throw new Error(msg || `HTTP ${res.status}`);
      }
      lastAutoSavedCascadeSigRef.current = sig;
      if (data.risk_cascade_id) setEditingRiskCascadeId(data.risk_cascade_id);
      await load(runId);
      if (resetDraft) {
        setEditingRiskCascadeId(null);
        setRiskCascadeDraft({ riskId: '', cascadeCode: '', affectedResourceId: '', notes: '' });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la cascada.');
    } finally {
      setSaving(false);
    }
  }

  function beginEditRiskCascade(riskCascadeId: string) {
    const row = riskCascades.find((r) => r.risk_cascade_id === riskCascadeId);
    if (!row) return;
    setEditingRiskCascadeId(riskCascadeId);
    const nextDraft = {
      riskId: row.risk_id,
      cascadeCode: row.cascade_code,
      affectedResourceId: row.affected_resource_id || '',
      notes: row.notes || '',
    };
    setRiskCascadeDraft(nextDraft);
    lastAutoSavedCascadeSigRef.current = JSON.stringify({
      editingRiskCascadeId: riskCascadeId,
      riskId: nextDraft.riskId,
      cascadeCode: nextDraft.cascadeCode,
      affectedResourceId: nextDraft.affectedResourceId,
      notes: nextDraft.notes,
    });
  }

  function cancelEditRiskCascade() {
    setEditingRiskCascadeId(null);
    setRiskCascadeDraft({ riskId: '', cascadeCode: '', affectedResourceId: '', notes: '' });
  }

  async function removeRiskCascade(riskCascadeId: string) {
    if (!runId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/structural-risk/wizard-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runSaId: runId, riskCascadeDeleteId: riskCascadeId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await load(runId);
      if (editingRiskCascadeId === riskCascadeId) cancelEditRiskCascade();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la cascada.');
    } finally {
      setSaving(false);
    }
  }

  function beginEditSharedResource(resourceId: string) {
    const row = sharedResources.find((r) => r.resource_id === resourceId && r.activity_id === sharedResourceDraft.activityId)
      || sharedResources.find((r) => r.resource_id === resourceId);
    if (!row) return;
    const findByCode = (list: Array<{ id: string; code: string }>, code: string) => list.find((v) => v.code === code)?.id || '';
    setSharedResourceDraft({
      activityId: row.activity_id,
      resourceName: row.resource_name,
      resourceTypeId: findByCode(dependencyCatalogs.dependencyResources, row.resource_type_code),
      ownerId: row.owner_id || '',
      failureEffectId: findByCode(dependencyCatalogs.failureEffects, row.failure_effect_code),
      dependencyStrengthId: findByCode(dependencyCatalogs.dependencyStrengths, row.dependency_strength_code),
      alternativeLevelId: findByCode(dependencyCatalogs.alternativeLevels, row.alternative_level_code),
      criticalityCode: row.criticality_code,
    });
    setEditingSharedResourceId(resourceId);
  }

  function cancelEditSharedResource() {
    setEditingSharedResourceId(null);
  }

  async function removeSharedResource(activityId: string, resourceId: string) {
    if (!runId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/structural-risk/wizard-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runSaId: runId, sharedResourceDelete: { activityId, resourceId } }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await load(runId);
      if (editingSharedResourceId === resourceId) setEditingSharedResourceId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo remover el recurso compartido.');
    } finally {
      setSaving(false);
    }
  }

  function beginEditDependency(depId: string) {
    const row = dependencies.find((d) => d.id === depId);
    if (!row) return;
    setDependencyDraft((prev) => ({
      ...prev,
      dependencyActivityId: row.dependency_activity_id || '',
      dependencyResourceId: row.dependency_resource_id || '',
      failureEffectId: row.failure_effect_id || '',
      dependencyStrengthId: row.dependency_strength_id || '',
      alternativeLevelId: row.alternative_level_id || '',
      dependencyPersonId: row.dependency_person_id || '',
    }));
    setEditingDependencyId(depId);
  }

  function cancelEditDependency() {
    setEditingDependencyId(null);
  }

  async function removeDependency(depId: string) {
    if (!runId || !depId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/structural-risk/wizard-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runSaId: runId, dependencyDeleteId: depId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await load(runId);
      if (editingDependencyId === depId) setEditingDependencyId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo remover la dependencia.');
    } finally {
      setSaving(false);
    }
  }


  const currentRun = useMemo(() => wizard?.runs.find((r) => r.id === runId) ?? wizard?.currentRun ?? null, [wizard, runId]);

  return {
    loading, saving, error, wizard, runId, title, scopeType, methodology, lifecycleId,
    activities, dependencies, selectedActivities, currentRun,
    people, dependencyCatalogs, dependencyDraft, sharedResources, linearRiskContext, linearControlContext,
    riskCascadeCatalog, riskCascades, riskCascadeDraft,
    riskResourceCatalog,
    editingDependencyId, sharedResourceDraft, editingSharedResourceId, editingRiskCascadeId,
    setTitle, setScopeType, setMethodology, setLifecycleId,
    setDependencyDraft,
    createRun, saveRun, saveRunForStep, completeRun, selectRun, toggleActivity,
    saveDependency, saveSharedResource, saveRiskCascade,
    beginEditDependency, cancelEditDependency, removeDependency,
    setSharedResourceDraft, beginEditSharedResource, cancelEditSharedResource, removeSharedResource,
    setRiskCascadeDraft, beginEditRiskCascade, cancelEditRiskCascade, removeRiskCascade,
  };
}
