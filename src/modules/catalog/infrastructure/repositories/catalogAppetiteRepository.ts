import prisma from "@/infrastructure/db/prisma/client";
import { CatalogAppetite } from "../../domain/types";
import { randomUUID } from "crypto";

export class CatalogAppetiteRepository {
  async findAll(): Promise<CatalogAppetite[]> {
    const data = await (prisma as any).catalog_appetite.findMany({
      orderBy: [
        { appetite_level: "asc" },
        { effective_from: "desc" },
        { created_at: "desc" }
      ],
    });
    return data;
  }

  async create(data: Partial<CatalogAppetite>): Promise<CatalogAppetite> {
    const result = await (prisma as any).catalog_appetite.create({
      data: {
        id: data.id || randomUUID(),
        code: data.code || "",
        scope_type: data.scope_type || "GLOBAL",
        scope_id: data.scope_id || "00000000-0000-0000-0000-000000000000",
        appetite_level: data.appetite_level || "",
        tolerance_min: data.tolerance_min != null ? Number(data.tolerance_min) : null,
        tolerance_max: data.tolerance_max != null ? Number(data.tolerance_max) : null,
        metric_name: data.metric_name || "",
        metric_unit: data.metric_unit || null,
        effective_from: data.effective_from ? new Date(data.effective_from) : new Date(),
        is_active: data.is_active || "ACTIVE",
      },
    });
    return result;
  }

  async update(id: string, data: Partial<CatalogAppetite>): Promise<CatalogAppetite | null> {
    const result = await (prisma as any).catalog_appetite.update({
      where: { id },
      data: {
        code: data.code,
        scope_type: data.scope_type,
        appetite_level: data.appetite_level,
        tolerance_min: data.tolerance_min != null ? Number(data.tolerance_min) : null,
        tolerance_max: data.tolerance_max != null ? Number(data.tolerance_max) : null,
        metric_name: data.metric_name,
        metric_unit: data.metric_unit,
        effective_from: data.effective_from ? new Date(data.effective_from) : undefined,
        is_active: data.is_active,
        updated_at: new Date()
      },
    });
    return result;
  }

  async delete(id: string): Promise<void> {
    await (prisma as any).catalog_appetite.delete({
      where: { id },
    });
  }
}

export const catalogAppetiteRepository = new CatalogAppetiteRepository();
