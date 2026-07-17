import { NextResponse } from "next/server";
import { canManageTenant, getRequestSession } from "@/lib/auth/request-session";
import {
  createKommoIntegration,
  listKommoIntegrations,
} from "@/services/kommo-integration.service";
import type { KommoIntegrationInput } from "@/types/tenant";

type Params = { params: Promise<{ tenantId: string }> };

function canAccessTenant(session: Awaited<ReturnType<typeof getRequestSession>>, tenantId: string) {
  if (!session) return false;
  if (session.platformRole === "SUPER_ADMIN") return true;
  return session.tenantId === tenantId && canManageTenant(session);
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getRequestSession();
  const { tenantId } = await params;
  if (!canAccessTenant(session, tenantId)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const integrations = await listKommoIntegrations(tenantId);
  return NextResponse.json({ integrations });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getRequestSession();
  const { tenantId } = await params;
  if (!canAccessTenant(session, tenantId)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = (await req.json()) as KommoIntegrationInput;
  if (!body.name?.trim() || !body.subdomain?.trim() || !body.accessToken?.trim()) {
    return NextResponse.json({ error: "Nome, subdomínio e access token são obrigatórios." }, { status: 400 });
  }
  const result = await createKommoIntegration(tenantId, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ integration: result.integration }, { status: 201 });
}
