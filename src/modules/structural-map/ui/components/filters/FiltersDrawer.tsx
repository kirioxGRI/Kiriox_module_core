'use client';

import { SlidersHorizontal, RefreshCw } from 'lucide-react';
import type { StructuralMapFilterGroup } from '@/modules/structural-map/domain/types/FilterTypes';
import styles from './FiltersDrawer.module.css';

type Props = {
  rightOffset?: number;
  groups: StructuralMapFilterGroup[];
  viewCode: string;
  depth: number | null;
  mode: string | null;
  criticalityCodes: string[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onReload: () => void;
  onReset: () => void;
  onSelectView: (viewCode: string) => void;
  onSelectDepth: (depth: number) => void;
  onSelectMode: (mode: string) => void;
  onToggleCriticality: (code: string) => void;
};

function isOptionActive(params: {
  groupCode: string;
  optionValue: string;
  viewCode: string;
  depth: number | null;
  mode: string | null;
  criticalityCodes: string[];
}) {
  const { groupCode, optionValue, viewCode, depth, mode, criticalityCodes } = params;
  if (groupCode === 'view_selector') return viewCode === optionValue;
  if (groupCode === 'depth') return String(depth) === optionValue;
  if (groupCode === 'mode') return mode === optionValue;
  if (groupCode === 'criticality') return criticalityCodes.includes(optionValue);
  return false;
}

export function FiltersDrawer(props: Props) {
  const {
    rightOffset = 0,
    groups,
    viewCode,
    depth,
    mode,
    criticalityCodes,
    isLoading,
    isSaving,
    error,
    onClose,
    onReload,
    onReset,
    onSelectView,
    onSelectDepth,
    onSelectMode,
    onToggleCriticality,
  } = props;

  return (
    <aside className={styles.drawer} style={{ right: `${rightOffset}px` }}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <SlidersHorizontal size={13} />
          <span>Filtros</span>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose}>✕</button>
      </div>

      <div className={styles.body}>
        <div className={styles.toolbar}>
          <button type="button" className={styles.secondaryButton} onClick={onReset}>Restablecer</button>
          <button type="button" className={styles.secondaryButton} onClick={onReload}>
            <RefreshCw size={12} />
            Recargar
          </button>
        </div>

        {isLoading ? (
          <div className={styles.loadingCard}>
            <div className={styles.spinner} />
            <p>Cargando configuración de filtros…</p>
          </div>
        ) : error ? (
          <div className={styles.errorCard}>
            <p>{error}</p>
          </div>
        ) : (
          <div className={styles.groupList}>
            {groups.map((group) => (
              <section key={group.id} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <span>{group.name}</span>
                  {group.code === 'criticality' && <small>multiselección</small>}
                </div>
                <div className={styles.optionsWrap}>
                  {group.options.map((option) => {
                    const active = isOptionActive({
                      groupCode: group.code,
                      optionValue: option.value,
                      viewCode,
                      depth,
                      mode,
                      criticalityCodes,
                    });

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={active ? styles.optionActive : styles.option}
                        onClick={() => {
                          if (group.code === 'view_selector') onSelectView(option.value);
                          if (group.code === 'depth') onSelectDepth(Number(option.value));
                          if (group.code === 'mode') onSelectMode(option.value);
                          if (group.code === 'criticality') onToggleCriticality(option.value);
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerText}>{isSaving ? 'Guardando preferencia…' : 'Preferencias por entidad activas'}</span>
      </div>
    </aside>
  );
}
