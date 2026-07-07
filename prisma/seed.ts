import { PrismaClient, UserRole } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { encryptField } from "../src/lib/crypto/field-encryption";

const prisma = new PrismaClient();

const DEFAULT_LAYOUT = {
  version: 2,
  widgets: [],
  layouts: { lg: [] },
};

const SEED_USERS: Array<{
  email: string;
  password: string;
  name: string;
  role: UserRole;
  platformRole?: "SUPER_ADMIN" | "USER";
}> = [
  {
    email: "admin@kommo.local",
    password: "Admin123!",
    name: "Admin Demo",
    role: "ADMIN",
    platformRole: "SUPER_ADMIN",
  },
  { email: "editor@kommo.local", password: "Editor123!", name: "Editor Demo", role: "EDITOR" },
  { email: "viewer@kommo.local", password: "Viewer123!", name: "Visualizador Demo", role: "VIEWER" },
];

async function ensureTenant() {
  let tenant = await prisma.tenant.findUnique({ where: { slug: "demo" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: "Cliente Demo", slug: "demo" },
    });
    console.log("Created tenant: demo");
  }
  return tenant;
}

async function upsertSeedUser(
  user: (typeof SEED_USERS)[number],
  tenantId: string,
) {
  const hashedPassword = await bcryptjs.hash(user.password, 12);
  const existing = await prisma.user.findUnique({ where: { email: user.email } });

  let userId: string;
  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        passwordHash: hashedPassword,
        role: user.role,
        platformRole: user.platformRole ?? "USER",
        dashboard: {
          create: {
            name: "Dashboard Executivo",
            layout: DEFAULT_LAYOUT,
            tenantId,
            dataSources: [],
            settings: {},
            layoutPresets: [],
          },
        },
      },
    });
    userId = created.id;
    console.log(`Created user [${user.role}]: ${user.email}`);
  } else {
    await prisma.user.update({
      where: { email: user.email },
      data: {
        name: user.name,
        passwordHash: hashedPassword,
        role: user.role,
        platformRole: user.platformRole ?? existing.platformRole,
      },
    });
    userId = existing.id;
    console.log(`Updated user [${user.role}]: ${user.email}`);
  }

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      role: user.role === "ADMIN" ? "TENANT_ADMIN" : user.role === "EDITOR" ? "EDITOR" : "VIEWER",
    },
    update: {},
  });
}

async function seedKommoFromEnv(tenantId: string) {
  const subdomain = process.env.KOMMO_SUBDOMAIN?.trim();
  const accessToken = process.env.KOMMO_ACCESS_TOKEN?.trim();
  if (!subdomain || !accessToken) return;

  const existing = await prisma.kommoIntegration.findFirst({ where: { tenantId, subdomain } });
  if (existing) return;

  await prisma.kommoIntegration.create({
    data: {
      tenantId,
      name: "Kommo Principal",
      subdomain,
      accessTokenEncrypted: encryptField(accessToken),
      clientId: process.env.KOMMO_CLIENT_ID?.trim() || null,
      clientSecretEncrypted: process.env.KOMMO_CLIENT_SECRET
        ? encryptField(process.env.KOMMO_CLIENT_SECRET)
        : null,
      isActive: true,
    },
  });
  console.log("Created Kommo integration from env for demo tenant");
}

async function main() {
  console.log("Seeding database...");
  const tenant = await ensureTenant();

  for (const user of SEED_USERS) {
    await upsertSeedUser(user, tenant.id);
  }

  await seedKommoFromEnv(tenant.id);

  const legacy = await prisma.user.findUnique({ where: { email: "demo@example.com" } });
  if (legacy) {
    await prisma.user.delete({ where: { email: "demo@example.com" } });
    console.log("Removed legacy user: demo@example.com");
  }

  console.log("Seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
