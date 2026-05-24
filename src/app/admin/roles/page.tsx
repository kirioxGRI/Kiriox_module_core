'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Shield, Edit3, Trash2, Plus, X, Search, ArrowLeft, Ban, RefreshCcw } from 'lucide-react';
import RoleEditorModal from './RoleEditorModal';

interface RoleRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string | null;
  _count?: { company_user_roles: number };
}

export default function RolesDashboard() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);

  async function loadRoles() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rbac?includeInactive=true');
      if (!res.ok) throw new Error('Error al cargar roles');
      const data = await res.json();
      setRoles(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRoles(); }, []);

  const handleToggleActive = async (id: string, newState: boolean) => {
    if (!newState && !window.confirm('¿Desea inactivar este rol?')) return;
    try {
      const res = await fetch('/api/admin/rbac', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: newState }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      loadRoles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Desea inactivar este rol?')) return;
    try {
      const res = await fetch(`/api/admin/rbac?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      loadRoles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleSave = async (data: Record<string, unknown>) => {
    const res = await fetch('/api/admin/rbac', {
      method: data.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar');
    }
    loadRoles();
  };

  const filteredRoles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter(r => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term));
  }, [roles, searchTerm]);

  const activeRoles = filteredRoles.filter(r => r.is_active !== false);
  const inactiveRoles = filteredRoles.filter(r => r.is_active === false);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div className="section-header" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/admin" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>
          <ArrowLeft size={24} />
        </Link>
        <Shield size={28} style={{ color: 'var(--primary)' }} />
        <h1 className="gradient-text" style={{ fontSize: '2rem', margin: 0, fontWeight: 900 }}>Administración de Roles</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <p style={{ color: 'var(--secondary)', margin: 0, maxWidth: '600px', fontSize: '1rem' }}>
          Estructure la jerarquía de acceso y gobierne las capacidades operativas de Kiriox.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => { setSelectedRole(null); setIsModalOpen(true); }}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <Plus size={20} /> Crear Nuevo Rol
          </button>
          <Link
            href="/modelo/gobernanza/catalogo"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <X size={18} /> Cerrar
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05rem', marginBottom: '0.5rem' }}>Roles Activos</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--foreground)', margin: 0 }}>{activeRoles.length}</p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05rem', marginBottom: '0.5rem' }}>En Desuso</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fca5a5', margin: 0 }}>{inactiveRoles.length}</p>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gridColumn: 'span 2' }}>
          <Search size={18} style={{ color: 'var(--secondary)', marginRight: '1rem' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o código de rol..."
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--foreground)', width: '100%', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1.5rem' }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--secondary)', fontSize: '0.8rem' }}>Cargando matriz de acceso...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <RoleTable title="Roles Activos" roles={activeRoles} isActiveList={true} onEdit={(r) => { setSelectedRole(r); setIsModalOpen(true); }} onToggle={handleToggleActive} onDelete={handleDelete} />
          {inactiveRoles.length > 0 && (
            <RoleTable title="Roles Inactivos" roles={inactiveRoles} isActiveList={false} onEdit={(r) => { setSelectedRole(r); setIsModalOpen(true); }} onToggle={handleToggleActive} onDelete={handleDelete} />
          )}
        </div>
      )}

      <RoleEditorModal isOpen={isModalOpen} role={selectedRole as Record<string, unknown> | null} onClose={() => setIsModalOpen(false)} onSave={handleSave} />
    </div>
  );
}

function RoleTable({ title, roles, isActiveList, onEdit, onToggle, onDelete }: {
  title: string;
  roles: RoleRecord[];
  isActiveList: boolean;
  onEdit: (r: RoleRecord) => void;
  onToggle: (id: string, state: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, color: isActiveList ? 'var(--foreground)' : '#fca5a5' }}>{title}</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
              {['#', 'Nombre del Rol', 'Descripción', 'Usuarios', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '1rem 1.5rem', textAlign: h === 'Acciones' ? 'right' : h === 'Usuarios' ? 'center' : 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ opacity: isActiveList ? 1 : 0.6 }}>
            {roles.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8rem' }}>No hay roles para mostrar.</td></tr>
            ) : roles.map((role, index) => (
              <tr key={role.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 'bold' }}>{index + 1}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'white' }}>{role.name}</div>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', maxWidth: '500px', lineHeight: '1.4' }}>{role.description || 'Sin descripción.'}</div>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 800 }}>
                    {role._count?.company_user_roles ?? 0}
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => onEdit(role)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', padding: '0.4rem', borderRadius: '6px' }} title="Configurar Rol">
                      <Edit3 size={18} />
                    </button>
                    {isActiveList ? (
                      <>
                        <button onClick={() => onToggle(role.id, false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', padding: '0.4rem', borderRadius: '6px' }} title="Inactivar">
                          <Ban size={18} />
                        </button>
                        <button onClick={() => onDelete(role.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.4rem' }} title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => onToggle(role.id, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '0.4rem', borderRadius: '6px' }} title="Reactivar">
                        <RefreshCcw size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
