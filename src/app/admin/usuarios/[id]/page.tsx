import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, UserCog } from 'lucide-react';
import UserWizard from '../_components/UserWizard';
import { redirect } from 'next/navigation';
import { requirePageAccess } from '@/core/permissions/http';

export default async function EditUserPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!id || id === 'nuevo') redirect('/admin/usuarios');

  await requirePageAccess({
    module: 'catalog',
    permission: 'W',
    submoduleCode: 'security_users',
    resourceType: 'page',
    path: `/admin/usuarios/${id}`,
  });

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin/usuarios" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '0.5rem', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
          <ArrowLeft size={20} />
        </Link>
        <UserCog style={{ color: 'var(--primary)' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Editar Usuario</h1>
          <p style={{ margin: 0, color: 'var(--secondary)', fontSize: '0.85rem' }}>Modifica los datos del perfil y sus alcances</p>
        </div>
      </div>
      <Suspense fallback={null}>
        <UserWizard key={id} mode="edit" userId={id} />
      </Suspense>
    </div>
  );
}
