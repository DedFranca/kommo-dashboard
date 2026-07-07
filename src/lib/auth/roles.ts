import type { AuthSessionPayload } from "@/types/tenant";
import type { UserRole } from "@/types/user-role";
import { isUserRole } from "@/types/user-role";

/**
 * Papel global de RBAC da sessão. A fonte de verdade é `session.role`
 * (sincronizado do banco em cada requisição). Mantemos um fallback derivado
 * dos papéis legados para tokens antigos sem o campo `role`.
 */
export function userRoleFromAuthSession(session: AuthSessionPayload): UserRole {
  if (isUserRole(session.role)) return session.role;
  if (session.platformRole === "SUPER_ADMIN" || session.tenantRole === "TENANT_ADMIN") return "ADMIN";
  if (session.tenantRole === "EDITOR") return "EDITOR";
  return "VIEWER";
}
