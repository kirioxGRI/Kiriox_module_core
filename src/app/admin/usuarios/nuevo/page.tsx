import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import UserWizard from '../_components/UserWizard';
import { requirePageAccess } from '@/core/permissions/http';

export const dynamic = 'force-dynamic';

export default async function NewUserPage() {
  await requirePageAccess({
    module: 'catalog',
    permission: 'W',
    submoduleCode: 'security_users',
    resourceType: 'page',
    path: '/admin/usuarios/nuevo',
  });

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/admin/usuarios" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </Link>
          <UserPlus style={{ color: 'var(--primary)' }} />
          <h1 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>Crear Usuario</h1>
        </div>
        <Link href="/admin/usuarios" style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--glass-border)', padding: '0.5rem 1rem', borderRadius: 10, color: '#94a3b8', textDecoration: 'none' }}>
          Cerrar
        </Link>
      </div>
      <Suspense fallback={null}>
        <UserWizard mode="create" />
      </Suspense>
    </div>
  );
}
