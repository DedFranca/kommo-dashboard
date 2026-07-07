export { requireAdminAccess, requireAuth, requireEditAccess } from "@/lib/auth-guards";
export type { UserRole } from "@/types/user-role";

/** Permissões de dashboard por papel. */
export function canEditDashboard(role: string): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function canManageUsers(role: string): boolean {
  return role === "ADMIN";
}

export function canShareDashboard(role: string): boolean {
  return role === "ADMIN" || role === "EDITOR";
}
