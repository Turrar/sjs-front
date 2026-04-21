/**
 * База HTTP API с глобальным префиксом `/api` на бэкенде.
 * Пример: `http://localhost:3000/api` + `/auth/login` → POST …/api/auth/login
 *
 * Если в `NEXT_PUBLIC_API_URL` указан только origin без пути (`http://localhost:3000`),
 * автоматически добавляется `/api`, чтобы не получать 404 на `/auth/login` вместо `/api/auth/login`.
 */
export function getApiBase(): string {
  const fallback = "http://localhost:3000/api";
  const source = (process.env.NEXT_PUBLIC_API_URL ?? fallback).trim();
  const trimmed = source.replace(/\/$/, "");
  try {
    const u = new URL(trimmed);
    const pathOnly = u.pathname.replace(/\/$/, "") || "/";
    if (pathOnly === "/") {
      u.pathname = "/api";
      return u.href.replace(/\/$/, "");
    }
    return trimmed;
  } catch {
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
}

/**
 * Origin для Socket.IO, если namespace смонтирован не под `/api` (частый случай: `/chat` на корне).
 * Переопределение: `NEXT_PUBLIC_SOCKET_URL` (без завершающего слэша).
 */
export function getSocketBase(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const api = getApiBase();
  if (api.endsWith("/api")) {
    return api.slice(0, -4);
  }
  return api;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseErrorResponse(
  res: Response,
  path: string,
): Promise<never> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const msg =
    body &&
    typeof body === "object" &&
    "message" in body &&
    body.message !== undefined
      ? Array.isArray((body as { message: unknown }).message)
        ? (body as { message: string[] }).message.join(", ")
        : String((body as { message: unknown }).message)
      : res.statusText;
  throw new ApiError(res.status, path, msg, body);
}
