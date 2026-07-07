import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestAdminAccess } from "@/lib/auth-guards";
import { createManagedUser, listAdminUsers } from "@/services/user-admin.service";
import { isUserRole } from "@/types/user-role";

export async function GET() {
  const session = await getRequestSession();
  const access = requireRequestAdminAccess(session);
  if (access instanceof NextResponse) return access;

  const users = await listAdminUsers();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestAdminAccess(session);
  if (access instanceof NextResponse) return access;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { email, password, name, role, kommoIntegrationId } = body as {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    kommoIntegrationId?: string | null;
  };

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }
  if (!isUserRole(role) || role === "ADMIN") {
    return NextResponse.json(
      { error: "Selecione um papel válido (Editor ou Visualizador)." },
      { status: 400 },
    );
  }

  const result = await createManagedUser(
    { email, password, name, role, kommoIntegrationId: kommoIntegrationId ?? null },
    access.session.userId,
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ user: result.data }, { status: 201 });
}
