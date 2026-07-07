import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { resolveKommoForSession } from "@/lib/kommo/session-client";
import { viewerCanAccessOwnerData } from "@/services/layout.service";
import { getFieldDistinctValues } from "@/services/field-values.service";
import { parseGlobalDateRange } from "@/services/query-engine.service";
import type { WidgetDataSource } from "@/types/widget-query";

export async function POST(req: Request) {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: {
    source?: WidgetDataSource;
    field?: string;
    from?: string;
    to?: string;
    dataOwnerId?: string;
    bustCache?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.source || !body.field) {
    return NextResponse.json({ error: "source e field são obrigatórios" }, { status: 400 });
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
    const kommoConfig = body.source.kind === "kommo" ? await resolveKommoForSession(session) : null;
    const values = await getFieldDistinctValues({
      userId: session.userId,
      source: body.source,
      field: body.field,
      kommoConfig,
      globalRange: parseGlobalDateRange(body.from, body.to),
      datasetOwnerId,
      bustCache: body.bustCache,
    });
    return NextResponse.json({ values });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar opções";
    console.error("[analytics/field-values]", err);
    return NextResponse.json({ error: message, values: [] }, { status: 200 });
  }
}
