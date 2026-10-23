import { describe, expect, it } from "vitest";
import { buildMsalConfig, createAuthRequests, readAuthConfig } from "./authConfig.js";

describe("Entra SPA configuration", () => {
  it("requires only the tenant and SPA client IDs", () => {
    expect(readAuthConfig({ VITE_ENTRA_TENANT_ID: " tenant ", VITE_ENTRA_CLIENT_ID: " client " }, "http://localhost:5173")).toEqual({
      config: { tenantId: "tenant", clientId: "client", redirectUri: "http://localhost:5173" },
      missing: [],
    });
  });

  it("reports the missing SPA settings without requiring an API scope", () => {
    expect(readAuthConfig({ VITE_ENTRA_TENANT_ID: "tenant" }, "http://localhost:5173").missing).toEqual(["VITE_ENTRA_CLIENT_ID"]);
  });

  it("uses OIDC sign-in scopes and the current origin for redirect", () => {
    const config = { tenantId: "tenant", clientId: "client", redirectUri: "http://localhost:5173" };
    expect(createAuthRequests(config).loginRequest.scopes).toEqual(["openid", "profile"]);
    expect(buildMsalConfig(config).auth.redirectUri).toBe("http://localhost:5173");
  });
});
