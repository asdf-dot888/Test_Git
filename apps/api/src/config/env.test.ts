import { describe, expect, it } from "vitest";
import { ConfigurationError, loadConfig } from "./env.js";

describe("loadConfig", () => {
  it("requires tenant and API audience while defaulting non-auth settings", () => {
    const config = loadConfig({ ENTRA_TENANT_ID: " tenant-id ", ENTRA_API_AUDIENCE: "api://game", PORT: "4000" });
    expect(config).toMatchObject({ entraTenantId: "tenant-id", entraApiAudience: "api://game", port: 4000, cosmosDatabase: "card-roguelike", cosmosContainer: "active-runs" });
  });

  it("reports missing auth configuration without printing secret values", () => {
    expect(() => loadConfig({})).toThrowError(ConfigurationError);
    try {
      loadConfig({});
    } catch (error) {
      expect((error as ConfigurationError).missing).toEqual(["ENTRA_TENANT_ID", "ENTRA_API_AUDIENCE"]);
    }
  });

  it("rejects an invalid API port", () => {
    expect(() => loadConfig({ ENTRA_TENANT_ID: "tenant", ENTRA_API_AUDIENCE: "api://game", PORT: "70000" })).toThrow("PORT must be an integer");
  });
});
