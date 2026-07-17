import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestAdminAccess } from "@/lib/auth-guards";
import { deleteKommoIntegrationById } from "@/services/kommo-integration.service";
import { recordAudit } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

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
