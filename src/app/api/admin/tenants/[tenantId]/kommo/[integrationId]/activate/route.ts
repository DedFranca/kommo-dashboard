import { NextResponse } from "next/server";
import { canManageTenant, getRequestSession } from "@/lib/auth/request-session";
import { setActiveKommoIntegration } from "@/services/kommo-integration.service";

type Params = { params: Promise<{ tenantId: string; integrationId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getRequestSession();
  const { tenantId, integrationId } = await params;
  if (
    !session ||
    (session.platformRole !== "SUPER_ADMIN" && (session.tenantId !== tenantId || !canManageTenant(session)))
  ) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  await setActiveKommoIntegration(tenantId, integrationId);
  return NextResponse.json({ ok: true });
}
