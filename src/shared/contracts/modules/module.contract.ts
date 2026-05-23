export type KirioxModuleFamily =
  | "platform"
  | "risk"
  | "marketplace";

export type KirioxOfficialModuleId =
  | "core"
  | "incident"
  | "linear-risk"
  | "monitoring"
  | "hechos-relevantes"
  | "structural-risk"
  | "simulation"
  | "catalog"
  | "company"
  | "reportes"
  | "plugins";

export type KirioxModuleStatus =
  | "active"
  | "disabled"
  | "experimental";

export type KirioxModuleLayer =
  | "domain"
  | "application"
  | "infrastructure"
  | "api"
  | "ui";

export interface KirioxModuleNavDeclaration {
  label: string;
  href: string;
  icon: string;
  order: number;
  permission?: string;
}

export interface KirioxModuleManifest {
  id: KirioxOfficialModuleId;
  family: KirioxModuleFamily;
  name: string;
  version: string;
  description?: string;
  status: KirioxModuleStatus;
  layers: KirioxModuleLayer[];
  dependencies?: KirioxOfficialModuleId[];
  nav?: KirioxModuleNavDeclaration;
  backgroundColor?: string;
}

export interface KirioxModuleContext {
  core: unknown;
}

export interface KirioxModuleContract {
  manifest: KirioxModuleManifest;
  register(context: KirioxModuleContext): Promise<void> | void;
  activate?(): Promise<void> | void;
  deactivate?(): Promise<void> | void;
}
