import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { resolveKommoForSession } from "@/lib/kommo/session-client";
import { fetchKommoReferenceData } from "@/services/kommo-reference.service";

export async function GET(req: Request) {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = await resolveKommoForSession(session);
  if (!config) {
    return NextResponse.json({ error: "Kommo não configurado" }, { status: 503 });
  }

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  try {
    const reference = await fetchKommoReferenceData({ bustCache: refresh, config });
    return NextResponse.json(reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar referência";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
