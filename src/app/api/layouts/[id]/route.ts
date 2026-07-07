import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestAuth, requireRequestLayoutAccess, userRoleFromAuthSession } from "@/lib/auth-guards";
import { deleteLayout, getLayoutDetail, getLayoutForViewer, updateLayout } from "@/services/layout.service";
import { canManageLayouts } from "@/types/user-role";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestAuth(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const role = userRoleFromAuthSession(access.session);
  const layout = canManageLayouts(role)
    ? await getLayoutDetail(id)
    : await getLayoutForViewer(id, access.session.userId);

  if (!layout) return NextResponse.json({ error: "Layout não encontrado" }, { status: 404 });
  return NextResponse.json({ layout });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const { name, description, config, dataSourceIntegrationId } = body as {
    name?: string;
    description?: string | null;
    config?: unknown;
    dataSourceIntegrationId?: string | null;
  };

  const layout = await updateLayout(
    id,
    {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(config !== undefined ? { config } : {}),
      ...(dataSourceIntegrationId !== undefined ? { dataSourceIntegrationId } : {}),
    },
    access.session.userId,
  );

  if (!layout) return NextResponse.json({ error: "Layout não encontrado" }, { status: 404 });
  return NextResponse.json({ layout });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestLayoutAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const ok = await deleteLayout(id, access.session.userId);
  if (!ok) return NextResponse.json({ error: "Layout não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
