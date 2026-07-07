const KOMMO_API_VERSION = "v4";

export type KommoClientConfig = {
  subdomain: string;
  accessToken: string;
  apiBaseUrl: string;
};

type JwtPayload = {
  account_id?: number;
  api_domain?: string;
  base_domain?: string;
};

export class KommoApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "KommoApiError";
    this.status = status;
    this.body = body;
  }
}

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizeSubdomain(value: string | undefined | null): string | null {
  if (!value?.trim()) return null;
  let subdomain = value.trim();
  subdomain = subdomain.replace(/^https?:\/\//i, "");
  subdomain = subdomain.replace(/\.kommo\.com.*$/i, "");
  subdomain = subdomain.replace(/\/.*$/, "");
  return subdomain || null;
}

function getKommoConfigFromEnv(): KommoClientConfig | null {
  const accessToken = process.env.KOMMO_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;

  const explicitBase = process.env.KOMMO_API_BASE_URL?.trim();
  const subdomainFromEnv = normalizeSubdomain(process.env.KOMMO_SUBDOMAIN);
  const subdomain = subdomainFromEnv ?? inferSubdomainFromToken(accessToken);

  if (!subdomain && !explicitBase) return null;

  const apiBaseUrl = explicitBase
    ? explicitBase.replace(/\/$/, "")
    : getKommoBaseUrl(subdomain!);

  return {
    subdomain: subdomain ?? "unknown",
    accessToken,
    apiBaseUrl,
  };
}

function inferSubdomainFromToken(accessToken: string): string | null {
  const payload = parseJwtPayload(accessToken);
  if (!payload) return null;
  return null;
}

/** Base URL da API REST Kommo (servidor apenas — nunca exponha o token ao cliente). */
export function getKommoBaseUrl(subdomain: string) {
  const clean = normalizeSubdomain(subdomain) ?? subdomain;
  return `https://${clean}.kommo.com/api/${KOMMO_API_VERSION}`;
}

export function getKommoJwtHints(accessToken?: string) {
  const token = accessToken ?? process.env.KOMMO_ACCESS_TOKEN?.trim();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload) return null;
  return {
    accountId: payload.account_id,
    apiDomain: payload.api_domain,
    /** api-c.kommo.com não aceita Bearer direto — use {subdomain}.kommo.com */
    preferSubdomainUrl: payload.api_domain?.includes("api-c."),
  };
}

function formatKommoError(status: number, body: unknown, cfg: KommoClientConfig): string {
  const detail =
    body && typeof body === "object" && "detail" in body
      ? String((body as { detail: unknown }).detail)
      : typeof body === "string" && body.trim()
        ? body.trim()
        : null;

  if (status === 402) {
    const jwt = getKommoJwtHints(cfg.accessToken);
    const hints = [
      `Subdomínio atual: "${cfg.subdomain}" (URL: ${cfg.apiBaseUrl}).`,
      "O HTTP 402 com corpo vazio geralmente indica subdomínio incorreto — use o trecho da URL da sua conta (ex.: drivanramos para https://drivanramos.kommo.com).",
      "Não use api-c.kommo.com como base URL; use https://{seu-subdominio}.kommo.com/api/v4.",
    ];
    if (jwt?.accountId) hints.push(`Token JWT pertence à conta ID ${jwt.accountId}.`);
    if (detail) hints.unshift(detail);
    return `Kommo API 402: ${hints.join(" ")}`;
  }

  if (status === 401) {
    return `Kommo API 401: token inválido ou expirado${detail ? ` — ${detail}` : ""}.`;
  }

  const serialized = detail ?? (typeof body === "string" ? body : JSON.stringify(body));
  return `Kommo API ${status}: ${serialized || "sem corpo na resposta"}`;
}

export type KommoRequestOptions = RequestInit & { path: string };

/**
 * Cliente HTTP mínimo para a API Kommo.
 * Lança KommoApiError com status e corpo para tratamento nas rotas.
 */
export async function kommoFetchWithConfig<T>(
  cfg: KommoClientConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const jwtHints = getKommoJwtHints(cfg.accessToken);
  if (jwtHints?.preferSubdomainUrl && cfg.apiBaseUrl.includes("api-c.kommo.com")) {
    throw new Error(
      "KOMMO_API_BASE_URL aponta para api-c.kommo.com, mas tokens OAuth/long-lived devem usar https://{subdominio}.kommo.com/api/v4",
    );
  }

  const url = `${cfg.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = text.trim() ? text : null;
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new KommoApiError(res.status, body, formatKommoError(res.status, body, cfg));
  }

  return body as T;
}

/** Legado: usa variáveis de ambiente. Preferir `kommoFetchForTenant`. */
export async function kommoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = getKommoConfigFromEnv();
  if (!cfg) {
    throw new Error("Kommo não configurado: defina KOMMO_SUBDOMAIN e KOMMO_ACCESS_TOKEN");
  }
  return kommoFetchWithConfig<T>(cfg, path, init);
}

export function isKommoConfigured() {
  return getKommoConfigFromEnv() !== null;
}

export function getKommoConfigSummary() {
  const cfg = getKommoConfigFromEnv();
  if (!cfg) return null;
  return {
    subdomain: cfg.subdomain,
    apiBaseUrl: cfg.apiBaseUrl,
    jwt: getKommoJwtHints(cfg.accessToken),
  };
}

export async function verifyKommoConnectionWithConfig(cfg: KommoClientConfig): Promise<{
  ok: boolean;
  subdomain?: string;
  accountId?: number;
  error?: string;
}> {
  try {
    const account = await kommoFetchWithConfig<{ id?: number; subdomain?: string; name?: string }>(
      cfg,
      "/account",
    );
    return {
      ok: true,
      subdomain: account.subdomain,
      accountId: account.id,
    };
  } catch (error) {
    if (error instanceof KommoApiError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

/** Valida token + subdomínio chamando GET /account. */
export async function verifyKommoConnection(): Promise<{
  ok: boolean;
  subdomain?: string;
  accountId?: number;
  error?: string;
}> {
  if (!isKommoConfigured()) {
    return { ok: false, error: "Kommo não configurado" };
  }

  const cfg = getKommoConfigFromEnv();
  if (!cfg) return { ok: false, error: "Kommo não configurado" };
  return verifyKommoConnectionWithConfig(cfg);
}
