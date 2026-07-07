import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/services/audit.service";
import type { LayoutDetail, LayoutKindValue, LayoutSummary } from "@/types/layout-entity";

type LayoutRow = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  dataSourceIntegrationId: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  config?: unknown;
  owner: { name: string | null } | null;
  shares: { viewerId: string }[];
};

function toSummary(row: LayoutRow): LayoutSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind as LayoutKindValue,
    dataSourceIntegrationId: row.dataSourceIntegrationId,
    ownerId: row.ownerId,
    ownerName: row.owner?.name ?? null,
    sharedViewerIds: row.shares.map((s) => s.viewerId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: LayoutRow): LayoutDetail {
  return { ...toSummary(row), config: row.config ?? {} };
}

const SUMMARY_INCLUDE = {
  owner: { select: { name: true } },
  shares: { select: { viewerId: true } },
} as const;

export type ViewerAccount = { id: string; email: string; name: string | null };

/** Lista de contas Visualizador para o seletor de compartilhamento. */
export async function listViewerAccounts(): Promise<ViewerAccount[]> {
  const rows = await prisma.user.findMany({
    where: { role: "VIEWER" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true },
  });
  return rows;
}

/** Layouts gerenciáveis por Admin/Editor (todos os layouts da organização). */
export async function listManageableLayouts(): Promise<LayoutSummary[]> {
  const rows = await prisma.layout.findMany({
    orderBy: { updatedAt: "desc" },
    include: SUMMARY_INCLUDE,
  });
  return (rows as unknown as LayoutRow[]).map(toSummary);
}

/** Visualizador tem algum layout compartilhado deste criador? */
export async function viewerCanAccessOwnerData(viewerId: string, ownerId: string): Promise<boolean> {
  if (viewerId === ownerId) return true;
  const share = await prisma.layoutShare.findFirst({
    where: { viewerId, layout: { ownerId } },
    select: { id: true },
  });
  return !!share;
}

/** IDs dos criadores cujos datasets um visualizador pode consultar via layouts compartilhados. */
export async function listDatasetOwnerIdsForViewer(viewerId: string): Promise<string[]> {
  const shares = await prisma.layoutShare.findMany({
    where: { viewerId },
    select: { layout: { select: { ownerId: true } } },
  });
  return [...new Set(shares.map((s) => s.layout.ownerId))];
}

/** Layouts ANALYTICS compartilhados com um Visualizador, com `config` para renderização. */
export async function listAnalyticsLayoutsForViewer(viewerId: string): Promise<LayoutDetail[]> {
  const rows = await prisma.layout.findMany({
    where: { kind: "ANALYTICS", shares: { some: { viewerId } } },
    orderBy: { updatedAt: "desc" },
    include: SUMMARY_INCLUDE,
  });
  return (rows as unknown as LayoutRow[]).map(toDetail);
}

/** Layouts compartilhados com um Visualizador específico. */
export async function listLayoutsForViewer(viewerId: string): Promise<LayoutSummary[]> {
  const rows = await prisma.layout.findMany({
    where: { shares: { some: { viewerId } } },
    orderBy: { updatedAt: "desc" },
    include: SUMMARY_INCLUDE,
  });
  return (rows as unknown as LayoutRow[]).map(toSummary);
}

export async function getLayoutDetail(id: string): Promise<LayoutDetail | null> {
  const row = await prisma.layout.findUnique({ where: { id }, include: SUMMARY_INCLUDE });
  if (!row) return null;
  return toDetail(row as unknown as LayoutRow);
}

/** Detalhe acessível a um Visualizador apenas se o layout foi compartilhado com ele. */
export async function getLayoutForViewer(id: string, viewerId: string): Promise<LayoutDetail | null> {
  const row = await prisma.layout.findFirst({
    where: { id, shares: { some: { viewerId } } },
    include: SUMMARY_INCLUDE,
  });
  if (!row) return null;
  return toDetail(row as unknown as LayoutRow);
}

export async function createLayout(
  input: {
    ownerId: string;
    name: string;
    description?: string | null;
    kind: LayoutKindValue;
    config: unknown;
    dataSourceIntegrationId?: string | null;
  },
): Promise<LayoutDetail> {
  const row = await prisma.layout.create({
    data: {
      ownerId: input.ownerId,
      name: input.name.trim() || "Layout sem título",
      description: input.description?.trim() || null,
      kind: input.kind,
      config: (input.config ?? {}) as object,
      dataSourceIntegrationId: input.dataSourceIntegrationId ?? null,
    },
    include: SUMMARY_INCLUDE,
  });
  await recordAudit({
    actorId: input.ownerId,
    action: "layout.create",
    targetType: "layout",
    targetId: row.id,
    metadata: { name: input.name, kind: input.kind },
  });
  return toDetail(row as unknown as LayoutRow);
}

export async function updateLayout(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    config?: unknown;
    dataSourceIntegrationId?: string | null;
  },
  actorId: string,
): Promise<LayoutDetail | null> {
  const existing = await prisma.layout.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name.trim() || "Layout sem título";
  if (patch.description !== undefined) data.description = patch.description?.trim() || null;
  if (patch.config !== undefined) data.config = (patch.config ?? {}) as object;
  if (patch.dataSourceIntegrationId !== undefined) {
    data.dataSourceIntegrationId = patch.dataSourceIntegrationId;
  }

  const row = await prisma.layout.update({ where: { id }, data, include: SUMMARY_INCLUDE });
  await recordAudit({ actorId, action: "layout.update", targetType: "layout", targetId: id });
  return toDetail(row as unknown as LayoutRow);
}

export async function deleteLayout(id: string, actorId: string): Promise<boolean> {
  const existing = await prisma.layout.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  await prisma.layout.delete({ where: { id } });
  await recordAudit({ actorId, action: "layout.delete", targetType: "layout", targetId: id });
  return true;
}

/** Substitui o conjunto de Visualizadores com acesso a um layout. */
export async function setLayoutShares(
  layoutId: string,
  viewerIds: string[],
  actorId: string,
): Promise<LayoutSummary | null> {
  const existing = await prisma.layout.findUnique({ where: { id: layoutId }, select: { id: true } });
  if (!existing) return null;

  // Garante que os IDs são realmente Visualizadores.
  const validViewers = await prisma.user.findMany({
    where: { id: { in: viewerIds }, role: "VIEWER" },
    select: { id: true },
  });
  const validIds = validViewers.map((v) => v.id);

  await prisma.$transaction([
    prisma.layoutShare.deleteMany({ where: { layoutId } }),
    ...(validIds.length
      ? [
          prisma.layoutShare.createMany({
            data: validIds.map((viewerId) => ({ layoutId, viewerId })),
          }),
        ]
      : []),
  ]);

  await recordAudit({
    actorId,
    action: "layout.share",
    targetType: "layout",
    targetId: layoutId,
    metadata: { viewerIds: validIds },
  });

  const row = await prisma.layout.findUnique({ where: { id: layoutId }, include: SUMMARY_INCLUDE });
  return row ? toSummary(row as unknown as LayoutRow) : null;
}
