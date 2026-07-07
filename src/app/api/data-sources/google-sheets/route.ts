import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { parseCsvToRawTable } from "@/lib/analytics/csv/parse";
import { inferSchema } from "@/lib/analytics/infer/schema";
import { inferSemanticMap } from "@/lib/analytics/infer/semantic";
import { createRawDataset } from "@/services/analytics-datasets.service";
import { fetchGoogleSheetCsv } from "@/services/google-sheets.service";

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  let body: { url?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "Informe a URL da planilha do Google Sheets" }, { status: 400 });
  }

  let text: string;
  try {
    const result = await fetchGoogleSheetCsv(body.url);
    text = result.text;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao importar a planilha" },
      { status: 400 },
    );
  }

  const rawTable = parseCsvToRawTable(text);
  if (!rawTable.columns.length) {
    return NextResponse.json({ error: "A planilha não tem colunas reconhecíveis" }, { status: 400 });
  }

  const inferredSchema = inferSchema(rawTable);
  const semanticMap = inferSemanticMap(inferredSchema);

  const ds = await createRawDataset({
    userId: access.session.userId,
    name: body.name?.trim() || "Planilha do Google Sheets",
    fileName: body.url,
    sourceType: "google_sheets",
    rawTable,
    inferredSchema,
    semanticMap,
  });

  return NextResponse.json(
    {
      id: ds.id,
      name: ds.name,
      sourceType: "google_sheets",
      rowCount: rawTable.rows.length,
      preview: {
        columns: rawTable.columns,
        rows: rawTable.rows.slice(0, 10),
        rowCount: rawTable.rows.length,
      },
    },
    { status: 201 },
  );
}
