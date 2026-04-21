const ACCESS = "sjs_access_token";
const REFRESH = "sjs_refresh_token";

export function getStoredTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }
  return {
    accessToken: window.localStorage.getItem(ACCESS),
    refreshToken: window.localStorage.getItem(REFRESH),
  };
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS, accessToken);
  window.localStorage.setItem(REFRESH, refreshToken);
}

export function clearStoredTokens() {
  window.localStorage.removeItem(ACCESS);
  window.localStorage.removeItem(REFRESH);
}
