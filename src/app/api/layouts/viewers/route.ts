import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestLayoutAccess } from "@/lib/auth-guards";
import { listViewerAccounts } from "@/services/layout.service";

export async function GET() {
  const session = await getRequestSession();
  const access = requireRequestLayoutAccess(session);
  if (access instanceof NextResponse) return access;

  const viewers = await listViewerAccounts();
  return NextResponse.json({ viewers });
}
