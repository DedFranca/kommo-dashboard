import {
  assertEncryptRoundTrip,
  assertFieldEncryptionReady,
  decryptField,
  encryptField,
  getFieldEncryptionSource,
} from "@/lib/crypto/field-encryption";
import {
  getKommoBaseUrl,
  verifyKommoConnectionWithConfig,
} from "@/lib/kommo/client";
import { KOMMO_MSG } from "@/lib/kommo/session-errors";
import { prisma } from "@/lib/prisma";
import type { KommoIntegrationInput, KommoIntegrationSummary } from "@/types/tenant";

export type CreateKommoIntegrationResult =
  | { ok: true; integration: Awaited<ReturnType<typeof prisma.kommoIntegration.create>> }
  | { ok: false; error: string };

export type KommoRuntimeConfig = {
  integrationId: string;
  tenantId: string;
  subdomain: string;
  accessToken: string;
  clientId: string | null;
  clientSecret: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  apiBaseUrl: string;
};

export type KommoConfigLoadResult =
  | { ok: true; config: KommoRuntimeConfig }
  | { ok: false; code: "NOT_FOUND" | "DECRYPT_FAILED"; error: string };

function toSummary(row: {
  id: string;
  tenantId: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  accountId: number | null;
  tokenExpiresAt: Date | null;
  refreshTokenEncrypted: string | null;
  createdAt: Date;
}): KommoIntegrationSummary {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    subdomain: row.subdomain,
    isActive: row.isActive,
    accountId: row.accountId,
    tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    hasRefreshToken: Boolean(row.refreshTokenEncrypted),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listKommoIntegrations(tenantId: string): Promise<KommoIntegrationSummary[]> {
  const rows = await prisma.kommoIntegration.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toSummary);
}

/** Lista todas as integrações (modelo flat) para atribuição a usuários. */
export async function listAllKommoIntegrations(): Promise<KommoIntegrationSummary[]> {
  const rows = await prisma.kommoIntegration.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toSummary);
}

/** Resolve a configuração de runtime de uma integração específica. */
export async function getKommoConfigById(integrationId: string): Promise<KommoRuntimeConfig | null> {
  const result = await loadKommoConfigById(integrationId);
  return result.ok ? result.config : null;
}

/** Carrega integração com motivo explícito de falha (decrypt vs inexistente). */
export async function loadKommoConfigById(integrationId: string): Promise<KommoConfigLoadResult> {
  const row = await prisma.kommoIntegration.findUnique({ where: { id: integrationId } });
  if (!row) {
    return { ok: false, code: "NOT_FOUND", error: KOMMO_MSG.INTEGRATION_MISSING };
  }
  try {
    const config = await hydrateRuntimeConfig(row);
    return { ok: true, config };
  } catch (err) {
    console.error(
      "[kommo] Falha ao ler token (chave APP_ENCRYPTION_KEY?). integrationId=",
      row.id,
      "encryptionSource=",
      getFieldEncryptionSource(),
      err,
    );
    return { ok: false, code: "DECRYPT_FAILED", error: KOMMO_MSG.DECRYPT_FAILED };
  }
}

type KommoIntegrationRow = NonNullable<
  Awaited<ReturnType<typeof prisma.kommoIntegration.findUnique>>
>;

async function hydrateRuntimeConfig(row: KommoIntegrationRow): Promise<KommoRuntimeConfig> {
  let accessToken = decryptField(row.accessTokenEncrypted);
  const expiresAt = row.tokenExpiresAt;
  const needsRefresh =
    expiresAt && expiresAt.getTime() < Date.now() + 60_000 && row.refreshTokenEncrypted;

  if (needsRefresh && row.clientId && row.clientSecretEncrypted && row.refreshTokenEncrypted) {
    const refreshed = await refreshKommoOAuthTokens({
      subdomain: row.subdomain,
      clientId: row.clientId,
      clientSecret: decryptField(row.clientSecretEncrypted),
      refreshToken: decryptField(row.refreshTokenEncrypted),
    });
    if (refreshed) {
      accessToken = refreshed.accessToken;
      await prisma.kommoIntegration.update({
        where: { id: row.id },
        data: {
          accessTokenEncrypted: encryptField(refreshed.accessToken),
          refreshTokenEncrypted: refreshed.refreshToken
            ? encryptField(refreshed.refreshToken)
            : row.refreshTokenEncrypted,
          tokenExpiresAt: refreshed.expiresAt,
        },
      });
    }
  }

  return {
    integrationId: row.id,
    tenantId: row.tenantId,
    subdomain: row.subdomain,
    accessToken,
    clientId: row.clientId,
    clientSecret: row.clientSecretEncrypted ? decryptField(row.clientSecretEncrypted) : null,
    refreshToken: row.refreshTokenEncrypted ? decryptField(row.refreshTokenEncrypted) : null,
    tokenExpiresAt: row.tokenExpiresAt,
    apiBaseUrl: getKommoBaseUrl(row.subdomain),
  };
}

