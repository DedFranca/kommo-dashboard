import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestLayoutAccess } from "@/lib/auth-guards";
import { listAllKommoIntegrations } from "@/services/kommo-integration.service";
import type { AdminIntegrationOption } from "@/types/user-account";

export async function GET() {
  const session = await getRequestSession();
  const access = requireRequestLayoutAccess(session);
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
