import { getRequestSession } from "@/lib/auth/request-session";
import { userRoleFromAuthSession } from "@/lib/auth/roles";
import type { AuthSessionPayload } from "@/types/tenant";
import type { UserRole } from "@/types/user-role";
import { parseUserRole, canEditDashboard, canManageUsers, canManageLayouts } from "@/types/user-role";

export { userRoleFromAuthSession } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

/** Sessão legada mínima (compatibilidade com chamadas antigas). */
export type LegacySession = {
  user?: { id?: string | null; role?: unknown; name?: string | null; email?: string | null };
} | null;

export function getSessionRole(session: LegacySession): UserRole {
  return parseUserRole(session?.user?.role);
}

type AuthSuccess = { session: LegacySession };
type RequestAuthSuccess = { session: AuthSessionPayload };

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

export function requireAuth(session: LegacySession): AuthSuccess | NextResponse {
  if (!session?.user?.id) return unauthorized();
  return { session };
}

export function requireRequestAuth(session: AuthSessionPayload | null): RequestAuthSuccess | NextResponse {
  if (!session?.userId) return unauthorized();
  return { session };
}

export async function resolveRequestAuth(): Promise<RequestAuthSuccess | NextResponse> {
  return requireRequestAuth(await getRequestSession());
}

export function requireEditAccess(session: LegacySession): AuthSuccess | NextResponse {
  const authResult = requireAuth(session);
  if (authResult instanceof NextResponse) return authResult;

  const role = getSessionRole(authResult.session);
  if (!canEditDashboard(role)) {
    return NextResponse.json({ error: "Permissão insuficiente para editar o dashboard" }, { status: 403 });
  }
  return authResult;
}

export function requireRequestEditAccess(session: AuthSessionPayload | null): RequestAuthSuccess | NextResponse {
  const authResult = requireRequestAuth(session);
  if (authResult instanceof NextResponse) return authResult;

  const role = userRoleFromAuthSession(authResult.session);
  if (!canEditDashboard(role)) {
    return NextResponse.json({ error: "Permissão insuficiente para editar o dashboard" }, { status: 403 });
  }
  return authResult;
}

export async function resolveRequestEditAccess(): Promise<RequestAuthSuccess | NextResponse> {
  return requireRequestEditAccess(await getRequestSession());
}

export function requireAdminAccess(session: LegacySession): AuthSuccess | NextResponse {
  const authResult = requireAuth(session);
  if (authResult instanceof NextResponse) return authResult;

  const role = getSessionRole(authResult.session);
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }
  return authResult;
}

export function requireRequestAdminAccess(session: AuthSessionPayload | null): RequestAuthSuccess | NextResponse {
  const authResult = requireRequestAuth(session);
  if (authResult instanceof NextResponse) return authResult;

  const role = userRoleFromAuthSession(authResult.session);
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }
  return authResult;
}

export async function resolveRequestAdminAccess(): Promise<RequestAuthSuccess | NextResponse> {
  return requireRequestAdminAccess(await getRequestSession());
}

/** Acesso para gerenciar/compartilhar layouts (Admin e Editor). */
export function requireRequestLayoutAccess(session: AuthSessionPayload | null): RequestAuthSuccess | NextResponse {
  const authResult = requireRequestAuth(session);
  if (authResult instanceof NextResponse) return authResult;

  const role = userRoleFromAuthSession(authResult.session);
  if (!canManageLayouts(role)) {
    return NextResponse.json({ error: "Permissão insuficiente para gerenciar layouts" }, { status: 403 });
  }
  return authResult;
}

export async function resolveRequestLayoutAccess(): Promise<RequestAuthSuccess | NextResponse> {
  return requireRequestLayoutAccess(await getRequestSession());
}
