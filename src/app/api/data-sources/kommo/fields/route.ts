import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { getKommoDimensions, getKommoMetrics, KOMMO_FIELD_DEFINITIONS } from "@/lib/kommo/fields";
import { isKommoConfiguredForSession } from "@/lib/kommo/session-client";

export async function GET() {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!(await isKommoConfiguredForSession(session))) {
    return NextResponse.json(
      {
        error:
          "Nenhuma integração Kommo vinculada a esta conta. Peça a um administrador para atribuir uma.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    fields: KOMMO_FIELD_DEFINITIONS,
    dimensions: getKommoDimensions(),
    metrics: getKommoMetrics(),
  });
}
