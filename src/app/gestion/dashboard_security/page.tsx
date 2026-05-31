import { requireSystemPageAccess } from "@/core/permissions/http";
import { SecuritySystemPermissionsPage } from "@/modules/catalog/ui/pages/SecuritySystemPermissionsPage";

export default async function Page() {
  await requireSystemPageAccess({
    system: "security",
    permission: "A",
    submoduleCode: "role_system_permissions",
    resourceType: "page",
    path: "/gestion/dashboard_security",
  });

  return <SecuritySystemPermissionsPage />;
}
