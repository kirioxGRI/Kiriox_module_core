import { cache } from "react";
import { getAuthContext } from "@/core/auth/auth-server";
import { GetAccessContextUseCase } from "@/core/permissions/application/use-cases/GetAccessContextUseCase";
import { PrismaAccessContextRepository } from "@/core/permissions/infrastructure/PrismaAccessContextRepository";
import type { AccessContext } from "@/shared/types";

const repo = new PrismaAccessContextRepository();
const useCase = new GetAccessContextUseCase(repo);

/**
 * Returns the access context for the current request.
 * React.cache() deduplicates calls within the same RSC render pass —
 * layout + page + requirePageAccess all share a single DB fetch per request.
 */
export const getServerAccessContext = cache(async (): Promise<AccessContext | null> => {
  const auth = await getAuthContext();
  if (!auth) return null;

  return useCase.execute({
    userId: auth.userId,
    companyId: auth.tenantId,
    fallbackEmail: auth.email,
  });
});
