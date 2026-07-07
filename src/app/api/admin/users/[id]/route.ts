import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestAdminAccess } from "@/lib/auth-guards";
import { deleteManagedUser, updateManagedUser } from "@/services/user-admin.service";
import { isUserRole, type UserRole } from "@/types/user-role";
import { isUserStatus, type UserStatus } from "@/types/user-account";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestAdminAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, role, status, kommoIntegrationId } = body as {
    name?: string | null;
    role?: string;
    status?: string;
    kommoIntegrationId?: string | null;
  };

  if (role !== undefined && !isUserRole(role)) {
    return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
  }
  if (status !== undefined && !isUserStatus(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const isSelf = id === access.session.userId;
  if (isSelf && role && role !== "ADMIN") {
    return NextResponse.json({ error: "Você não pode rebaixar seu próprio acesso." }, { status: 400 });
  }
  if (isSelf && status === "DISABLED") {
    return NextResponse.json({ error: "Você não pode desativar a própria conta." }, { status: 400 });
  }

  const result = await updateManagedUser(
    id,
    {
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role: role as UserRole } : {}),
      ...(status !== undefined ? { status: status as UserStatus } : {}),
      ...(kommoIntegrationId !== undefined ? { kommoIntegrationId } : {}),
    },
    access.session.userId,
  );

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ user: result.data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestAdminAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  if (id === access.session.userId) {
    return NextResponse.json({ error: "Você não pode excluir a própria conta." }, { status: 400 });
  }

  const result = await deleteManagedUser(id, access.session.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
