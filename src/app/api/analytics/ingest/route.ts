import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { parseCsvToRawTable } from "@/lib/analytics/csv/parse";
import { inferSchema } from "@/lib/analytics/infer/schema";
import { inferSemanticMap } from "@/lib/analytics/infer/semantic";
import { createRawDataset } from "@/services/analytics-datasets.service";

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  let body: { name?: string; fileName?: string; text?: string; sourceType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string") {
    return NextResponse.json({ error: "text é obrigatório" }, { status: 400 });
  }

  const sourceType = body.sourceType ?? (body.fileName?.toLowerCase().endsWith(".json") ? "json" : "csv");
  if (sourceType !== "csv") {
    return NextResponse.json({ error: "V1 suporta ingestão raw apenas para CSV" }, { status: 400 });
  }

  const rawTable = parseCsvToRawTable(body.text);
  if (!rawTable.columns.length) {
    return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
  }

  const inferredSchema = inferSchema(rawTable);
  const semanticMap = inferSemanticMap(inferredSchema);

  const ds = await createRawDataset({
    userId: access.session.userId,
    name: body.name?.trim() || body.fileName || "Dataset importado",
    fileName: body.fileName,
    sourceType,
    rawTable,
    inferredSchema,
    semanticMap,
  });

  return NextResponse.json(
    {
      id: ds.id,
      name: ds.name,
      fileName: ds.fileName,
      sourceType: ds.sourceType,
      inferredSchema,
      semanticMap,
      sample: rawTable.rows.slice(0, 25),
      rowCount: rawTable.rows.length,
    },
    { status: 201 },
  );
}

