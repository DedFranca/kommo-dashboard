import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { getDatasetFields } from "@/services/query-engine.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const fields = await getDatasetFields(session.userId, id);
  if (!fields) {
    return NextResponse.json({ error: "Dataset não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    fields,
    dimensions: fields.filter((f) => f.role === "dimension" || f.role === "time"),
    metrics: fields.filter((f) => f.role === "metric"),
  });
}
