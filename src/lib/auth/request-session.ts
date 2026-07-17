import "server-only";

import { getAuthSession } from "@/lib/auth/session";
import type { AuthSessionPayload } from "@/types/tenant";
import { parseUserRole } from "@/types/user-role";
import { parseUserStatus } from "@/types/user-account";
import { prisma } from "@/lib/prisma";

/**
 * Sessão da requisição (JWT v2). Sincroniza papel/status/integração com o banco
 * em cada chamada para que mudanças administrativas (rebaixar papel, desativar
 * conta, reatribuir integração) tenham efeito imediato, sem esperar o token
 * expirar. Retorna null para contas inexistentes ou desativadas.
 */
export async function getRequestSession(): Promise<AuthSessionPayload | null> {
  const jwtSession = await getAuthSession();
  if (!jwtSession) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: jwtSession.userId },
      select: { id: true, role: true, status: true, kommoIntegrationId: true },
    });
    if (!user) return null;

    const status = parseUserStatus(user.status);
    if (status === "DISABLED") return null;

    const kommoIntegrationId = await resolveEffectiveIntegrationId(user.kommoIntegrationId);

    return {
      ...jwtSession,
      role: parseUserRole(user.role),
      status,
      kommoIntegrationId,
    };
  } catch (err) {
    console.error("[auth] Falha ao validar sessão no banco:", err);
    return null;
  }
}

/**
 * Integração efetiva: apenas a vinculada ao usuário (se ainda existir).
 * Sem fallback para integração "ativa" do tenant.
 */
async function resolveEffectiveIntegrationId(userKommoId: string | null): Promise<string | null> {
  if (!userKommoId) return null;

  const assigned = await prisma.kommoIntegration.findUnique({
    where: { id: userKommoId },
    select: { id: true },
  });
  return assigned?.id ?? null;
}

export async function requireRequestSession(): Promise<AuthSessionPayload> {
  const session = await getRequestSession();
  if (!session) throw new Error("Não autorizado");
  return session;
}

export function isPlatformSuperAdmin(session: AuthSessionPayload): boolean {
  return session.platformRole === "SUPER_ADMIN";
}

export function canManageTenant(session: AuthSessionPayload): boolean {
  return isPlatformSuperAdmin(session) || session.role === "ADMIN" || session.tenantRole === "TENANT_ADMIN";
}
