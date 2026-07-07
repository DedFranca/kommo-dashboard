import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json({ session });
}
