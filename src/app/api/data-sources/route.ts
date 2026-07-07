import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { userRoleFromAuthSession } from "@/lib/auth/roles";
import { isKommoConfiguredForSession } from "@/lib/kommo/session-client";
import { listDatasetOwnerIdsForViewer } from "@/services/layout.service";
import { listUnifiedDataSources } from "@/services/data-source-registry.service";
import { canManageLayouts } from "@/types/user-role";

export async function GET() {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const kommoConfigured = await isKommoConfiguredForSession(session);
  const role = userRoleFromAuthSession(session);
  const sharedOwnerIds =
    role === "VIEWER" ? await listDatasetOwnerIdsForViewer(session.userId) : [];

  const unified = await listUnifiedDataSources(session.userId, {
    kommoConfigured,
    sharedOwnerIds: canManageLayouts(role) ? undefined : sharedOwnerIds,
  });

  const sources = unified.map((s) => ({
    id: s.id,
    type: s.type,
    kind: s.type === "kommo" ? ("kommo" as const) : ("dataset" as const),
    name: s.label,
    label: s.label,
    description: s.description,
    refreshable: s.refreshable,
    fieldCount: s.fields.length,
    status: s.status,
    createdAt: s.createdAt,
  }));

  return NextResponse.json({ sources, kommoConfigured });
}
