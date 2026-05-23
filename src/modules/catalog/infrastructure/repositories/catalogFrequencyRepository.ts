import prisma from "@/infrastructure/db/prisma/client";
import { CatalogFrequency } from "../../domain/types";
import { randomUUID } from "crypto";

export class CatalogFrequencyRepository {
  async findAll(): Promise<CatalogFrequency[]> {
    const data = await (prisma as any).catalog_activity_frequency.findMany({
      orderBy: [
        { sort_order: "asc" },
        { name: "asc" }
      ],
    });
    return data;
  }

  async create(data: Partial<CatalogFrequency>): Promise<CatalogFrequency> {
    const result = await (prisma as any).catalog_activity_frequency.create({
      data: {
        id: data.id || randomUUID(),
        code: data.code || "",
        name: data.name || "",
        sort_order: Number(data.sort_order) || 0,
        is_active: data.is_active !== false,
      },
    });
    return result;
  }

  async update(id: string, data: Partial<CatalogFrequency>): Promise<CatalogFrequency | null> {
    const result = await (prisma as any).catalog_activity_frequency.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        sort_order: data.sort_order != null ? Number(data.sort_order) : undefined,
        is_active: data.is_active,
      },
    });
    return result;
  }

  async delete(id: string): Promise<void> {
    await (prisma as any).catalog_activity_frequency.delete({
      where: { id },
    });
  }
}

export const catalogFrequencyRepository = new CatalogFrequencyRepository();
