import type { KommoClientConfig } from "@/lib/kommo/client";
import {
  KOMMO_MSG,
  messageForKommoIssue,
  type KommoSessionIssueCode,
} from "@/lib/kommo/session-errors";
import { resolveKommoClientConfig, verifyKommoForTenant } from "@/lib/kommo/tenant-client";
import { loadKommoConfigById } from "@/services/kommo-integration.service";
import type { AuthSessionPayload } from "@/types/tenant";

export type KommoSessionDiagnosis =
  | { ok: true; config: KommoClientConfig; integrationId: string }
  | { ok: false; code: KommoSessionIssueCode; error: string; integrationId: string | null };

/** Diagnóstico completo da integração da sessão (motivo real da falha). */
export async function diagnoseKommoForSession(
  session: AuthSessionPayload,
): Promise<KommoSessionDiagnosis> {
  const integrationId = session.kommoIntegrationId;
  if (!integrationId) {
    return {
      ok: false,
      code: "NOT_ASSIGNED",
      error: KOMMO_MSG.NOT_ASSIGNED,
      integrationId: null,
    };
  }

  const loaded = await loadKommoConfigById(integrationId);
  if (!loaded.ok) {
    const code: KommoSessionIssueCode =
      loaded.code === "DECRYPT_FAILED" ? "DECRYPT_FAILED" : "INTEGRATION_MISSING";
    return {
      ok: false,
      code,
      error: loaded.error,
      integrationId,
    };
  }

  return {
    ok: true,
    integrationId,
    config: {
      subdomain: loaded.config.subdomain,
      accessToken: loaded.config.accessToken,
      apiBaseUrl: loaded.config.apiBaseUrl,
    },
  };
}

/** Integração Kommo efetiva da sessão: apenas a vinculada ao usuário. */
export async function resolveKommoForSession(
  session: AuthSessionPayload,
): Promise<KommoClientConfig | null> {
  const diagnosis = await diagnoseKommoForSession(session);
  return diagnosis.ok ? diagnosis.config : null;
}

export async function isKommoConfiguredForSession(session: AuthSessionPayload): Promise<boolean> {
  return (await diagnoseKommoForSession(session)).ok;
}

/** Mensagem amigável quando Kommo não está utilizável na sessão. */
export async function getKommoSessionError(session: AuthSessionPayload): Promise<string | null> {
  const diagnosis = await diagnoseKommoForSession(session);
  return diagnosis.ok ? null : diagnosis.error;
}

export async function kommoFetchForSession<T>(
  session: AuthSessionPayload,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const diagnosis = await diagnoseKommoForSession(session);
  if (!diagnosis.ok) {
    throw new Error(diagnosis.error);
  }
  const { kommoFetchWithConfig } = await import("@/lib/kommo/client");
  return kommoFetchWithConfig<T>(diagnosis.config, path, init);
}

export async function verifyKommoForSession(session: AuthSessionPayload) {
  const diagnosis = await diagnoseKommoForSession(session);
  if (!diagnosis.ok) {
    return {
      ok: false as const,
      code: diagnosis.code,
      error: diagnosis.error,
      integrationId: diagnosis.integrationId,
    };
  }

  const verified = await verifyKommoForTenant(session.tenantId, diagnosis.integrationId);
  if (!verified.ok) {
    return {
      ok: false as const,
      code: "CONNECTION_FAILED" as const,
      error: messageForKommoIssue("CONNECTION_FAILED", verified.error),
      integrationId: diagnosis.integrationId,
    };
  }

  return {
    ok: true as const,
    integrationId: diagnosis.integrationId,
    subdomain: verified.subdomain,
    accountId: verified.accountId,
  };
}

/** @deprecated use diagnoseKommoForSession — mantido para imports legados via resolve */
export async function resolveKommoClientConfigForSession(session: AuthSessionPayload) {
  return resolveKommoClientConfig(session.tenantId, session.kommoIntegrationId);
}
