"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from "@/lib/auth-storage";
import { routes } from "@/lib/api-routes";
import { fetchWithAuth, postAuthJson } from "@/lib/session-api";
import type { AuthTokens, UserMe, UserRole } from "@/lib/types";

type SessionContextValue = {
  user: UserMe | null;
  loading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<UserMe>;
  register: (input: RegisterInput) => Promise<UserMe>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  api: {
    get: <T>(path: string) => Promise<T>;
    post: <T>(path: string, body?: unknown) => Promise<T>;
    patch: <T>(path: string, body?: unknown) => Promise<T>;
    delete: (path: string) => Promise<void>;
  };
};

export type RegisterInput =
  | {
      email: string;
      password: string;
      role: "STUDENT";
      firstName?: string;
      lastName?: string;
    }
  | {
      email: string;
      password: string;
      role: "EMPLOYER";
      companyName: string;
    };

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  const ctx = useMemo(
    () => ({
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      setTokens: (a: string, r: string) => {
        setAccessToken(a);
        setRefreshToken(r);
        setStoredTokens(a, r);
      },
      clearTokens: () => {
        setAccessToken(null);
        setRefreshToken(null);
        clearStoredTokens();
        setUser(null);
      },
    }),
    [accessToken, refreshToken],
  );

  const refreshUser = useCallback(async () => {
    const at = ctx.getAccessToken();
    if (!at) {
      setUser(null);
      return;
    }
    try {
      const me = await fetchWithAuth<UserMe>(ctx, routes.users.me, {
        method: "GET",
      });
      setUser(me);
    } catch {
      ctx.clearTokens();
    }
  }, [ctx]);

  useEffect(() => {
    const { accessToken: a, refreshToken: r } = getStoredTokens();
    if (a && r) {
      setAccessToken(a);
      setRefreshToken(r);
      fetchWithAuth<UserMe>(
        {
          getAccessToken: () => a,
          getRefreshToken: () => r,
          setTokens: (na, nr) => {
            setAccessToken(na);
            setRefreshToken(nr);
            setStoredTokens(na, nr);
          },
          clearTokens: () => {
            setAccessToken(null);
            setRefreshToken(null);
            clearStoredTokens();
          },
        },
        routes.users.me,
        { method: "GET" },
      )
        .then(setUser)
        .catch(() => {
          clearStoredTokens();
          setAccessToken(null);
          setRefreshToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const applyTokens = useCallback(
    async (tokens: AuthTokens): Promise<UserMe> => {
      ctx.setTokens(tokens.accessToken, tokens.refreshToken);
      const me = await fetchWithAuth<UserMe>(
        {
          getAccessToken: () => tokens.accessToken,
          getRefreshToken: () => tokens.refreshToken,
          setTokens: (na, nr) => ctx.setTokens(na, nr),
          clearTokens: () => ctx.clearTokens(),
        },
        routes.users.me,
        { method: "GET" },
      );
      setUser(me);
      return me;
    },
    [ctx],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await postAuthJson<AuthTokens>(routes.auth.login, {
        email,
        password,
      });
      return applyTokens(tokens);
    },
    [applyTokens],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const body =
        input.role === "STUDENT"
          ? {
              email: input.email,
              password: input.password,
              role: "STUDENT" as const,
              firstName: input.firstName,
              lastName: input.lastName,
            }
          : {
              email: input.email,
              password: input.password,
              role: "EMPLOYER" as const,
              companyName: input.companyName,
            };
      const tokens = await postAuthJson<AuthTokens>(routes.auth.register, body);
      return applyTokens(tokens);
    },
    [applyTokens],
  );

  const logout = useCallback(async () => {
    const rt = refreshToken;
    ctx.clearTokens();
    if (rt) {
      try {
        await postAuthJson(routes.auth.logout, { refreshToken: rt });
      } catch {
        /* ignore */
      }
    }
  }, [ctx, refreshToken]);

  const api = useMemo(
    () => ({
      get: <T,>(path: string) =>
        fetchWithAuth<T>(ctx, path, { method: "GET" }),
      post: <T,>(path: string, body?: unknown) =>
        fetchWithAuth<T>(ctx, path, {
          method: "POST",
          body: body !== undefined ? JSON.stringify(body) : undefined,
        }),
      patch: <T,>(path: string, body?: unknown) =>
        fetchWithAuth<T>(ctx, path, {
          method: "PATCH",
          body: body !== undefined ? JSON.stringify(body) : undefined,
        }),
      delete: (path: string) =>
        fetchWithAuth<void>(ctx, path, { method: "DELETE" }),
    }),
    [ctx],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      accessToken,
      login,
      register,
      logout,
      refreshUser,
      api,
    }),
    [user, loading, accessToken, login, register, logout, refreshUser, api],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession must be used within SessionProvider");
  return v;
}

export function defaultDashboardPath(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin/analytics";
    case "EMPLOYER":
      return "/employer/analytics";
    case "STUDENT":
    default:
      return "/dashboard";
  }
}
