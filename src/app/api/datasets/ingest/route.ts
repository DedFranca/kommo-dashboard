import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { parseCsvToRawTable } from "@/lib/analytics/csv/parse";
import { addDashboardDataset } from "@/services/data-source.service";

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  let body: { name?: string; fileName?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string") {
    return NextResponse.json({ error: "text é obrigatório" }, { status: 400 });
  }

  const rawTable = parseCsvToRawTable(body.text);
  if (!rawTable.columns.length) {
    return NextResponse.json({ error: "Arquivo CSV vazio ou inválido" }, { status: 400 });
  }

  const dataset = {
    id: `ds-${Date.now().toString(36)}`,
    name: body.name?.trim() || body.fileName || "Dataset importado",
    fileName: body.fileName,
    columns: rawTable.columns,
    rows: rawTable.rows,
    createdAt: new Date().toISOString(),
  };

  await addDashboardDataset(access.session.userId, dataset);

  return NextResponse.json(dataset, { status: 201 });
}
