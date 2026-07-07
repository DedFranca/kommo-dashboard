import { prisma } from "@/lib/prisma";
import {
  ANALYTICS_LAYOUT_VERSION,
  DEFAULT_ANALYTICS_LAYOUT,
  normalizeAnalyticsLayout,
} from "@/types/analytics-layout";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  LAYOUT_VERSION,
  normalizeDashboardLayout,
  type DashboardLayoutState,
} from "@/types/dashboard-layout";
import { getDashboardSettings, saveDashboardSettings } from "@/services/data-source.service";

export async function getOrCreateDashboardForUser(userId: string) {
  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado");

  let dashboard = await prisma.dashboard.findUnique({ where: { userId } });

  if (!dashboard) {
    // Create dashboard via user relation to avoid FK race conditions
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        dashboard: {
          create: {
            name: "Meu dashboard",
            layout: DEFAULT_DASHBOARD_LAYOUT as object,
            dataSources: [],
            settings: {},
            layoutPresets: [],
          },
        },
      },
      include: { dashboard: true },
    });
    dashboard = updated.dashboard as typeof dashboard;
  }

  if (!dashboard) throw new Error("Dashboard não encontrado");

  const layout = normalizeDashboardLayout(dashboard.layout);
  const raw = dashboard.layout as { version?: number } | null;
  const needsPersist =
    !dashboard.layout ||
    (typeof dashboard.layout === "object" &&
      dashboard.layout !== null &&
      Object.keys(dashboard.layout as object).length === 0) ||
    !raw?.version ||
    raw.version < LAYOUT_VERSION;

  if (needsPersist) {
    await prisma.dashboard.update({
      where: { id: dashboard.id },
      data: { layout: layout as object },
    });
  }

  return { ...dashboard, layout };
}

export async function updateDashboardLayout(userId: string, layout: DashboardLayoutState) {
  const dashboard = await prisma.dashboard.findUnique({ where: { userId } });
  if (!dashboard) throw new Error("Dashboard não encontrado");

  return prisma.dashboard.update({
    where: { userId },
    data: { layout: layout as object },
  });
}

export async function getAnalyticsWorkspace(userId: string) {
  await getOrCreateDashboardForUser(userId);
  const settings = await getDashboardSettings(userId);

  if (settings.analyticsLayout) {
    return {
      layout: normalizeAnalyticsLayout(settings.analyticsLayout),
      settings,
    };
  }

  const layout = normalizeAnalyticsLayout(DEFAULT_ANALYTICS_LAYOUT);
  const nextSettings = await saveDashboardSettings(userId, { analyticsLayout: layout });
  return { layout, settings: nextSettings };
}

export async function updateAnalyticsLayout(userId: string, layout: DashboardLayoutState) {
  const normalized = normalizeAnalyticsLayout(layout);
  normalized.version = ANALYTICS_LAYOUT_VERSION;
  await saveDashboardSettings(userId, { analyticsLayout: normalized });
  return normalized;
}
