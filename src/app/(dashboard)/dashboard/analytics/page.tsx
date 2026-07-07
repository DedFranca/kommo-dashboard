import { redirect } from "next/navigation";

/** Redireciona rota legada para /analytics */
export default function LegacyAnalyticsRedirect() {
  redirect("/analytics");
}
