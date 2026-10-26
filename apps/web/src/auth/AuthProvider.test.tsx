import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InteractionRequiredAuthError, type AccountInfo, type IPublicClientApplication } from "@azure/msal-browser";
import { AuthConfigurationPage } from "./AuthConfigurationPage.js";
import { RequireAuth } from "./AuthProvider.js";
import { acquireLeaderboardAccessToken, AuthContext, type AuthContextValue } from "./authState.js";
import { buildMsalConfig, readAuthConfig } from "./authConfig.js";

const authConfigValues = {
  VITE_ENTRA_TENANT_ID: "company-tenant",
  VITE_ENTRA_CLIENT_ID: "spa-client-id",
};

function renderGate(value: AuthContextValue) {
  return renderToStaticMarkup(<AuthContext.Provider value={value}><RequireAuth><p>전투 화면</p></RequireAuth></AuthContext.Provider>);
}

describe("company account authentication", () => {
  it("shows a setup page listing missing frontend environment values", () => {
    const result = readAuthConfig({ VITE_ENTRA_CLIENT_ID: "client" }, "http://localhost:5173");
    const markup = renderToStaticMarkup(<AuthConfigurationPage missing={result.missing} />);
    expect(result.config).toBeNull();
    expect(result.missing).toEqual(["VITE_ENTRA_TENANT_ID"]);
    expect(markup).toContain("VITE_ENTRA_TENANT_ID");
  });

  it("builds a single-tenant MSAL authority with a session-only token cache", () => {
    const result = readAuthConfig(authConfigValues, "https://game.example/");
    expect(result.config?.tenantId).toBe("company-tenant");
    const config = buildMsalConfig(result.config!);
    expect(config.auth.authority).toBe("https://login.microsoftonline.com/company-tenant");
    expect(config.cache.cacheLocation).toBe("sessionStorage");
  });

  it("renders a signed-out gate and only reveals children for a signed-in account", () => {
    const base = { isLoading: false, userId: null, displayName: null, getLeaderboardAccessToken: vi.fn(async () => "token"), signIn: vi.fn(), signOut: vi.fn() };
    const signedOut = renderGate({ ...base, isAuthenticated: false });
    const signedIn = renderGate({ ...base, isAuthenticated: true, userId: "employee-oid", displayName: "Jin-hyun" });
    expect(signedOut).toContain("사내 계정 로그인이 필요합니다");
    expect(signedOut).not.toContain("전투 화면");
    expect(signedIn).toContain("전투 화면");
  });

  it("gets the API token silently and does not request leaderboard scope at login", async () => {
    const account = { homeAccountId: "home-id", localAccountId: "employee-id" } as AccountInfo;
    const acquireTokenSilent = vi.fn(async () => ({ accessToken: "api-access-token" }));
    const acquireTokenPopup = vi.fn(async () => ({ accessToken: "popup-token" }));
    const instance = { acquireTokenSilent, acquireTokenPopup } as unknown as IPublicClientApplication;

    const token = await acquireLeaderboardAccessToken(instance, account, { scopes: ["api://client/leaderboard.access"] });

    expect(token).toBe("api-access-token");
    expect(acquireTokenSilent).toHaveBeenCalledWith({ scopes: ["api://client/leaderboard.access"], account });
    expect(acquireTokenPopup).not.toHaveBeenCalled();
  });

  it("requests interactive consent only when needed and retains the current page using a popup", async () => {
    const account = { homeAccountId: "home-id", localAccountId: "employee-id" } as AccountInfo;
    const acquireTokenSilent = vi.fn(async () => { throw new InteractionRequiredAuthError("interaction_required", "correlation-id"); });
    const acquireTokenPopup = vi.fn(async () => ({ accessToken: "popup-token" }));
    const instance = { acquireTokenSilent, acquireTokenPopup } as unknown as IPublicClientApplication;

    await expect(acquireLeaderboardAccessToken(instance, account, { scopes: ["api://client/leaderboard.access"] }))
      .resolves.toBe("popup-token");

    expect(acquireTokenPopup).toHaveBeenCalledWith({
      scopes: ["api://client/leaderboard.access"],
      account,
    });
  });

  it("does not interrupt victory flow to request missing leaderboard consent", async () => {
    const account = { homeAccountId: "home-id", localAccountId: "employee-id" } as AccountInfo;
    const interactionRequired = new InteractionRequiredAuthError("interaction_required", "correlation-id");
    const acquireTokenSilent = vi.fn(async () => { throw interactionRequired; });
    const acquireTokenPopup = vi.fn(async () => ({ accessToken: "popup-token" }));
    const instance = { acquireTokenSilent, acquireTokenPopup } as unknown as IPublicClientApplication;

    await expect(acquireLeaderboardAccessToken(instance, account, { scopes: ["api://client/leaderboard.access"] }, false))
      .rejects.toBe(interactionRequired);
    expect(acquireTokenPopup).not.toHaveBeenCalled();
  });

});
