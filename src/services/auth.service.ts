import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/types/dashboard-layout";
import type { UserRole } from "@/types/user-role";
import { USER_ROLES } from "@/types/user-role";

export type RegisterInput = {
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
};

export type AuthValidationResult =
  | { ok: true; data: { email: string; password: string; name?: string } }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return "Informe um e-mail.";
  if (!EMAIL_PATTERN.test(normalized)) return "E-mail inválido.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(password)) return "A senha deve conter pelo menos uma letra.";
  if (!/\d/.test(password)) return "A senha deve conter pelo menos um número.";
  return null;
}

export function validateRegisterInput(input: RegisterInput): AuthValidationResult {
  const emailError = validateEmail(input.email);
  if (emailError) return { ok: false, error: emailError };

  const passwordError = validatePassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };

  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "As senhas não coincidem." };
  }

  const name = input.name?.trim();
  return {
    ok: true,
    data: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      name: name || undefined,
    },
  };
}

export async function registerUser(input: RegisterInput, role: UserRole = "VIEWER") {
  const validation = validateRegisterInput(input);
  if (!validation.ok) return validation;

  const { email, password, name } = validation.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false as const, error: "Este e-mail já está cadastrado." };

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role,
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
    select: { id: true, email: true, name: true, role: true },
  });

  return { ok: true as const, user };
}

export async function listUsersForAdmin() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function updateUserRole(userId: string, role: UserRole) {
  if (!USER_ROLES.includes(role)) {
    throw new Error("Papel inválido.");
  }
  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });
}
