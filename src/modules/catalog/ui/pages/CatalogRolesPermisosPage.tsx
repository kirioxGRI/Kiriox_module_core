import { RolePermissionMatrixPage } from "@/modules/catalog/ui/components/RolePermissionMatrixPage";

export function CatalogRolesPermisosPage() {
  return (
    <RolePermissionMatrixPage
      title="Permisos rol / módulo"
      description="Defina permisos independientes A, R, W y X por rol y módulo."
      itemLabel="Módulo"
      loadUrl="/api/admin/rbac/permissions"
      requestIdField="moduleId"
      closeHref="/modelo/gobernanza/catalogo"
    />
  );
}
