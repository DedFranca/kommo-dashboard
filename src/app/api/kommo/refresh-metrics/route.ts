import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { diagnoseKommoForSession } from "@/lib/kommo/session-client";
import { refreshKommoMetricsForUser } from "@/services/kommo.service";

export async function POST() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const diagnosis = await diagnoseKommoForSession(session);
  if (!diagnosis.ok) {
    return NextResponse.json(
      { error: diagnosis.error, code: diagnosis.code },
      { status: 503 },
    );
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
