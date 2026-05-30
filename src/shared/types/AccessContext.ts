import type { AccessPermissionCode, ModuleCode } from './AccessControlTypes';
import type { NavItem } from './NavigationTypes';

export type ModuleAccessFlags = Record<AccessPermissionCode, boolean>;

export type ModuleAccessEntry = {
  moduleId: ModuleCode;
  securityModuleId: string;
  securityModuleCode: string;
  name: string;
  permissions: ModuleAccessFlags;
};

export type AccessContext = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    code: string;
    name: string;
  };
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  companyModules: ModuleCode[];
  moduleAccess: Partial<Record<ModuleCode, ModuleAccessEntry>>;
  enabledModules: ModuleCode[];
  navigation: NavItem[];
};
