export type ModuleCode =
  | 'core'
  | 'catalog'
  | 'company'
  | 'incident'
  | 'linear-risk'
  | 'structural-risk'
  | 'simulation'
  | 'monitoring'
  | 'hechos-relevantes'
  | 'reportes'
  | 'plugins';

export type AccessPermissionCode = 'A' | 'R' | 'W' | 'X';

export type AccessRequirement = {
  module: ModuleCode;
  permission: AccessPermissionCode;
  submoduleCode?: string;
  resourceType?: string;
};

export type AccessDecisionInput = {
  userId: string;
  companyId: string;
  module: ModuleCode;
  permission: AccessPermissionCode;
};
