import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { resolveKommoForSession } from "@/lib/kommo/session-client";
import { fetchKommoLeadRecords } from "@/services/kommo-leads.service";

export async function GET(req: Request) {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = await resolveKommoForSession(session);
  if (!config) {
    return NextResponse.json({ error: "Kommo não configurado" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "250");
  const refresh = searchParams.get("refresh") === "1";

  try {
    const data = await fetchKommoLeadRecords({
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 250,
      bustCache: refresh,
      config,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar leads";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
