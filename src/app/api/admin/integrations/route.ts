import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestAdminAccess } from "@/lib/auth-guards";
import { createKommoIntegration, listAllKommoIntegrations } from "@/services/kommo-integration.service";
import { recordAudit } from "@/services/audit.service";
import { prisma } from "@/lib/prisma";
import type { AdminIntegrationOption } from "@/types/user-account";

export async function GET() {
  const session = await getRequestSession();
  const access = requireRequestAdminAccess(session);
  if (access instanceof NextResponse) return access;

  const rows = await listAllKommoIntegrations();
  const integrations: AdminIntegrationOption[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    subdomain: r.subdomain,
    isActive: r.isActive,
  }));

  return NextResponse.json({ integrations });
}

async function ensureDefaultTenantId(): Promise<string> {
  const existing = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing.id;
  const created = await prisma.tenant.create({ data: { name: "Organização", slug: "organizacao" } });
  return created.id;
}

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestAdminAccess(session);
  if (access instanceof NextResponse) return access;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, subdomain, accessToken, refreshToken, clientId, clientSecret } = body as {
    name?: string;
    subdomain?: string;
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
  };

  if (!name?.trim() || !subdomain?.trim() || !accessToken?.trim()) {
    return NextResponse.json(
      { error: "Nome, subdomínio e access token são obrigatórios." },
      { status: 400 },
    );
  }

  const tenantId = await ensureDefaultTenantId();
  const result = await createKommoIntegration(tenantId, {
    name,
    subdomain,
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { integration } = result;

  await recordAudit({
    actorId: access.session.userId,
    action: "integration.create",
    targetType: "kommoIntegration",
    targetId: integration.id,
    metadata: { name, subdomain },
  });

  return NextResponse.json(
    {
      integration: {
        id: integration.id,
        name: integration.name,
        subdomain: integration.subdomain,
        isActive: integration.isActive,
      } satisfies AdminIntegrationOption,
    },
    { status: 201 },
  );
}
