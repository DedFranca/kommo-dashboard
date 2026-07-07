import { getRequestSession } from "@/lib/auth/request-session";
import { loadDashboardInitialMetrics } from "@/lib/dashboard/initial-metrics";
import { redirect } from "next/navigation";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default async function DashboardPage() {
  const session = await getRequestSession();
  if (!session) redirect("/login");

  const initial = await loadDashboardInitialMetrics(session);

  return <DashboardPageClient initial={initial} />;
}
