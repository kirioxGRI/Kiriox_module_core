import type { ReactNode } from 'react';
import { requirePageAccess } from '@/core/permissions/http';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePageAccess({
    module: 'catalog',
    permission: 'R',
    resourceType: 'page',
    path: '/admin',
  });

  return children;
}
