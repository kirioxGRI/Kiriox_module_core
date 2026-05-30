import type { AccessPermissionCode, ModuleCode } from '@/shared/types';

export interface AccessControlRepository {
  userBelongsToCompany(userId: string, companyId: string): Promise<boolean>;
  isModuleEnabled(companyId: string, module: ModuleCode): Promise<boolean>;
  hasPermission(userId: string, companyId: string, module: ModuleCode, permission: AccessPermissionCode): Promise<boolean>;
}
