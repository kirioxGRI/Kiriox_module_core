import type { AccessControlRepository } from '../../domain/contracts/AccessControlRepository';
import type { AccessPermissionCode, ModuleCode } from '@/shared/types';

export class CheckPermissionUseCase {
  constructor(private readonly repository: AccessControlRepository) {}

  async execute(userId: string, companyId: string, module: ModuleCode, permission: AccessPermissionCode): Promise<boolean> {
    return this.repository.hasPermission(userId, companyId, module, permission);
  }
}
