import { CatalogDashboardPage } from "@/modules/catalog/ui/pages/CatalogDashboardPage";
import { requirePageAccess } from "@/core/permissions/http";

export default async function CatalogRoutePage() {
  await requirePageAccess({
    module: "catalog",
    permission: "A",
    resourceType: "page",
    path: "/modelo/gobernanza/catalogo",
  });

  return <CatalogDashboardPage />;
}
