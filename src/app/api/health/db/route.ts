import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, boolean | string> = {
    databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    directUrl: Boolean(process.env.DIRECT_URL?.trim()),
    authSecret: Boolean(
      process.env.AUTH_SECRET?.trim() ||
        process.env.JWT_SECRET?.trim() ||
        process.env.NEXTAUTH_SECRET?.trim(),
    ),
    appEncryptionKey: Boolean(process.env.APP_ENCRYPTION_KEY?.trim()),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
    const userCount = await prisma.user.count();
    checks.users = userCount;
  } catch (err) {
    checks.db = false;
    checks.error = err instanceof Error ? err.message : "Erro desconhecido";
  }

  const ok =
    checks.databaseUrl === true &&
    checks.directUrl === true &&
    checks.authSecret === true &&
    checks.db === true;

  return NextResponse.json({ ok, checks, ts: new Date().toISOString() }, { status: ok ? 200 : 503 });
}
