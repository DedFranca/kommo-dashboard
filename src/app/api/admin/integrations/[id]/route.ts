import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestAdminAccess } from "@/lib/auth-guards";
import {
  deleteKommoIntegrationById,
  updateKommoIntegrationAccessToken,
} from "@/services/kommo-integration.service";
import { recordAudit } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getRequestSession();
  const access = requireRequestAdminAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { accessToken } = body as { accessToken?: string };
  if (!accessToken?.trim()) {
    return NextResponse.json({ error: "Access token é obrigatório." }, { status: 400 });
  }

  const result = await updateKommoIntegrationAccessToken(id, accessToken);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await recordAudit({
    actorId: access.session.userId,
    action: "integration.update_token",
    targetType: "kommoIntegration",
    targetId: id,
  });

  return NextResponse.json({
    ok: true,
    integration: {
      id: result.integration.id,
      name: result.integration.name,
      subdomain: result.integration.subdomain,
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getRequestSession();
  const access = requireRequestAdminAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await params;

  try {
    const row = await deleteKommoIntegrationById(id);
    await recordAudit({
      actorId: access.session.userId,
      action: "integration.delete",
      targetType: "kommoIntegration",
      targetId: id,
      metadata: { tenantId: row.tenantId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao excluir integração.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
