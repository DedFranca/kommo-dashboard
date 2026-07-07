import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.role_change"
  | "user.status_change"
  | "user.delete"
  | "user.assign_integration"
  | "layout.create"
  | "layout.update"
  | "layout.delete"
  | "layout.share";

export async function recordAudit(input: {
  actorId: string | null;
  action: AuditAction | string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: (input.metadata ?? {}) as object,
      },
    });
  } catch {
    // A auditoria nunca deve interromper a operação principal.
  }
}

export async function listAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
    include: { actor: { select: { id: true, email: true, name: true } } },
  });
}
