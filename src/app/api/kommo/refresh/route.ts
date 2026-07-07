import { NextResponse } from "next/server";
import { refreshKommoMetricsForAllDashboards, isKommoRefreshSecretValid } from "@/services/kommo.service";

function isAuthorizedCron(req: Request): boolean {
  const url = new URL(req.url);
  if (isKommoRefreshSecretValid(url.searchParams.get("secret"))) return true;

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const refreshedDashboards = await refreshKommoMetricsForAllDashboards();
    return NextResponse.json({ refreshedDashboards, message: "Métricas Kommo atualizadas." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar métricas Kommo." },
      { status: 500 },
    );
  }
}
