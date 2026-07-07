import { userRoleFromAuthSession } from "@/lib/auth/roles";
import { getRequestSession } from "@/lib/auth/request-session";
import { redirect } from "next/navigation";
import { AnalyticsWidgetsPageClient } from "@/components/analytics/analytics-widgets-page-client";
import { getAnalyticsPresets } from "@/services/analytics-presets.service";
import { listAnalyticsLayoutsForViewer } from "@/services/layout.service";
import { resolvePermissions } from "@/types/user-permissions";
import { canManageLayouts } from "@/types/user-role";
import { coerceAnalyticsLayout } from "@/types/analytics-layout";
import type { AnalyticsPresetsCollection } from "@/types/analytics-presets";

export default async function AnalyticsPage() {
  const session = await getRequestSession();
  if (!session) redirect("/login");

  const role = userRoleFromAuthSession(session);
  const permissions = resolvePermissions(role, {});

  let presets: AnalyticsPresetsCollection;
  if (canManageLayouts(role)) {
    presets = await getAnalyticsPresets(session.userId);
  } else {
    // Visualizador: vê apenas os layouts Analytics compartilhados com ele (somente leitura).
    const shared = await listAnalyticsLayoutsForViewer(session.userId);
    presets = {
      presets: shared.map((layout) => ({
        id: layout.id,
        name: layout.name,
        description: layout.description ?? undefined,
        layout: coerceAnalyticsLayout(layout.config),
        dataOwnerId: layout.ownerId,
        readOnly: true,
      })),
      activePresetId: shared[0]?.id ?? "",
    };
  }

  return (
    <AnalyticsWidgetsPageClient
      initialPresets={presets}
      permissions={permissions}
    />
  );
}
