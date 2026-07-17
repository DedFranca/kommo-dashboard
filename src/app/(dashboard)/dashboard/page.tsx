import { getRequestSession } from "@/lib/auth/request-session";
import { loadDashboardInitialMetrics } from "@/lib/dashboard/initial-metrics";
import { redirect } from "next/navigation";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default async function DashboardPage() {
  const session = await getRequestSession();
  if (!session) redirect("/login");

  let initial: Awaited<ReturnType<typeof loadDashboardInitialMetrics>>;
  try {
    initial = await loadDashboardInitialMetrics(session);
  } catch (err) {
    console.error("[dashboard] Falha ao carregar métricas iniciais:", err);
    initial = {
      metrics: null,
      period: { from: "", to: "" },
      kommoConfigured: false,
      kommoError: "Não foi possível carregar o status da integração Kommo.",
      revalidate: false,
    };
  }

  return <DashboardPageClient initial={initial} />;
}
