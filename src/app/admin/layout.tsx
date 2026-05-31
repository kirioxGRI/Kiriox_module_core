import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/core/auth/auth-server';
import { requirePageAccess } from '@/core/permissions/http';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // ── Super-admin gate ──────────────────────────────────────────────
  // Only the email defined in SUPER_ADMIN_ACCESS can access /admin.
  const auth = await getAuthContext();
  const superAdminEmail = process.env.SUPER_ADMIN_ACCESS?.replace(/"/g, '').trim().toLowerCase();

  if (!auth?.email || auth.email.toLowerCase() !== superAdminEmail) {
    redirect('/main_dashboard');
  }

  await requirePageAccess({
    module: 'catalog',
    permission: 'R',
    resourceType: 'page',
    path: '/admin',
  });

  return children;
}
