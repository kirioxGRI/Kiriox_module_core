import { CatalogRolesPermisosPage } from "@/modules/catalog/ui/pages/CatalogRolesPermisosPage";
import { requirePageAccess } from "@/core/permissions/http";

export default async function Page() {
  await requirePageAccess({
    module: "catalog",
    permission: "R",
    submoduleCode: "role_module_permissions",
    resourceType: "page",
    path: "/modelo/gobernanza/catalogo/roles-permisos",
  });

  return <CatalogRolesPermisosPage />;
}
