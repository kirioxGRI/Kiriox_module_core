import { redirect } from "next/navigation";
import { getAuthContext } from "@/core/auth/auth-server";
import { getServerAccessContext } from "@/core/permissions/server/getServerAccessContext";
import { buildEnterpriseLaunchpadCards } from "@/modules/core/application/builders/buildEnterpriseLaunchpadCards";
import EnterpriseLaunchpadPage from "@/modules/core/ui/pages/EnterpriseLaunchpadPage";

export default async function MainDashboardPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  // getServerAccessContext uses React.cache() — shared with layout, zero extra DB queries.
  const access = await getServerAccessContext();
  if (!access) redirect("/login");

  const cards = buildEnterpriseLaunchpadCards(access.companySystems, access.enabledSystems);

  return <EnterpriseLaunchpadPage access={access} cards={cards} />;
}
