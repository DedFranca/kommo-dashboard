import { NextResponse } from "next/server";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { getRequestSession } from "@/lib/auth/request-session";
import { getAnalyticsWorkspace, updateAnalyticsLayout } from "@/services/dashboard.service";
import { ANALYTICS_LAYOUT_VERSION, normalizeAnalyticsLayout } from "@/types/analytics-layout";
import type { DashboardLayoutState } from "@/types/dashboard-layout";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const workspace = await getAnalyticsWorkspace(session.userId);
  return NextResponse.json({ layout: workspace.layout });
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
  const normalized = normalizeAnalyticsLayout(layout);
  normalized.version = ANALYTICS_LAYOUT_VERSION;

  if (!isValidLayout(normalized)) {
    return NextResponse.json({ error: "Layout inválido" }, { status: 400 });
  }

  try {
    await updateAnalyticsLayout(access.session.userId, normalized);
  } catch (error) {
    console.error("Falha ao persistir layout analytics:", error);
    return NextResponse.json({ error: "Não foi possível salvar o layout." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function isValidLayout(layout: DashboardLayoutState) {
  return layout.widgets.length > 0 && Object.keys(layout.layouts).length > 0;
}
