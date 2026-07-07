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
    return NextResponse.json({ configured: false, ok: false, error: "Kommo não configurado" });
  }

  const health = await verifyKommoForSession(session);
  return NextResponse.json({ configured: true, ...health });
}
