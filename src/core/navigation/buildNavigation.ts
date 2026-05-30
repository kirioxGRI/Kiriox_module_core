import type { NavItem } from '@/shared/types';
import { kirioxModuleRegistry } from '@/core/module-registry';

export type NavigationAccessContext = {
  enabledModules: string[];
};

export function buildNavigation(access: NavigationAccessContext): NavItem[] {
  return kirioxModuleRegistry
    .list()
    .filter((mod) => mod.manifest.nav !== undefined)
    .filter((mod) => access.enabledModules.includes(mod.manifest.id))
    .map((mod) => ({
      key: mod.manifest.id,
      label: mod.manifest.nav!.label,
      href: mod.manifest.nav!.href,
      icon: mod.manifest.nav!.icon,
      order: mod.manifest.nav!.order,
      module: mod.manifest.id,
      permission: mod.manifest.nav!.permission,
      backgroundColor: mod.manifest.backgroundColor,
    }))
    .sort((a, b) => a.order - b.order);
}
