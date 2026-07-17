import type { UserRole } from "@/types/user-role";
import type { UserStatus } from "@/types/user-account";

export type TenantStatus = "ACTIVE" | "SUSPENDED";

export type TenantRole = "TENANT_ADMIN" | "EDITOR" | "VIEWER";

export type PlatformRole = "SUPER_ADMIN" | "USER";

export type AuthSessionPayload = {
  userId: string;
  email: string;
  name: string | null;
  /** Papel global de RBAC (fonte de verdade): ADMIN | EDITOR | VIEWER. */
  role: UserRole;
  /** Conta ativa ou desativada por um administrador. */
  status: UserStatus;
  tenantId: string;
  tenantSlug: string;
  tenantRole: TenantRole;
  platformRole: PlatformRole;
  /** Integração Kommo vinculada ao usuário (obrigatória para Dashboard/Analytics). */
  kommoIntegrationId: string | null;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  memberCount?: number;
  kommoCount?: number;
  createdAt: string;
};

export type KommoIntegrationSummary = {
  id: string;
  tenantId: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  accountId: number | null;
  tokenExpiresAt: string | null;
  hasRefreshToken: boolean;
  createdAt: string;
};

export type KommoIntegrationInput = {
  name: string;
  subdomain: string;
  clientId?: string;
  clientSecret?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
};
