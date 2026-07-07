import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { deleteRawDataset, getRawDataset } from "@/services/analytics-datasets.service";
import type { RawTable } from "@/types/analytics";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const ds = await getRawDataset(access.session.userId, id);
  if (!ds) return NextResponse.json({ error: "Dataset não encontrado" }, { status: 404 });

  const table = ds.rawTable as unknown as RawTable;

  return NextResponse.json({
    id: ds.id,
    name: ds.name,
    fileName: ds.fileName,
    sourceType: ds.sourceType,
    inferredSchema: ds.inferredSchema,
    semanticMap: ds.semanticMap,
    preview: {
      columns: table?.columns ?? [],
      rows: (table?.rows ?? []).slice(0, 10),
      rowCount: table?.rows?.length ?? 0,
    },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const removed = await deleteRawDataset(access.session.userId, id);
  if (!removed) return NextResponse.json({ error: "Dataset não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

