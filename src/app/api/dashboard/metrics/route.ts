import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { getDefaultDateRange, parseISODate, toISODate } from "@/lib/date-range";
import { getDashboardExtras, saveDashboardSettings } from "@/services/data-source.service";
import { getKommoMetricsForUserRange } from "@/services/kommo.service";
import { isKommoConfiguredForSession } from "@/lib/kommo/session-client";
import { EMPTY_DASHBOARD_FILTERS, type DashboardFilters } from "@/types/dashboard-filters";

function parseIdList(value: string | null): number[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((id) => Number.isFinite(id));
}

function parseFilters(searchParams: URLSearchParams): DashboardFilters {
  return {
    pipelineIds: parseIdList(searchParams.get("pipeline")),
    responsibleIds: parseIdList(searchParams.get("responsible")),
    statusIds: parseIdList(searchParams.get("status")),
  };
}

export async function GET(req: Request) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const bustCache = searchParams.get("refresh") === "1";
  const filters = parseFilters(searchParams);
  const extras = await getDashboardExtras(session.userId);
  const defaultRange = getDefaultDateRange();
  const from = parseISODate(fromParam ?? undefined) ?? defaultRange.from;
  const to = parseISODate(toParam ?? undefined) ?? defaultRange.to;

  const periodFrom = toISODate(from);
  const periodTo = toISODate(to);

  if (
    fromParam &&
    toParam &&
    (extras.settings.periodFrom !== periodFrom || extras.settings.periodTo !== periodTo)
  ) {
    await saveDashboardSettings(session.userId, {
      periodFrom,
      periodTo,
    });
  }

  const kommoConfigured = await isKommoConfiguredForSession(session);
  const period = { from: toISODate(from), to: toISODate(to) };

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
    const metrics = await getKommoMetricsForUserRange(
      session.userId,
      extras.settings,
      { from, to },
      { bustCache, filters, tenantId: session.tenantId, integrationId: session.kommoIntegrationId },
    );

    return NextResponse.json({
      metrics,
      period,
      filters,
      source: "kommo" as const,
      kommoConfigured: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar dados do Kommo.";
    console.error("[metrics] Kommo fetch failed:", message);
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
