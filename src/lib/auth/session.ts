import { getAccessTokenFromCookies, getRefreshTokenFromCookies } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt-tokens";
import type { AuthSessionPayload } from "@/types/tenant";

export async function getAuthSession(): Promise<AuthSessionPayload | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requireAuthSession(): Promise<AuthSessionPayload> {
  const session = await getAuthSession();
  if (!session) throw new Error("Não autorizado");
  return session;
}

export async function hasRefreshCookie(): Promise<boolean> {
  return Boolean(await getRefreshTokenFromCookies());
}
