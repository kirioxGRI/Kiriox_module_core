import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/infrastructure/db/prisma/client";
import { withAccess } from "@/core/permissions/http/withAccess";
import { resolveEffectiveCompanyId } from "@/infrastructure/db/prisma/resolveEffectiveCompanyId";

export const GET = withAccess(
  { module: "hechos-relevantes", permission: "write" },
  async (_request, _context, access) => {
    const companyId = await resolveEffectiveCompanyId(access.company.id);

    const incidents = await prisma.$queryRaw<Array<{
      id: string;
      incident_code: string;
      title: string;
      description: string;
      occurred_at: Date;
      detected_at: Date;
      incident_type: string;
      status: string;
      observed_impact: string;
      reported_by: string;
      created_at: Date;
      element_id: string;
      element_code: string | null;
      element_name: string | null;
    }>>(Prisma.sql`
      SELECT
        i.id::text,
        i.incident_code,
        i.title,
        i.description,
        i.occurred_at,
        i.detected_at,
        i.incident_type,
        i.status,
        i.observed_impact,
        i.reported_by,
        i.created_at,
        i.element_id::text,
        e.code AS element_code,
        e.name AS element_name
      FROM public.incident_register i
      JOIN public.elements e ON e.id = i.element_id
      WHERE e.company_id = ${companyId}::uuid
      ORDER BY i.created_at DESC, i.incident_code DESC
    `);

    return NextResponse.json({
      items: incidents.map((incident) => ({
        id: incident.id,
        code: incident.incident_code,
        title: incident.title,
        description: incident.description,
        occurredAt: incident.occurred_at.toISOString(),
        detectedAt: incident.detected_at.toISOString(),
        type: incident.incident_type,
        status: incident.status,
        observedImpact: incident.observed_impact,
        reportedBy: incident.reported_by,
        createdAt: incident.created_at.toISOString(),
        elementId: incident.element_id,
        elementCode: incident.element_code,
        elementName: incident.element_name,
      })),
    });
  },
);

export const DELETE = withAccess(
  { module: "hechos-relevantes", permission: "write" },
  async (request, _context, access) => {
    const url = new URL(request.url);
    const id = String(url.searchParams.get("id") ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    const companyId = await resolveEffectiveCompanyId(access.company.id);
    const incident = await prisma.$queryRaw<Array<{ id: string; element_id: string }>>(Prisma.sql`
      SELECT i.id::text, i.element_id::text
      FROM public.incident_register i
      JOIN public.elements e ON e.id = i.element_id
      WHERE i.id = ${id}::uuid
        AND e.company_id = ${companyId}::uuid
      LIMIT 1
    `);

    if (!incident[0]?.id) {
      return NextResponse.json({ error: "El incidente no existe o no pertenece a la empresa activa." }, { status: 404 });
    }

    await prisma.incident_register.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  },
);
