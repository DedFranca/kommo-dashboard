import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { fetchKommoSummary } from "@/services/kommo.service";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const summary = await fetchKommoSummary();
  return NextResponse.json(summary);
}
