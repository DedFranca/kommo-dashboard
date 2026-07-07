import { NextResponse } from "next/server";
import { canManageTenant, getRequestSession, isPlatformSuperAdmin } from "@/lib/auth/request-session";
import { addUserToTenant, listTenantMembers, removeUserFromTenant } from "@/services/tenant.service";

type Params = { params: Promise<{ tenantId: string }> };

function canAccess(session: Awaited<ReturnType<typeof getRequestSession>>, tenantId: string) {
  if (!session) return false;
  if (isPlatformSuperAdmin(session)) return true;
  return session.tenantId === tenantId && canManageTenant(session);
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getRequestSession();
  const { tenantId } = await params;
  if (!canAccess(session, tenantId)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const members = await listTenantMembers(tenantId);
  return NextResponse.json({ members });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getRequestSession();
  const { tenantId } = await params;
  if (!canAccess(session, tenantId)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = (await req.json()) as { userId?: string; role?: string };
  if (!body.userId || !body.role) {
    return NextResponse.json({ error: "userId e role são obrigatórios." }, { status: 400 });
  }
  const membership = await addUserToTenant(tenantId, body.userId, body.role);
  return NextResponse.json({ membership }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await getRequestSession();
  const { tenantId } = await params;
  if (!canAccess(session, tenantId)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  await removeUserFromTenant(tenantId, userId);
  return NextResponse.json({ ok: true });
}
