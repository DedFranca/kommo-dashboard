import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { resolveKommoForSession } from "@/lib/kommo/session-client";
import { viewerCanAccessOwnerData } from "@/services/layout.service";
import { executeWidgetQuery, parseGlobalDateRange } from "@/services/query-engine.service";
import type { WidgetQueryConfig } from "@/types/widget-query";
import type { ChartKind } from "@/types/analytics";

const ALLOWED_WIDGET_TYPES = new Set([
  "kpi",
  "lineChart",
  "barChart",
  "areaChart",
  "pieChart",
  "rankingTable",
  "cohortTable",
  "cohortChart",
]);

export async function POST(req: Request) {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: {
    widgetType?: string;
    queryConfig?: WidgetQueryConfig;
    from?: string;
    to?: string;
    bustCache?: boolean;
    dataOwnerId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.queryConfig) {
    return NextResponse.json({ error: "queryConfig é obrigatório" }, { status: 400 });
  }

  const widgetType = body.widgetType ?? "kpi";
  if (!ALLOWED_WIDGET_TYPES.has(widgetType)) {
    return NextResponse.json({ error: "Tipo de widget não suportado" }, { status: 400 });
  }

  let datasetOwnerId: string | null = session.userId;
  if (body.dataOwnerId && body.dataOwnerId !== session.userId) {
    const allowed = await viewerCanAccessOwnerData(session.userId, body.dataOwnerId);
    if (!allowed) {
      return NextResponse.json({ error: "Sem acesso aos dados deste layout" }, { status: 403 });
    }
    datasetOwnerId = body.dataOwnerId;
  }

  try {
    const kommoConfig = await resolveKommoForSession(session);

    const result = await executeWidgetQuery({
      userId: session.userId,
      kommoConfig,
      datasetOwnerId,
      widgetType: widgetType as ChartKind | "cohortTable" | "cohortChart",
      queryConfig: body.queryConfig,
      globalDateRange: parseGlobalDateRange(body.from, body.to),
      bustCache: body.bustCache,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, empty: result.empty ?? false },
        { status: result.empty ? 200 : 422 },
      );
    }

    return NextResponse.json({ payload: result.payload, querySpec: result.querySpec }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao consultar dados";
    console.error("[analytics/query]", err);
    return NextResponse.json({ error: message, empty: true }, { status: 200 });
  }
}
