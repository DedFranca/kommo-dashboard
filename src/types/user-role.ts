export const USER_ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Visualizador",
};

export type Permission =
  | "dashboard:read"
  | "dashboard:edit"
  | "dashboard:admin"
  | "users:manage"
  | "layouts:manage"
  | "layouts:share";

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: [
    "dashboard:read",
    "dashboard:edit",
    "dashboard:admin",
    "users:manage",
    "layouts:manage",
    "layouts:share",
  ],
  EDITOR: ["dashboard:read", "dashboard:edit", "layouts:manage", "layouts:share"],
  VIEWER: ["dashboard:read"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canEditDashboard(role: UserRole): boolean {
  return hasPermission(role, "dashboard:edit");
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, "users:manage");
}

export function canManageLayouts(role: UserRole): boolean {
  return hasPermission(role, "layouts:manage");
}

export function canShareLayouts(role: UserRole): boolean {
  return hasPermission(role, "layouts:share");
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function parseUserRole(value: unknown, fallback: UserRole = "VIEWER"): UserRole {
  return isUserRole(value) ? value : fallback;
}
