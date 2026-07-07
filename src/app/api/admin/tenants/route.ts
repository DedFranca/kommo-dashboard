import { NextResponse } from "next/server";
import { canManageTenant, getRequestSession, isPlatformSuperAdmin } from "@/lib/auth/request-session";
import { createTenant, listTenants } from "@/services/tenant.service";

export async function GET() {
  const session = await getRequestSession();
  if (!session || !isPlatformSuperAdmin(session)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const tenants = await listTenants();
  return NextResponse.json({ tenants });
}

export async function POST(req: Request) {
  const session = await getRequestSession();
  if (!session || !isPlatformSuperAdmin(session)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string; slug?: string };
  if (!body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: "Nome e slug são obrigatórios." }, { status: 400 });
  }
  const tenant = await createTenant({ name: body.name, slug: body.slug });
  return NextResponse.json({ tenant }, { status: 201 });
}
