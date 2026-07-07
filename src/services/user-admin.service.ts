import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/types/dashboard-layout";
import type { UserRole } from "@/types/user-role";
import type { UserStatus } from "@/types/user-account";
import type { AdminUserSummary } from "@/types/user-account";
import type { TenantRole } from "@/types/tenant";
import { validateEmail, validatePassword } from "@/services/auth.service";
import { recordAudit } from "@/services/audit.service";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

function tenantRoleFor(role: UserRole): TenantRole {
  if (role === "ADMIN") return "TENANT_ADMIN";
  if (role === "EDITOR") return "EDITOR";
  return "VIEWER";
}

/** Organização padrão (modelo flat). Reaproveita o primeiro tenant existente. */
async function ensureDefaultTenant() {
  const existing = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.tenant.create({ data: { name: "Organização", slug: "organizacao" } });
}

function toSummary(row: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  kommoIntegrationId: string | null;
  createdAt: Date;
  kommoIntegration: { name: string } | null;
}): AdminUserSummary {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    kommoIntegrationId: row.kommoIntegrationId,
    kommoIntegrationName: row.kommoIntegration?.name ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const SUMMARY_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  kommoIntegrationId: true,
  createdAt: true,
  kommoIntegration: { select: { name: true } },
} as const;

export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: SUMMARY_SELECT,
  });
  return rows.map(toSummary);
}

export async function createManagedUser(
  input: {
    email: string;
    password: string;
    name?: string;
    role: UserRole;
    kommoIntegrationId?: string | null;
  },
  actorId: string,
): Promise<ServiceResult<AdminUserSummary>> {
  const email = input.email.trim().toLowerCase();
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, error: emailError };

  const passwordError = validatePassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Este e-mail já está cadastrado." };

  const tenant = await ensureDefaultTenant();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const integrationId = input.role === "VIEWER" ? input.kommoIntegrationId ?? null : null;

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name?.trim() || null,
      passwordHash,
      role: input.role,
      status: "ACTIVE",
      kommoIntegrationId: integrationId,
      memberships: { create: { tenantId: tenant.id, role: tenantRoleFor(input.role) } },
      dashboard: {
        create: {
          name: "Dashboard",
          layout: DEFAULT_DASHBOARD_LAYOUT as object,
          dataSources: [],
          settings: {},
          layoutPresets: [],
        },
      },
    },
    select: SUMMARY_SELECT,
  });

  await recordAudit({
    actorId,
    action: "user.create",
    targetType: "user",
    targetId: user.id,
    metadata: { email, role: input.role, kommoIntegrationId: integrationId },
  });

  return { ok: true, data: toSummary(user) };
}

export async function updateManagedUser(
  id: string,
  patch: {
    name?: string | null;
    role?: UserRole;
    status?: UserStatus;
    kommoIntegrationId?: string | null;
  },
  actorId: string,
): Promise<ServiceResult<AdminUserSummary>> {
  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true, kommoIntegrationId: true },
  });
  if (!current) return { ok: false, error: "Usuário não encontrado." };

  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name?.trim() || null;
  if (patch.role) data.role = patch.role;
  if (patch.status) data.status = patch.status;

  const nextRole = patch.role ?? (current.role as UserRole);
  if (nextRole !== "VIEWER") {
    data.kommoIntegrationId = null;
  } else if (patch.kommoIntegrationId !== undefined) {
    data.kommoIntegrationId = patch.kommoIntegrationId;
  }

  const user = await prisma.user.update({ where: { id }, data, select: SUMMARY_SELECT });

  if (patch.role && patch.role !== current.role) {
    await prisma.tenantMembership.updateMany({
      where: { userId: id },
      data: { role: tenantRoleFor(patch.role) },
    });
    await recordAudit({
      actorId,
      action: "user.role_change",
      targetType: "user",
      targetId: id,
      metadata: { from: current.role, to: patch.role },
    });
  }

  if (patch.status && patch.status !== current.status) {
    if (patch.status === "DISABLED") {
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
    }
    await recordAudit({
      actorId,
      action: "user.status_change",
      targetType: "user",
      targetId: id,
      metadata: { status: patch.status },
    });
  }

  if (
    patch.kommoIntegrationId !== undefined &&
    nextRole === "VIEWER" &&
    patch.kommoIntegrationId !== current.kommoIntegrationId
  ) {
    await recordAudit({
      actorId,
      action: "user.assign_integration",
      targetType: "user",
      targetId: id,
      metadata: { kommoIntegrationId: patch.kommoIntegrationId },
    });
  }

  return { ok: true, data: toSummary(user) };
}

export async function deleteManagedUser(id: string, actorId: string): Promise<ServiceResult<{ id: string }>> {
  const current = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!current) return { ok: false, error: "Usuário não encontrado." };

  await prisma.user.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "user.delete",
    targetType: "user",
    targetId: id,
    metadata: { email: current.email },
  });
  return { ok: true, data: { id } };
}
