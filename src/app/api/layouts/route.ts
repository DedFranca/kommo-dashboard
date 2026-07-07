import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestAuth, requireRequestLayoutAccess, userRoleFromAuthSession } from "@/lib/auth-guards";
import { createLayout, listLayoutsForViewer, listManageableLayouts } from "@/services/layout.service";
import { canManageLayouts } from "@/types/user-role";
import { isLayoutKind, type LayoutKindValue } from "@/types/layout-entity";

export async function GET() {
  const session = await getRequestSession();
  const access = requireRequestAuth(session);
  if (access instanceof NextResponse) return access;

  const role = userRoleFromAuthSession(access.session);
  const layouts = canManageLayouts(role)
    ? await listManageableLayouts()
    : await listLayoutsForViewer(access.session.userId);

  return NextResponse.json({ layouts });
}

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestLayoutAccess(session);
  if (access instanceof NextResponse) return access;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, description, kind, config, dataSourceIntegrationId } = body as {
    name?: string;
    description?: string | null;
    kind?: string;
    config?: unknown;
    dataSourceIntegrationId?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Informe um nome para o layout." }, { status: 400 });
  }
  const resolvedKind: LayoutKindValue = isLayoutKind(kind) ? kind : "ANALYTICS";

  const layout = await createLayout({
    ownerId: access.session.userId,
    name,
    description: description ?? null,
    kind: resolvedKind,
    config: config ?? {},
    dataSourceIntegrationId: dataSourceIntegrationId ?? null,
  });

  return NextResponse.json({ layout }, { status: 201 });
}
