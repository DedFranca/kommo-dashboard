import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { addDataSource, getDashboardExtras } from "@/services/data-source.service";
import type { CustomDataSource, CustomDataPayload } from "@/types/data-source";
import type { WidgetType } from "@/types/dashboard-layout";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { dataSources } = await getDashboardExtras(session.userId);
  return NextResponse.json({ dataSources });
}

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  let body: {
    name?: string;
    widgetType?: WidgetType;
    fileName?: string;
    payload?: CustomDataPayload;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.widgetType || !body.payload) {
    return NextResponse.json({ error: "widgetType e payload são obrigatórios" }, { status: 400 });
  }

  const source: CustomDataSource = {
    id: `ds-${Date.now().toString(36)}`,
    name: body.name?.trim() || body.fileName || "Fonte importada",
    widgetType: body.widgetType,
    fileName: body.fileName,
    payload: body.payload,
    createdAt: new Date().toISOString(),
  };

  await addDataSource(access.session.userId, source);
  return NextResponse.json(source, { status: 201 });
}
