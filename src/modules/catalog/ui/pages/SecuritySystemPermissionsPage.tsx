import { RolePermissionMatrixPage } from "@/modules/catalog/ui/components/RolePermissionMatrixPage";

export function SecuritySystemPermissionsPage() {
  return (
    <RolePermissionMatrixPage
      title="Permisos rol / sistema"
      description="Administre acceso, lectura, escritura y ejecución directamente por sistema corporativo."
      itemLabel="Sistema"
      loadUrl="/api/admin/rbac/system-permissions"
      requestIdField="systemId"
      closeHref="/main_dashboard"
    />
  );
}
