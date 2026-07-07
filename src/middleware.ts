import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "km_access";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

type TokenClaims = {
  userId?: string;
  role?: string;
  status?: string;
};

async function readClaims(req: NextRequest): Promise<TokenClaims | null> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as TokenClaims;
  } catch {
    return null;
  }
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/dashboard/admin")
  );
}

export default async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // Cron externo / Vercel Cron — autenticação via ?secret= na rota
  if (pathname === "/api/kommo/refresh") {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api");
  const claims = await readClaims(req);

  // Não autenticado
  if (!claims?.userId) {
    if (isApi) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const login = new URL("/login", origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // Conta desativada (defesa de borda; o backend revalida no banco)
  if (claims.status === "DISABLED") {
    if (isApi) return NextResponse.json({ error: "Conta desativada" }, { status: 403 });
    const login = new URL("/login", origin);
    login.searchParams.set("error", "disabled");
    return NextResponse.redirect(login);
  }

  // Áreas administrativas exigem papel ADMIN
  if (isAdminPath(pathname) && claims.role !== "ADMIN") {
    if (isApi) return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analytics",
    "/analytics/:path*",
    "/api/admin/:path*",
    "/api/analytics/:path*",
    "/api/dashboard/:path*",
    "/api/kommo/:path*",
    "/api/data-sources/:path*",
    "/api/layouts/:path*",
  ],
};
