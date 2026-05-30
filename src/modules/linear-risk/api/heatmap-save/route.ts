import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { withAccess } from "@/core/permissions/http/withAccess";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAVE_DIR = "C:\\_CRE\\mapa";

export const POST = withAccess({ module: "linear-risk", permission: "W", submoduleCode: "heatmap_save" }, async (request) => {
  const body = (await request.json()) as {
    runRaId?: unknown;
    imageBase64?: unknown;
    mode?: unknown;
  };

  const runRaId = String(body.runRaId ?? "").trim();
  if (!UUID.test(runRaId)) {
    return NextResponse.json({ error: "runRaId inválido" }, { status: 400 });
  }

  const imageBase64 = String(body.imageBase64 ?? "").trim();
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 requerido" }, { status: 400 });
  }

  const mode = String(body.mode ?? "inherente").trim();
  const safeName = mode === "residual" ? "residual" : "inherente";
  const filename = `${runRaId}_${safeName}.png`;
  const filepath = join(SAVE_DIR, filename);

  mkdirSync(SAVE_DIR, { recursive: true });
  writeFileSync(filepath, Buffer.from(imageBase64, "base64"));

  return NextResponse.json({ ok: true, path: filepath, filename });
});
