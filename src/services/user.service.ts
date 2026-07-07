import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/types/dashboard-layout";
import type { UserRole } from "@/types/user-role";

/** Cria usuário com senha hasheada (útil para seeds/admin futuro). */
export async function createUserWithPassword(input: {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      role: input.role ?? "VIEWER",
      dashboard: {
        create: {
          name: "Meu Dashboard",
          layout: DEFAULT_DASHBOARD_LAYOUT as object,
          dataSources: [],
          settings: {},
          layoutPresets: [],
        },
      },
    },
  });
}
