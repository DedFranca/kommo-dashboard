import {
  getKommoBaseUrl,
  isKommoConfigured,
  kommoFetchWithConfig,
  type KommoClientConfig,
  verifyKommoConnectionWithConfig,
} from "@/lib/kommo/client";
import { getActiveKommoConfig, getKommoConfigById } from "@/services/kommo-integration.service";

function runtimeToClientConfig(runtime: {
  subdomain: string;
  accessToken: string;
  apiBaseUrl: string;
}): KommoClientConfig {
  return {
    subdomain: runtime.subdomain,
    accessToken: runtime.accessToken,
    apiBaseUrl: runtime.apiBaseUrl,
  };
}

export async function resolveKommoClientConfig(
  tenantId: string,
  integrationId?: string | null,
): Promise<KommoClientConfig | null> {
  if (integrationId) {
    const byId = await getKommoConfigById(integrationId);
    if (byId) return runtimeToClientConfig(byId);
  }

  const tenantCfg = await getActiveKommoConfig(tenantId);
  if (tenantCfg) return runtimeToClientConfig(tenantCfg);

  if (!isKommoConfigured()) return null;

  const token = process.env.KOMMO_ACCESS_TOKEN?.trim();
  const subdomain = process.env.KOMMO_SUBDOMAIN?.trim();
  if (!token || !subdomain) return null;

  return {
    subdomain: subdomain.replace(/\.kommo\.com.*/i, ""),
    accessToken: token,
    apiBaseUrl: process.env.KOMMO_API_BASE_URL?.trim() || getKommoBaseUrl(subdomain),
  };
}

export async function isKommoConfiguredForTenant(
  tenantId: string,
  integrationId?: string | null,
): Promise<boolean> {
  return (await resolveKommoClientConfig(tenantId, integrationId)) !== null;
}

export async function kommoFetchForTenant<T>(
  tenantId: string,
  path: string,
  init?: RequestInit,
  integrationId?: string | null,
): Promise<T> {
  const tenantCfg = await resolveKommoClientConfig(tenantId, integrationId);
  if (tenantCfg) {
    return kommoFetchWithConfig<T>(tenantCfg, path, init);
  }
  const { kommoFetch } = await import("@/lib/kommo/client");
  return kommoFetch<T>(path, init);
}

export async function verifyKommoForTenant(tenantId: string, integrationId?: string | null) {
  const tenantCfg = await resolveKommoClientConfig(tenantId, integrationId);
  if (tenantCfg) {
    return verifyKommoConnectionWithConfig(tenantCfg);
  }
  const { verifyKommoConnection } = await import("@/lib/kommo/client");
  return verifyKommoConnection();
}
