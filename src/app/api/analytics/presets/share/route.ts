import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestLayoutAccess } from "@/lib/auth-guards";
import { shareAnalyticsPreset } from "@/services/analytics-presets.service";

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestLayoutAccess(session);
  if (access instanceof NextResponse) return access;

  let body: { presetId?: string; viewerIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.presetId) {
    return NextResponse.json({ error: "presetId é obrigatório" }, { status: 400 });
  }
  if (!Array.isArray(body.viewerIds) || body.viewerIds.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "viewerIds deve ser uma lista de IDs." }, { status: 400 });
  }

  try {
    const collection = await shareAnalyticsPreset(
      access.session.userId,
      body.presetId,
      body.viewerIds as string[],
    );
    return NextResponse.json(collection);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao compartilhar layout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
