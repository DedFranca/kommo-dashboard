import { prisma } from "@/lib/prisma";
import type { TenantStatus, TenantSummary } from "@/types/tenant";

export async function listTenants(): Promise<TenantSummary[]> {
  const rows = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true, kommoIntegrations: true } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status as TenantStatus,
    memberCount: t._count.memberships,
    kommoCount: t._count.kommoIntegrations,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: { select: { id: true, email: true, name: true } } } },
      kommoIntegrations: true,
    },
  });
}

export async function createTenant(input: { name: string; slug: string }) {
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return prisma.tenant.create({
    data: {
      name: input.name.trim(),
      slug,
    },
  });
}

export async function updateTenant(
  id: string,
  input: Partial<{ name: string; slug: string; status: TenantStatus }>,
) {
  return prisma.tenant.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      slug: input.slug?.trim().toLowerCase(),
      status: input.status,
    },
  });
}

export async function deleteTenant(id: string) {
  return prisma.tenant.delete({ where: { id } });
}

export async function addUserToTenant(tenantId: string, userId: string, role: string) {
  return prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId, role: role as "TENANT_ADMIN" | "EDITOR" | "VIEWER" },
    update: { role: role as "TENANT_ADMIN" | "EDITOR" | "VIEWER" },
  });
}

export async function removeUserFromTenant(tenantId: string, userId: string) {
  return prisma.tenantMembership.delete({
    where: { tenantId_userId: { tenantId, userId } },
  });
}

export async function listTenantMembers(tenantId: string) {
  return prisma.tenantMembership.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, email: true, name: true, platformRole: true } } },
    orderBy: { createdAt: "asc" },
  });
}
