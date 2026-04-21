import { routes } from "@/lib/api-routes";
import { getApiBase, parseErrorResponse } from "@/lib/api-base";
import type { AuthTokens } from "@/lib/types";

async function refreshTokens(
  refreshToken: string,
): Promise<AuthTokens | null> {
  const base = getApiBase();
  const res = await fetch(`${base}${routes.auth.refresh}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<AuthTokens>;
}

export async function fetchWithAuth<T>(
  ctx: {
    getAccessToken: () => string | null;
    getRefreshToken: () => string | null;
    setTokens: (access: string, refresh: string) => void;
    clearTokens: () => void;
  },
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;
  const headers = new Headers(init.headers);
  const access = ctx.getAccessToken();
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }
  if (
    init.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !retried) {
    const refresh = ctx.getRefreshToken();
    if (refresh) {
      const newTokens = await refreshTokens(refresh);
      if (newTokens) {
        ctx.setTokens(newTokens.accessToken, newTokens.refreshToken);
        return fetchWithAuth<T>(ctx, path, init, true);
      }
    }
    ctx.clearTokens();
  }

  if (!res.ok) {
    await parseErrorResponse(res, path);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Public endpoints (no auth) */
export async function fetchPublic<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (
    init.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    await parseErrorResponse(res, path);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function postAuthJson<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    await parseErrorResponse(res, path);
  }
  return res.json() as Promise<T>;
}
