import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';

export type EntityColorMap = {
  /** Color por code de systemic_entity_types (ej. CONTROL, RISK). */
  byType: Record<string, string>;
  /** Color para cualquier tipo no listado (fila DEFAULT, appliedto IS NULL). */
  fallback: string;
};

/** Fucsia intenso por defecto si la tabla aún no tiene fila DEFAULT. */
const HARD_FALLBACK = '#d946ef';

export class PrismaEntityColorRepository {
  async getColorMap(): Promise<EntityColorMap> {
    const rows = await prisma.$queryRaw<{ color_code: string; appliedto: string | null }[]>(Prisma.sql`
      SELECT color_code, appliedto
      FROM systemic_entity_color
    `);

    const byType: Record<string, string> = {};
    let fallback = HARD_FALLBACK;

    for (const row of rows) {
      if (row.appliedto) {
        byType[row.appliedto] = row.color_code;
      } else {
        fallback = row.color_code;
      }
    }

    return { byType, fallback };
  }
}
