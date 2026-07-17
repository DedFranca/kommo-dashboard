import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { getKommoDimensions, getKommoMetrics, KOMMO_FIELD_DEFINITIONS } from "@/lib/kommo/fields";
import { diagnoseKommoForSession } from "@/lib/kommo/session-client";

export async function GET() {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const diagnosis = await diagnoseKommoForSession(session);
  if (!diagnosis.ok) {
    return NextResponse.json(
      { error: diagnosis.error, code: diagnosis.code },
      { status: 503 },
    );
  }

  return NextResponse.json({
    fields: KOMMO_FIELD_DEFINITIONS,
    dimensions: getKommoDimensions(),
    metrics: getKommoMetrics(),
  });
}
