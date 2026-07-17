import type { UserRole } from "@/types/user-role";

export const USER_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Ativa",
  DISABLED: "Desativada",
};

export function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && USER_STATUSES.includes(value as UserStatus);
}

export function parseUserStatus(value: unknown, fallback: UserStatus = "ACTIVE"): UserStatus {
  return isUserStatus(value) ? value : fallback;
}

/** Integração Kommo disponível para vincular a qualquer usuário. */
export type AdminIntegrationOption = {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
};

/** Linha exibida no painel administrativo de usuários. */
export type AdminUserSummary = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  kommoIntegrationId: string | null;
  kommoIntegrationName: string | null;
  createdAt: string;
};
