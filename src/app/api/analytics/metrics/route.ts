import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { isKommoConfiguredForSession } from "@/lib/kommo/session-client";
import {
  analyticsPeriodPayload,
  getAnalyticsMetricsForUserRange,
  resolveAnalyticsRange,
} from "@/services/analytics-kommo.service";
import { getDashboardExtras } from "@/services/data-source.service";

export async function GET(req: Request) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bustCache = searchParams.get("refresh") === "1";
  const range = resolveAnalyticsRange(searchParams.get("from"), searchParams.get("to"));
  const period = analyticsPeriodPayload(range);
  const kommoConfigured = await isKommoConfiguredForSession(session);

  if (!kommoConfigured) {
    return NextResponse.json(
      {
        error: "Kommo não está configurado. Defina KOMMO_SUBDOMAIN e KOMMO_ACCESS_TOKEN.",
        kommoConfigured: false,
        period,
      },
      { status: 503 },
    );
  }

  try {
    const extras = await getDashboardExtras(session.userId);
    const metrics = await getAnalyticsMetricsForUserRange(
      session.userId,
      extras.settings,
      range,
      { bustCache, tenantId: session.tenantId, integrationId: session.kommoIntegrationId },
    );

    return NextResponse.json({
      metrics,
      period,
      kommoConfigured: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar dados do Kommo.";
    console.error("[analytics/metrics] Kommo fetch failed:", message);
    return NextResponse.json(
      {
        error: message,
        kommoConfigured: true,
        period,
      },
      { status: 502 },
    );
  }
}
