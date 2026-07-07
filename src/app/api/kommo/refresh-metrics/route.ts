import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { isKommoConfiguredForSession } from "@/lib/kommo/session-client";
import { refreshKommoMetricsForUser } from "@/services/kommo.service";

export async function POST() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!(await isKommoConfiguredForSession(session))) {
    return NextResponse.json({ error: "Kommo não está configurado para esta conta." }, { status: 503 });
  }

  try {
    await refreshKommoMetricsForUser(session.userId);
    return NextResponse.json({ message: "Métricas Kommo atualizadas." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar métricas Kommo.";
    console.error("[kommo/refresh-metrics]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
