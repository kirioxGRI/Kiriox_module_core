import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import prisma from "./client";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isConnectionError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENOTFOUND";
}

// cache() deduplicates calls with the same argument within a single RSC request render.
// Reduces the 3+ sequential resolveEffectiveCompanyId calls per page to 1 DB query.
export const resolveEffectiveCompanyId = cache(async (companyId?: string | null): Promise<string> => {
  const requestedId = String(companyId ?? "").trim();

  try {
    if (UUID_PATTERN.test(requestedId)) {
      const exactRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id::text
        FROM public.company
        WHERE id = ${requestedId}::uuid
        LIMIT 1
      `);

      if (exactRows[0]?.id) {
        return exactRows[0].id;
      }
    }

    const fallbackRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id::text
      FROM public.company
      ORDER BY name ASC NULLS LAST, id ASC
      LIMIT 1
    `);

    if (fallbackRows[0]?.id) {
      return fallbackRows[0].id;
    }
  } catch (err) {
    if (isConnectionError(err)) {
      throw new Error(
        "No hay conexión con la base de datos. Verifique que el servidor de base de datos esté disponible."
      );
    }
    throw err;
  }

  if (UUID_PATTERN.test(requestedId)) {
    return requestedId;
  }

  throw new Error("No se pudo resolver la empresa efectiva del sistema.");
});
