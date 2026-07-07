import { NextResponse } from "next/server";
import { refreshAuthSession } from "@/services/auth-v2.service";

export async function POST() {
  const result = await refreshAuthSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: result.session.userId,
      email: result.session.email,
      tenantId: result.session.tenantId,
    },
  });
}
