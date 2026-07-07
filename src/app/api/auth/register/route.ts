import { NextResponse } from "next/server";

/** Registro público desabilitado — use o painel Admin para criar usuários. */
export async function POST() {
  return NextResponse.json(
    { error: "Registro público desabilitado. Solicite acesso ao administrador." },
    { status: 403 },
  );
}
