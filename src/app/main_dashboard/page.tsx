import { redirect } from "next/navigation";
import { bootstrapCore } from "@/core/core-bootstrap";
import { getAuthContext } from "@/core/auth/auth-server";
import { GetAccessContextUseCase } from "@/core/permissions/application/use-cases/GetAccessContextUseCase";
import { PrismaAccessContextRepository } from "@/core/permissions/infrastructure/PrismaAccessContextRepository";
import { kirioxModuleRegistry } from "@/core/module-registry";
import { resolveEffectiveCompanyId } from "@/infrastructure/db/prisma/resolveEffectiveCompanyId";
import { buildEnterpriseLaunchpadCards } from "@/modules/core/application/builders/buildEnterpriseLaunchpadCards";
import EnterpriseLaunchpadPage from "@/modules/core/ui/pages/EnterpriseLaunchpadPage";

bootstrapCore();

export default async function MainDashboardPage() {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/login");
  }

  const companyId = await resolveEffectiveCompanyId(auth.tenantId);
  const useCase = new GetAccessContextUseCase(new PrismaAccessContextRepository());
  const access = await useCase.execute({
    userId: auth.userId,
    companyId,
    fallbackEmail: auth.email,
  });

  const cards = buildEnterpriseLaunchpadCards(kirioxModuleRegistry.list(), access.navigation);

  return <EnterpriseLaunchpadPage access={access} cards={cards} />;
}
