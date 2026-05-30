import { requirePageAccess } from "@/core/permissions/http";
import { CatalogAccessLoggingPage } from "@/modules/catalog/ui/pages/CatalogAccessLoggingPage";

export default async function LoggingAccesosPage() {
  await requirePageAccess({
    module: "catalog",
    permission: "R",
    submoduleCode: "access_logs",
    resourceType: "page",
    path: "/modelo/gobernanza/catalogo/logging-accesos",
  });

  return <CatalogAccessLoggingPage />;
}
