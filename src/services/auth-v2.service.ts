import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from "@/lib/auth/cookies";
import {
  generateRefreshTokenRaw,
  hashRefreshToken,
  mapLegacyRoleToTenant,
  mapPlatformRole,
  refreshTokenExpiresAt,
  signAccessToken,
} from "@/lib/auth/jwt-tokens";
import { prisma } from "@/lib/prisma";
import type { AuthSessionPayload, TenantRole } from "@/types/tenant";
import { parseUserRole } from "@/types/user-role";
import { parseUserStatus } from "@/types/user-account";

export type LoginResult =
  | { ok: true; session: AuthSessionPayload }
  | { ok: false; error: string };

async function resolveUserTenant(userId: string, tenantId?: string) {
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });

  if (!memberships.length) return null;

  if (tenantId) {
    const match = memberships.find((m) => m.tenantId === tenantId);
    if (match) return match;
  }

  return memberships[0];
}

async function activeKommoForTenant(tenantId: string) {
  return prisma.kommoIntegration.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
}

function buildSessionPayload(
  user: {
    id: string;
    email: string;
    name: string | null;
    platformRole: string;
    role: string;
    status?: string;
  },
  membership: { tenantId: string; role: string; tenant: { slug: string } },
  kommoId: string | null,
): AuthSessionPayload {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: parseUserRole(user.role),
    status: parseUserStatus(user.status),
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    tenantRole: membership.role as TenantRole,
    platformRole: mapPlatformRole(user.platformRole),
    kommoIntegrationId: kommoId,
  };
}

/**
 * Integração efetiva da sessão: a vinculada ao usuário (Visualizador) tem
 * prioridade; caso contrário usa a integração ativa do tenant (Admin/Editor).
 */
async function resolveSessionIntegrationId(
  user: { kommoIntegrationId: string | null },
  tenantId: string,
): Promise<string | null> {
  if (user.kommoIntegrationId) return user.kommoIntegrationId;
  const kommo = await activeKommoForTenant(tenantId);
  return kommo?.id ?? null;
}

export async function loginWithCredentials(
  email: string,
  password: string,
  tenantId?: string,
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.passwordHash) return { ok: false, error: "E-mail ou senha inválidos." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, error: "E-mail ou senha inválidos." };

  if (parseUserStatus(user.status) === "DISABLED") {
    return { ok: false, error: "Conta desativada. Contate um administrador." };
  }

  await ensureLegacyUserTenant(user.id, user.role);
  let membership = await resolveUserTenant(user.id, tenantId);

  if (!membership && user.platformRole === "SUPER_ADMIN") {
    const fallbackTenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (fallbackTenant) {
      membership = {
        id: "super",
        tenantId: fallbackTenant.id,
        userId: user.id,
        role: "TENANT_ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: fallbackTenant,
      };
    }
  }

  if (!membership) {
    return { ok: false, error: "Usuário sem cliente associado. Contate o administrador." };
  }

  if (membership.tenant.status === "SUSPENDED") {
    return { ok: false, error: "Cliente suspenso. Contate o suporte." };
  }

  const kommoId = await resolveSessionIntegrationId(user, membership.tenantId);
  const session = buildSessionPayload(user, membership, kommoId);
  await issueAuthCookies(session);
  return { ok: true, session };
}

export async function issueAuthCookies(session: AuthSessionPayload) {
  const access = await signAccessToken(session);
  const refreshRaw = generateRefreshTokenRaw();
  const refreshHash = hashRefreshToken(refreshRaw);
  const expiresAt = refreshTokenExpiresAt();

  await prisma.refreshToken.create({
    data: {
      userId: session.userId,
      tenantId: session.tenantId,
      tokenHash: refreshHash,
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(ACCESS_COOKIE, access, accessCookieOptions());
  jar.set(REFRESH_COOKIE, refreshRaw, refreshCookieOptions());
}

export async function refreshAuthSession(): Promise<LoginResult> {
  const jar = await cookies();
  const refreshRaw = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshRaw) return { ok: false, error: "Sessão expirada." };

  const tokenHash = hashRefreshToken(refreshRaw);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    return { ok: false, error: "Sessão expirada." };
  }

  if (parseUserStatus(stored.user.status) === "DISABLED") {
    await prisma.refreshToken.delete({ where: { tokenHash } }).catch(() => {});
    return { ok: false, error: "Conta desativada. Contate um administrador." };
  }

  const membership = await resolveUserTenant(stored.userId, stored.tenantId ?? undefined);
  if (!membership) return { ok: false, error: "Usuário sem cliente associado." };

  const kommoId = await resolveSessionIntegrationId(stored.user, membership.tenantId);
  const session = buildSessionPayload(stored.user, membership, kommoId);

  await prisma.refreshToken.delete({ where: { tokenHash } });
  await issueAuthCookies(session);
  return { ok: true, session };
}

export async function logoutUser() {
  const jar = await cookies();
  const refreshRaw = jar.get(REFRESH_COOKIE)?.value;
  if (refreshRaw) {
    const tokenHash = hashRefreshToken(refreshRaw);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/** Garante membership + tenant para usuários legados no primeiro login. */
export async function ensureLegacyUserTenant(userId: string, legacyRole: string) {
  const existing = await prisma.tenantMembership.findFirst({ where: { userId } });
  if (existing) return existing;

  const tenant = await prisma.tenant.create({
    data: {
      name: "Cliente Principal",
      slug: `cliente-${userId.slice(0, 8)}`,
      memberships: {
        create: {
          userId,
          role: mapLegacyRoleToTenant(parseUserRole(legacyRole)),
        },
      },
      dashboards: {
        create: {
          userId,
          name: "Dashboard Executivo",
          layout: { version: 2, widgets: [], layouts: { lg: [] } },
          dataSources: [],
          settings: {},
          layoutPresets: [],
        },
      },
    },
    include: { memberships: true },
  });

  return tenant.memberships[0];
}