export async function createKommoIntegration(
  tenantId: string,
  input: KommoIntegrationInput,
): Promise<CreateKommoIntegrationResult> {
  const encryptionReady = assertFieldEncryptionReady();
  if (!encryptionReady.ok) {
    return { ok: false, error: encryptionReady.error };
  }

  try {
    assertEncryptRoundTrip("kommo-encryption-probe");
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha na criptografia de tokens.",
    };
  }

  const subdomain = input.subdomain.trim().toLowerCase().replace(/\.kommo\.com.*/i, "");
  const accessToken = input.accessToken.trim();
  const apiBaseUrl = getKommoBaseUrl(subdomain);

  const verified = await verifyKommoConnectionWithConfig({
    subdomain,
    accessToken,
    apiBaseUrl,
  });
  if (!verified.ok) {
    return {
      ok: false,
      error: verified.error ?? "Não foi possível conectar à API Kommo. Verifique subdomínio e token.",
    };
  }

  const accessTokenEncrypted = encryptField(accessToken);
  // Garante que a chave atual consegue ler o que acabou de ser gravado.
  try {
    if (decryptField(accessTokenEncrypted) !== accessToken) {
      return { ok: false, error: "Falha ao cifrar o access token. Verifique APP_ENCRYPTION_KEY." };
    }
  } catch {
    return { ok: false, error: "Falha ao cifrar o access token. Verifique APP_ENCRYPTION_KEY." };
  }

  const integration = await prisma.kommoIntegration.create({
    data: {
      tenantId,
      name: input.name.trim(),
      subdomain,
      clientId: input.clientId?.trim() || null,
      clientSecretEncrypted: input.clientSecret ? encryptField(input.clientSecret) : null,
      accessTokenEncrypted,
      refreshTokenEncrypted: input.refreshToken ? encryptField(input.refreshToken) : null,
      tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
      accountId: verified.accountId ?? null,
      isActive: false,
    },
  });

  const reloaded = await loadKommoConfigById(integration.id);
  if (!reloaded.ok) {
    await prisma.kommoIntegration.delete({ where: { id: integration.id } }).catch(() => undefined);
    return { ok: false, error: reloaded.error };
  }

  return { ok: true, integration };
}

/** Atualiza o access token de uma integração existente (revalida + recifra). */
export async function updateKommoIntegrationAccessToken(
  integrationId: string,
  accessTokenRaw: string,
): Promise<CreateKommoIntegrationResult> {
  const encryptionReady = assertFieldEncryptionReady();
  if (!encryptionReady.ok) {
    return { ok: false, error: encryptionReady.error };
  }

  const row = await prisma.kommoIntegration.findUnique({ where: { id: integrationId } });
  if (!row) {
    return { ok: false, error: "Integração não encontrada" };
  }

  const accessToken = accessTokenRaw.trim();
  if (!accessToken) {
    return { ok: false, error: "Access token é obrigatório." };
  }

  const verified = await verifyKommoConnectionWithConfig({
    subdomain: row.subdomain,
    accessToken,
    apiBaseUrl: getKommoBaseUrl(row.subdomain),
  });
  if (!verified.ok) {
    return {
      ok: false,
      error: verified.error ?? "Não foi possível conectar à API Kommo com este token.",
    };
  }

  const accessTokenEncrypted = encryptField(accessToken);
  try {
    if (decryptField(accessTokenEncrypted) !== accessToken) {
      return { ok: false, error: "Falha ao cifrar o access token. Verifique APP_ENCRYPTION_KEY." };
    }
  } catch {
    return { ok: false, error: "Falha ao cifrar o access token. Verifique APP_ENCRYPTION_KEY." };
  }

  const integration = await prisma.kommoIntegration.update({
    where: { id: integrationId },
    data: {
      accessTokenEncrypted,
      accountId: verified.accountId ?? row.accountId,
    },
  });

  return { ok: true, integration };
}

export async function deleteKommoIntegration(tenantId: string, integrationId: string) {
  const row = await prisma.kommoIntegration.findFirst({
    where: { id: integrationId, tenantId },
    select: { id: true },
  });
  if (!row) throw new Error("Integração não encontrada");

  await prisma.kommoIntegration.delete({ where: { id: integrationId } });
  return row;
}

/** Remove integração pelo id (modelo flat). */
export async function deleteKommoIntegrationById(integrationId: string) {
  const row = await prisma.kommoIntegration.findUnique({
    where: { id: integrationId },
    select: { id: true, tenantId: true },
  });
  if (!row) throw new Error("Integração não encontrada");
  await deleteKommoIntegration(row.tenantId, row.id);
  return row;
}

async function refreshKommoOAuthTokens(input: {
  subdomain: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresAt: Date } | null> {
  try {
    const url = `https://${input.subdomain}.kommo.com/oauth2/access_token`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        grant_type: "refresh_token",
        refresh_token: input.refreshToken,
        redirect_uri: process.env.KOMMO_REDIRECT_URI ?? "https://localhost/oauth",
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in ?? 86_400));
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  } catch {
    return null;
  }
}
