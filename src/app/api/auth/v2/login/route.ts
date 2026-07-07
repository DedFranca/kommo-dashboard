import { NextResponse } from "next/server";
import { loginWithCredentials } from "@/services/auth-v2.service";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string; tenantId?: string };
    if (!body.email?.trim() || !body.password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const result = await loginWithCredentials(body.email.trim(), body.password, body.tenantId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: result.session.userId,
        email: result.session.email,
        name: result.session.name,
        tenantId: result.session.tenantId,
        tenantSlug: result.session.tenantSlug,
        tenantRole: result.session.tenantRole,
        platformRole: result.session.platformRole,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao autenticar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
