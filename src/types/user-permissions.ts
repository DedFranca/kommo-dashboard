import type { UserRole } from "@/types/user-role";
import { canManageUsers, canManageLayouts, canShareLayouts } from "@/types/user-role";

export type UserPermissions = {
  canEditDashboard?: boolean;
  canImportData?: boolean;
  canManagePresets?: boolean;
  canRefreshKommo?: boolean;
};

export type ResolvedPermissions = {
  canEditDashboard: boolean;
  canImportData: boolean;
  canManagePresets: boolean;
  canRefreshKommo: boolean;
  canManageUsers: boolean;
  canManageLayouts: boolean;
  canShareLayouts: boolean;
};

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  canEditDashboard: "Editar dashboard e widgets",
  canImportData: "Importar CSV",
  canManagePresets: "Gerenciar presets de layout",
  canRefreshKommo: "Atualizar dados Kommo",
};

const ROLE_DEFAULTS: Record<
  UserRole,
  Pick<ResolvedPermissions, "canEditDashboard" | "canImportData" | "canManagePresets" | "canRefreshKommo">
> = {
  ADMIN: {
    canEditDashboard: true,
    canImportData: true,
    canManagePresets: true,
    canRefreshKommo: true,
  },
  EDITOR: {
    canEditDashboard: true,
    canImportData: true,
    canManagePresets: true,
    canRefreshKommo: true,
  },
  VIEWER: {
    canEditDashboard: false,
    canImportData: false,
    canManagePresets: false,
    canRefreshKommo: false,
  },
};

export function parseUserPermissions(raw: unknown): UserPermissions {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const result: UserPermissions = {};
  if (typeof obj.canEditDashboard === "boolean") result.canEditDashboard = obj.canEditDashboard;
  if (typeof obj.canImportData === "boolean") result.canImportData = obj.canImportData;
  if (typeof obj.canManagePresets === "boolean") result.canManagePresets = obj.canManagePresets;
  if (typeof obj.canRefreshKommo === "boolean") result.canRefreshKommo = obj.canRefreshKommo;
  return result;
}

function pickOverride(
  role: UserRole,
  key: keyof UserPermissions,
  overrides?: UserPermissions,
): boolean {
  const roleDefault = ROLE_DEFAULTS[role][key];
  const override = overrides?.[key];
  if (override === undefined) return roleDefault;
  // VIEWER só ganha permissão se ADMIN conceder explicitamente
  if (role === "VIEWER") return override === true;
  // ADMIN/EDITOR: override pode restringir (false) mas não elevar além do papel
  return override;
}

export function resolvePermissions(role: UserRole, overrides?: UserPermissions): ResolvedPermissions {
  return {
    canEditDashboard: pickOverride(role, "canEditDashboard", overrides),
    canImportData: pickOverride(role, "canImportData", overrides),
    canManagePresets: pickOverride(role, "canManagePresets", overrides),
    canRefreshKommo: pickOverride(role, "canRefreshKommo", overrides),
    canManageUsers: canManageUsers(role),
    canManageLayouts: canManageLayouts(role),
    canShareLayouts: canShareLayouts(role),
  };
}

export function userCanEdit(role: UserRole, overrides?: UserPermissions): boolean {
  return resolvePermissions(role, overrides).canEditDashboard;
}
