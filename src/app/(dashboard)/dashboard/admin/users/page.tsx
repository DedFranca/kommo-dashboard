import { getRequestSession } from "@/lib/auth/request-session";
import { userRoleFromAuthSession } from "@/lib/auth/roles";
import { canManageUsers } from "@/types/user-role";
import { redirect } from "next/navigation";
import { UsersAdminPanel } from "@/components/admin/users-admin-panel";
import { IntegrationsAdminSection } from "@/components/admin/integrations-admin-section";

export default async function AdminUsersPage() {
  const session = await getRequestSession();
  if (!session) redirect("/login");

  const role = userRoleFromAuthSession(session);
  if (!canManageUsers(role)) redirect("/dashboard");

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Gerenciar usuários</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Crie contas de Editor ou Visualizador, atribua a integração Kommo de cada usuário (incluindo
          Admin e Editor) e controle papéis, status e exclusão. Cada usuário precisa de uma integração
          vinculada para ver dados no Dashboard e no Analytics.
        </p>
      </div>
      <UsersAdminPanel currentUserId={session.userId} />

      <div className="border-t border-border pt-6">
        <IntegrationsAdminSection />
      </div>
    </div>
  );
}
