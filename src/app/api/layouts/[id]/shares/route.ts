import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestLayoutAccess } from "@/lib/auth-guards";
import { getLayoutDetail, setLayoutShares } from "@/services/layout.service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestLayoutAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const layout = await getLayoutDetail(id);
  if (!layout) return NextResponse.json({ error: "Layout não encontrado" }, { status: 404 });
  return NextResponse.json({ viewerIds: layout.sharedViewerIds });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestLayoutAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { viewerIds } = body as { viewerIds?: unknown };
  if (!Array.isArray(viewerIds) || viewerIds.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "viewerIds deve ser uma lista de IDs." }, { status: 400 });
  }

  const layout = await setLayoutShares(id, viewerIds as string[], access.session.userId);
  if (!layout) return NextResponse.json({ error: "Layout não encontrado" }, { status: 404 });
  return NextResponse.json({ layout });
}
