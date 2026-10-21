import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AuthConfigurationPage } from "./AuthConfigurationPage.js";
import { RequireAuth } from "./AuthProvider.js";
import { AuthContext, AuthRequiredError, getApiAccessToken, type AuthContextValue, type TokenClient } from "./authState.js";
import { buildMsalConfig, readAuthConfig } from "./authConfig.js";

const authConfigValues = {
  VITE_ENTRA_TENANT_ID: "company-tenant",
  VITE_ENTRA_CLIENT_ID: "spa-client-id",
  VITE_ENTRA_API_SCOPE: "api://game/access_as_user",
};

function renderGate(value: AuthContextValue) {
  return renderToStaticMarkup(<AuthContext.Provider value={value}><RequireAuth><p>전투 화면</p></RequireAuth></AuthContext.Provider>);
}

describe("company account authentication", () => {
  it("shows a setup page listing missing frontend environment values", () => {
    const result = readAuthConfig({ VITE_ENTRA_CLIENT_ID: "client" }, "http://localhost:5173");
    const markup = renderToStaticMarkup(<AuthConfigurationPage missing={result.missing} />);
    expect(result.config).toBeNull();
    expect(result.missing).toEqual(["VITE_ENTRA_TENANT_ID", "VITE_ENTRA_API_SCOPE"]);
    expect(markup).toContain("VITE_ENTRA_TENANT_ID");
    expect(markup).toContain("VITE_ENTRA_API_SCOPE");
  });

  it("builds a single-tenant MSAL authority with a session-only token cache", () => {
    const result = readAuthConfig(authConfigValues, "https://game.example/");
    expect(result.config?.tenantId).toBe("company-tenant");
    const config = buildMsalConfig(result.config!);
    expect(config.auth.authority).toBe("https://login.microsoftonline.com/company-tenant");
    expect(config.cache.cacheLocation).toBe("sessionStorage");
  });

  it("renders a signed-out gate and only reveals children for a signed-in account", () => {
    const base = { isLoading: false, displayName: null, signIn: vi.fn(), signOut: vi.fn(), getApiToken: vi.fn() };
    const signedOut = renderGate({ ...base, isAuthenticated: false });
    const signedIn = renderGate({ ...base, isAuthenticated: true, displayName: "Jin-hyun" });
    expect(signedOut).toContain("사내 계정 로그인이 필요합니다");
    expect(signedOut).not.toContain("전투 화면");
    expect(signedIn).toContain("전투 화면");
  });

  it("requires a signed-in account before an API token can be returned", async () => {
    await expect(getApiAccessToken({} as TokenClient, null, { scopes: [authConfigValues.VITE_ENTRA_API_SCOPE] })).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it("uses silent acquisition for an authenticated account", async () => {
    const account = { homeAccountId: "home", environment: "login.microsoftonline.com", tenantId: "company-tenant", username: "player@example.com", localAccountId: "employee-oid" };
    const client = {
      acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: "valid-api-token" }),
      acquireTokenRedirect: vi.fn(),
    } as unknown as TokenClient;
    await expect(getApiAccessToken(client, account, { scopes: [authConfigValues.VITE_ENTRA_API_SCOPE] })).resolves.toBe("valid-api-token");
    expect(client.acquireTokenRedirect).not.toHaveBeenCalled();
  });

  it("starts an interactive redirect when silent API token acquisition requires user interaction", async () => {
    const account = { homeAccountId: "home", environment: "login.microsoftonline.com", tenantId: "company-tenant", username: "player@example.com", localAccountId: "employee-oid" };
    const client = {
      acquireTokenSilent: vi.fn().mockRejectedValue(Object.assign(new Error("interaction required"), { name: "InteractionRequiredAuthError" })),
      acquireTokenRedirect: vi.fn().mockResolvedValue(undefined),
    } as unknown as TokenClient;

    await expect(getApiAccessToken(client, account, { scopes: [authConfigValues.VITE_ENTRA_API_SCOPE] })).rejects.toBeInstanceOf(AuthRequiredError);
    expect(client.acquireTokenRedirect).toHaveBeenCalledOnce();
  });
});
