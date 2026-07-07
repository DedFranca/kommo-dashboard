import { decryptField, encryptField } from "@/lib/crypto/field-encryption";
import { getKommoBaseUrl } from "@/lib/kommo/client";
import { prisma } from "@/lib/prisma";
import type { KommoIntegrationInput, KommoIntegrationSummary } from "@/types/tenant";

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

/** Lista todas as integrações (modelo flat de organização única) para atribuição a Visualizadores. */
export async function listAllKommoIntegrations(): Promise<KommoIntegrationSummary[]> {
  const rows = await prisma.kommoIntegration.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toSummary);
}

/** Resolve a configuração de runtime de uma integração específica (usada por Visualizadores). */
export async function getKommoConfigById(integrationId: string): Promise<KommoRuntimeConfig | null> {
  const row = await prisma.kommoIntegration.findUnique({ where: { id: integrationId } });
  if (!row) return null;
  return hydrateRuntimeConfig(row);
}

export async function getActiveKommoConfig(tenantId: string): Promise<KommoRuntimeConfig | null> {
  const row = await prisma.kommoIntegration.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!row) return null;
  return hydrateRuntimeConfig(row);
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

export async function createKommoIntegration(tenantId: string, input: KommoIntegrationInput) {
  const subdomain = input.subdomain.trim().toLowerCase().replace(/\.kommo\.com.*/i, "");
  const count = await prisma.kommoIntegration.count({ where: { tenantId } });

  return prisma.kommoIntegration.create({
    data: {
      tenantId,
      name: input.name.trim(),
      subdomain,
      clientId: input.clientId?.trim() || null,
      clientSecretEncrypted: input.clientSecret ? encryptField(input.clientSecret) : null,
      accessTokenEncrypted: encryptField(input.accessToken),
      refreshTokenEncrypted: input.refreshToken ? encryptField(input.refreshToken) : null,
      tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
      isActive: count === 0,
    },
  });
}

export async function setActiveKommoIntegration(tenantId: string, integrationId: string) {
  await prisma.$transaction([
    prisma.kommoIntegration.updateMany({
      where: { tenantId },
      data: { isActive: false },
    }),
    prisma.kommoIntegration.update({
      where: { id: integrationId, tenantId },
      data: { isActive: true },
    }),
  ]);
}

export async function deleteKommoIntegration(tenantId: string, integrationId: string) {
  return prisma.kommoIntegration.delete({
    where: { id: integrationId, tenantId },
  });
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
