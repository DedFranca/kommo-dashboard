import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AuthSessionPayload, PlatformRole, TenantRole } from "@/types/tenant";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS ?? "7");

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("JWT_SECRET ou AUTH_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AuthSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.userId || !payload.tenantId) return null;
    return payload as unknown as AuthSessionPayload;
  } catch {
    return null;
  }
}

export function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TTL_DAYS);
  return d;
}

export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateRefreshTokenRaw(): string {
  return randomBytes(48).toString("base64url");
}

export function mapLegacyRoleToTenant(role: string): TenantRole {
  if (role === "ADMIN") return "TENANT_ADMIN";
  if (role === "EDITOR") return "EDITOR";
  return "VIEWER";
}

export function mapPlatformRole(value: string): PlatformRole {
  return value === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER";
}
