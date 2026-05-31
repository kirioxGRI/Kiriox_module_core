import { requirePageAccess } from "@/core/permissions/http";
import { SecuritySystemPermissionsPage } from "@/modules/catalog/ui/pages/SecuritySystemPermissionsPage";

export default async function Page() {
  await requirePageAccess({
    module: "catalog",
    permission: "R",
    resourceType: "page",
    path: "/admin/accesos-sistema",
  });

  return <SecuritySystemPermissionsPage />;
}
