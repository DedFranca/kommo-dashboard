import { NextResponse } from "next/server";
import { getRequestSession, isPlatformSuperAdmin } from "@/lib/auth/request-session";
import { deleteTenant, getTenantById, updateTenant } from "@/services/tenant.service";

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getRequestSession();
  if (!session || !isPlatformSuperAdmin(session)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);
  if (!tenant) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  return NextResponse.json({ tenant });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getRequestSession();
  if (!session || !isPlatformSuperAdmin(session)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const { tenantId } = await params;
  const body = (await req.json()) as { name?: string; slug?: string; status?: "ACTIVE" | "SUSPENDED" };
  const tenant = await updateTenant(tenantId, body);
  return NextResponse.json({ tenant });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getRequestSession();
  if (!session || !isPlatformSuperAdmin(session)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const { tenantId } = await params;
  await deleteTenant(tenantId);
  return NextResponse.json({ ok: true });
}
