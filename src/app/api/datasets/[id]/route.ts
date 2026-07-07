import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { getDashboardDataset } from "@/services/data-source.service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const dataset = await getDashboardDataset(access.session.userId, id);
  if (!dataset) return NextResponse.json({ error: "Dataset não encontrado" }, { status: 404 });

  return NextResponse.json({
    id: dataset.id,
    name: dataset.name,
    fileName: dataset.fileName,
    columns: dataset.columns,
    rowCount: dataset.rows.length,
    createdAt: dataset.createdAt,
  });
}
