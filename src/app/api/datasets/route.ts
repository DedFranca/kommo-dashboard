import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { getDashboardDatasets } from "@/services/data-source.service";

export async function GET() {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  const datasets = await getDashboardDatasets(access.session.userId);
  return NextResponse.json({ datasets });
}
