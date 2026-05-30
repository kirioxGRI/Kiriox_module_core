import { NextResponse } from "next/server";
import { withAccess } from "@/core/permissions/http/withAccess";
import { installPluginPackage } from "@/core/plugin-engine/plugin-installer";

export const POST = withAccess(
  { module: "plugins", permission: "X", submoduleCode: "install_package", resourceType: "plugin_package" },
  async (request) => {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Debe adjuntar un archivo .zip." }, { status: 400 });
  }

  try {
    const result = await installPluginPackage(file);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No se pudo instalar el plugin.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
