import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { removeDataSource } from "@/services/data-source.service";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const dataSources = await removeDataSource(access.session.userId, id);
  return NextResponse.json({ dataSources });
}
