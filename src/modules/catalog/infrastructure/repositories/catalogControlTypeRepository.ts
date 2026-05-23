import prisma from "@/infrastructure/db/prisma/client";
import { CatalogControlType } from "../../domain/types";
import { randomUUID } from "crypto";

export class CatalogControlTypeRepository {
  async findAll(): Promise<CatalogControlType[]> {
    const data = await (prisma as any).catalog_control_type.findMany({
      orderBy: { code: "asc" },
    });
    return data;
  }

  async create(data: Partial<CatalogControlType>): Promise<CatalogControlType> {
    const result = await (prisma as any).catalog_control_type.create({
      data: {
        id: data.id || randomUUID(),
        code: data.code || "",
        name: data.name || "",
        description: data.description || null,
        control_nature: data.control_nature || null,
        mitigates_probability: data.mitigates_probability || false,
        mitigates_impact: data.mitigates_impact || false,
        detects_event: data.detects_event || false,
        enables_response: data.enables_response || false,
        is_hard_gate: data.is_hard_gate || false,
        status_id: Number(data.status_id) || 1,
      },
    });
    return result;
  }

  async update(id: string, data: Partial<CatalogControlType>): Promise<CatalogControlType | null> {
    const result = await (prisma as any).catalog_control_type.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        control_nature: data.control_nature,
        mitigates_probability: data.mitigates_probability,
        mitigates_impact: data.mitigates_impact,
        detects_event: data.detects_event,
        enables_response: data.enables_response,
        is_hard_gate: data.is_hard_gate,
        status_id: data.status_id != null ? Number(data.status_id) : undefined,
        updated_at: new Date()
      },
    });
    return result;
  }

  async delete(id: string): Promise<void> {
    await (prisma as any).catalog_control_type.delete({
      where: { id },
    });
  }
}

export const catalogControlTypeRepository = new CatalogControlTypeRepository();
