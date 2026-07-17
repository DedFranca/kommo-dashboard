import type { KommoClientConfig } from "@/lib/kommo/client";
import { resolveKommoClientConfig, verifyKommoForTenant } from "@/lib/kommo/tenant-client";
import type { AuthSessionPayload } from "@/types/tenant";

/** Integração Kommo efetiva da sessão: apenas a vinculada ao usuário. */
export async function resolveKommoForSession(
  session: AuthSessionPayload,
): Promise<KommoClientConfig | null> {
  if (!session.kommoIntegrationId) return null;
  return resolveKommoClientConfig(session.tenantId, session.kommoIntegrationId);
}

export async function isKommoConfiguredForSession(session: AuthSessionPayload): Promise<boolean> {
  return (await resolveKommoForSession(session)) !== null;
}

export async function kommoFetchForSession<T>(
  session: AuthSessionPayload,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cfg = await resolveKommoForSession(session);
  if (!cfg) {
    throw new Error(
      "Nenhuma integração Kommo vinculada a esta conta. Peça a um administrador para atribuir uma.",
    );
  }
  const { kommoFetchWithConfig } = await import("@/lib/kommo/client");
  return kommoFetchWithConfig<T>(cfg, path, init);
}

export async function verifyKommoForSession(session: AuthSessionPayload) {
  if (!session.kommoIntegrationId) {
    return {
      ok: false as const,
      error:
        "Nenhuma integração Kommo vinculada a esta conta. Peça a um administrador para atribuir uma.",
    };
  }
  return verifyKommoForTenant(session.tenantId, session.kommoIntegrationId);
}
