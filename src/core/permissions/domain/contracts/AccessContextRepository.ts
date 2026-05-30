import type { AccessContext, ModuleCode } from '@/shared/types';

export interface AccessContextRepository {
  getAccessContext(input: {
    userId: string;
    companyId: string;
    fallbackEmail?: string;
  }): Promise<AccessContext>;
  getEnabledModules(companyId: string): Promise<ModuleCode[]>;
}
