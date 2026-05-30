'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Search, ArrowLeft, ShieldCheck, Edit3, Lock, Trash2, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { getCsrfTokenFromDocument } from '@/core/auth/client-csrf';
import { useRouter } from 'next/navigation';

interface UserRow {
  id: string;
  name: string | null;
  lastName?: string | null;
  email: string;
  companyName?: string | null;
  roles?: { roleCode: string; roleName?: string | null }[];
  isActive: boolean;
  activationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null);
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 401 || res.status === 403) { router.replace('/login'); return; }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'No se pudo cargar usuarios.');
        return;
      }
      setUsers(await res.json());
    } catch {
      setError('Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u => {
      const name = `${u.name ?? ''} ${u.lastName ?? ''}`.trim().toLowerCase();
      return name.includes(term) || u.email.toLowerCase().includes(term);
    });
  }, [users, search]);

  const handleToggleActive = async (user: UserRow) => {
    const csrf = getCsrfTokenFromDocument();
    if (!csrf) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) { await fetchUsers(); }
      else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se pudo actualizar el estado del usuario.');
      }
    } catch {
      setError('Error al actualizar el estado del usuario.');
    }
  };

  const handleOpenResetDialog = (user: UserRow) => {
    setResetPasswordUser(user);
    setResetForm({ newPassword: '', confirmPassword: '' });
    setResetError(null);
    setResetSuccess(false);
  };

  const submitPasswordReset = async () => {
    if (!resetPasswordUser) return;
    if (!resetForm.newPassword) { setResetError('La contraseña no puede estar en blanco.'); return; }
    if (resetForm.newPassword !== resetForm.confirmPassword) { setResetError('Las contraseñas no coinciden.'); return; }
    setIsResetting(true);
    setResetError(null);
    const csrf = getCsrfTokenFromDocument();
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) },
        body: JSON.stringify({ password: resetForm.newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setResetError(data.error || 'Error al restablecer contraseña.');
        return;
      }
      setResetSuccess(true);
      setTimeout(() => setResetPasswordUser(null), 2000);
    } catch {
      setResetError('Error del servidor al restablecer contraseña.');
    } finally {
      setIsResetting(false);
    }
  };

  if (!mounted) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--secondary)' }}>Cargando administración...</div>;
  }

  const renderTable = (isActiveList: boolean) => {
    const title = isActiveList ? 'Usuarios Activos' : 'Usuarios Inactivos';
    const list = filteredUsers.filter(u => u.isActive === isActiveList);

    return (
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginTop: isActiveList ? 0 : '2rem' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0, color: isActiveList ? 'var(--foreground)' : '#fca5a5' }}>{title}</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
              {['#', 'Nombre', 'Email', 'Empresa', 'Rol', 'Fechas', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '1rem 1.5rem', textAlign: h === 'Acciones' ? 'right' : 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8rem' }}>Cargando datos...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary)' }}>No se encontraron {title.toLowerCase()}.</td></tr>
            ) : list.map((user, index) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)', opacity: isActiveList ? 1 : 0.6 }}>
                <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 'bold' }}>{index + 1}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                      {user.name?.[0] || user.email[0]}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>{`${user.name ?? ''} ${user.lastName ?? ''}`.trim() || 'Sin nombre'}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--secondary)' }}>{user.roles?.[0]?.roleName || user.roles?.[0]?.roleCode || 'Sin Rol'}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>{user.email}</td>
                <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--secondary)' }}>{user.companyName || 'Sin Empresa'}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.5rem', borderRadius: 6, border: '1px solid var(--glass-border)', color: user.roles?.some(r => r.roleCode === 'super_admin') ? 'var(--primary)' : 'var(--secondary)', background: 'rgba(255,255,255,0.02)' }}>
                    {user.roles?.map(r => r.roleCode).join(', ') || 'Sin Rol'}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--secondary)' }}>
                  <div suppressHydrationWarning>C: {new Date(user.createdAt).toLocaleDateString()}</div>
                  <div suppressHydrationWarning>A: {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Pendiente'}</div>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    {isActiveList && (
                      <>
                        <button onClick={() => handleOpenResetDialog(user)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '0.4rem', cursor: 'pointer', color: '#fbbf24', display: 'flex', alignItems: 'center' }} title="Reset password">
                          <Lock size={16} />
                        </button>
                        <Link href={`/admin/usuarios/${user.id}`} style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '0.4rem', cursor: 'pointer', color: 'var(--primary)', alignItems: 'center' }} title="Editar">
                          <Edit3 size={16} />
                        </Link>
                        <button onClick={() => { if (window.confirm(`¿Desea inactivar el usuario "${user.email}"?`)) handleToggleActive(user); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '0.4rem', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center' }} title="Inactivar">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {!isActiveList && (
                      <button onClick={() => { if (window.confirm(`¿Desea reactivar el usuario "${user.email}"?`)) handleToggleActive(user); }} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '0.4rem', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center' }} title="Reactivar">
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <Link href="/admin" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
          <ArrowLeft size={20} />
        </Link>
        <Users style={{ color: 'var(--primary)' }} />
        <h1 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>Gestión de Usuarios</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <p style={{ color: 'var(--secondary)', margin: 0, maxWidth: '600px' }}>
          Administre el acceso institucional y la gobernanza de identidades para el cumplimiento regulatorio.
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/modelo/gobernanza/catalogo')} style={{ border: '1px solid rgba(148,163,184,0.45)', background: 'rgba(30,41,59,0.55)', color: '#e2e8f0', borderRadius: 10, padding: '0.75rem 1.25rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            Cerrar
          </button>
          <Link href="/admin/usuarios/nuevo" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            + Crear usuario
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05rem', marginBottom: '0.5rem' }}>Total Usuarios</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--foreground)', margin: 0 }}>{users.length}</p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05rem', marginBottom: '0.5rem' }}>Administradores</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{users.filter(u => u.roles?.some(r => r.roleCode === 'super_admin')).length}</p>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gridColumn: 'span 2' }}>
          <Search size={18} style={{ color: 'var(--secondary)', marginRight: '1rem' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o correo..." style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--foreground)', width: '100%', fontSize: '0.9rem' }} />
        </div>
      </div>

      {error && <div className="glass-card" style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1.5rem' }}>{error}</div>}

      {renderTable(true)}
      {renderTable(false)}



      {resetPasswordUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: 400, padding: '2rem', position: 'relative' }}>
            <button onClick={() => setResetPasswordUser(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer' }}><X size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Lock style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0 }}>Restablecer Contraseña</h3>
            </div>
            <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Establecer nueva contraseña para <strong style={{ color: 'white' }}>{resetPasswordUser.email}</strong>
            </p>
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              {(['newPassword', 'confirmPassword'] as const).map(field => (
                <div key={field}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                    {field === 'newPassword' ? 'Nueva Contraseña' : 'Confirmar Contraseña'}
                  </label>
                  <input type="password" value={resetForm[field]} onChange={e => setResetForm({ ...resetForm, [field]: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'white' }} />
                </div>
              ))}
            </div>
            {resetError && <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>{resetError}</div>}
            {resetSuccess && <div style={{ color: '#10b981', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} /> Contraseña actualizada</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={submitPasswordReset} disabled={isResetting || resetSuccess} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer', opacity: (isResetting || resetSuccess) ? 0.7 : 1 }}>
                {isResetting ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
