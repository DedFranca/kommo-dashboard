import type { KommoClientConfig } from "@/lib/kommo/client";
import { resolveKommoClientConfig, verifyKommoForTenant } from "@/lib/kommo/tenant-client";
import type { AuthSessionPayload } from "@/types/tenant";

/** Integração Kommo efetiva da sessão (Visualizador → integração atribuída; demais → tenant ativo → env). */
export async function resolveKommoForSession(
  session: AuthSessionPayload,
): Promise<KommoClientConfig | null> {
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
  if (!cfg) throw new Error("Kommo não está configurado para esta conta.");
  const { kommoFetchWithConfig } = await import("@/lib/kommo/client");
  return kommoFetchWithConfig<T>(cfg, path, init);
}

export async function verifyKommoForSession(session: AuthSessionPayload) {
  return verifyKommoForTenant(session.tenantId, session.kommoIntegrationId);
}
