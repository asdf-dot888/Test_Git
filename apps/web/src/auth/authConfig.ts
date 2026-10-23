export interface AuthConfig {
  tenantId: string;
  clientId: string;
  redirectUri: string;
}

export interface AuthConfigResult {
  config: AuthConfig | null;
  missing: string[];
}

export type AuthEnvironment = Record<string, string | undefined>;

const requiredVariables = [
  "VITE_ENTRA_TENANT_ID",
  "VITE_ENTRA_CLIENT_ID",
] as const;

export function readAuthConfig(
  environment: AuthEnvironment = import.meta.env,
  redirectUri = typeof window === "undefined" ? "" : window.location.origin,
): AuthConfigResult {
  const values = {
    tenantId: environment.VITE_ENTRA_TENANT_ID?.trim() ?? "",
    clientId: environment.VITE_ENTRA_CLIENT_ID?.trim() ?? "",
  };
  const missing = requiredVariables.filter((key) => !environment[key]?.trim());
  if (missing.length > 0) return { config: null, missing: [...missing] };
  return { config: { ...values, redirectUri }, missing: [] };
}

export function buildMsalConfig(config: AuthConfig) {
  return {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: config.redirectUri,
      postLogoutRedirectUri: config.redirectUri,
    },
    cache: { cacheLocation: "sessionStorage" as const, storeAuthStateInCookie: false },
  };
}

export function createAuthRequests(config: AuthConfig) {
  return {
    loginRequest: { scopes: ["openid", "profile"] },
  };
}
