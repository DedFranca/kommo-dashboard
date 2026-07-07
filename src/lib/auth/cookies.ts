import { cookies } from "next/headers";

export const ACCESS_COOKIE = "km_access";
export const REFRESH_COOKIE = "km_refresh";

const isProd = process.env.NODE_ENV === "production";

export function accessCookieOptions(maxAgeSec = 15 * 60) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function refreshCookieOptions(maxAgeSec = 7 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(REFRESH_COOKIE)?.value ?? null;
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}
