import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Prisma } from "@/generated/prisma/client";
import { withAccess } from "@/core/permissions/http/withAccess";
import prisma from "@/infrastructure/db/prisma/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE_DIR = "C:\\_CRE\\evidencias";
const ALLOWED_EXT = new Set(["doc", "docx", "pdf", "jpg", "jpeg", "png", "xls", "xlsx"]);
const MAX_BYTES = 2 * 1024 * 1024;

export const GET = withAccess({ module: "linear-risk", permission: "R", submoduleCode: "evidence_upload" }, async (request) => {
  const url = new URL(request.url);
  const runRaId = url.searchParams.get("runRaId") ?? "";
  const riskId = url.searchParams.get("riskId") ?? "";
  const controlId = url.searchParams.get("controlId") ?? "";

  if (!UUID.test(runRaId)) return NextResponse.json({ error: "runRaId inválido" }, { status: 400 });
  if (!UUID.test(riskId)) return NextResponse.json({ error: "riskId inválido" }, { status: 400 });
  if (!UUID.test(controlId)) return NextResponse.json({ error: "controlId inválido" }, { status: 400 });

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT e.id::text, e.title, e.file_url, e.evidence_type, e.validity_status,
           e.collected_at,
           c.name AS control_name
    FROM public.run_ra_evidence e
    LEFT JOIN public.run_ra_controls c ON c.id = e.run_ra_control_id
    WHERE e.run_ra_id = ${runRaId}::uuid
      AND e.run_ra_risk_id = ${riskId}::uuid
      AND e.run_ra_control_id = ${controlId}::uuid
    ORDER BY e.collected_at DESC
  `);

  return NextResponse.json({ evidences: rows });
});

export const POST = withAccess({ module: "linear-risk", permission: "W", submoduleCode: "evidence_upload" }, async (request, _context, access) => {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const runRaId = String(formData.get("runRaId") ?? "").trim();
  const controlId = String(formData.get("controlId") ?? "").trim();
  const riskId = String(formData.get("riskId") ?? "").trim();

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  if (!UUID.test(runRaId)) return NextResponse.json({ error: "runRaId inválido" }, { status: 400 });
  if (!UUID.test(controlId)) return NextResponse.json({ error: "controlId inválido" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "El archivo excede 2 MB" }, { status: 400 });

  const now = new Date();
  const stamp = `${now.toISOString().split("T")[0]}-${now.toTimeString().split(" ")[0].replace(/:/g, "-")}`;
  const fileName = `ev-${runRaId.slice(0, 8)}-${controlId.slice(0, 8)}-${stamp}.${ext}`;
  const targetDir = join(BASE_DIR, runRaId);
  mkdirSync(targetDir, { recursive: true });
  const filePath = join(targetDir, fileName);
  writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

  const validRiskId = UUID.test(riskId) ? riskId : null;
  const userId = UUID.test(access.user.id) ? access.user.id : null;

  await prisma.$queryRaw(Prisma.sql`
    INSERT INTO public.run_ra_evidence
      (run_ra_id, run_ra_risk_id, run_ra_control_id, evidence_type, title, file_url, collected_by, validity_status)
    VALUES
      (${runRaId}::uuid, ${validRiskId}::uuid, ${controlId}::uuid,
       'DOCUMENT', ${file.name}, ${filePath}, ${userId}::uuid, 'VALID')
  `);

  return NextResponse.json({ ok: true, filePath, fileName });
});
