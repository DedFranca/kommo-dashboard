import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { getOrCreateDashboardForUser, updateDashboardLayout } from "@/services/dashboard.service";
import { LAYOUT_VERSION, normalizeDashboardLayout, type DashboardLayoutState } from "@/types/dashboard-layout";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const dashboard = await getOrCreateDashboardForUser(session.userId);
  return NextResponse.json({
    id: dashboard.id,
    name: dashboard.name,
    layout: dashboard.layout,
  });
}

export async function PATCH(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const layout = (body as { layout?: unknown }).layout;
  const normalized = normalizeDashboardLayout(layout);
  normalized.version = LAYOUT_VERSION;

  if (!isDashboardLayoutState(normalized) || !isValidDashboardLayout(normalized)) {
    return NextResponse.json({ error: "Layout inválido" }, { status: 400 });
  }

  try {
    await updateDashboardLayout(access.session.userId, normalized);
  } catch (error) {
    console.error("Falha ao persistir layout:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar o layout. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

function isDashboardLayoutState(value: DashboardLayoutState): value is DashboardLayoutState {
  return (
    Array.isArray(value.widgets) &&
    value.layouts !== null &&
    typeof value.layouts === "object"
  );
}

function isValidDashboardLayout(layout: DashboardLayoutState) {
  return layout.widgets.length > 0 && Object.keys(layout.layouts).length > 0;
}
