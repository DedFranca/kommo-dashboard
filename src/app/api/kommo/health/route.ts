import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { isKommoConfiguredForSession, verifyKommoForSession } from "@/lib/kommo/session-client";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const configured = await isKommoConfiguredForSession(session);
  if (!configured) {
    return NextResponse.json({
      configured: false,
      ok: false,
      error:
        "Nenhuma integração Kommo vinculada a esta conta. Peça a um administrador para atribuir uma.",
    });
  }

  const health = await verifyKommoForSession(session);
  return NextResponse.json({ configured: true, ...health });
}
