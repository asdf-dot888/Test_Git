import { describe, expect, it } from "vitest";
import { loadConfig } from "./env.js";

describe("loadConfig", () => {
  it("allows static hosting without API auth settings and defaults optional settings", () => {
    expect(loadConfig({})).toMatchObject({ entraTenantId: "", entraApiAudience: "", port: 8080, cosmosDatabase: "card-roguelike", cosmosContainer: "active-runs" });
  });

  it("reads optional Entra and Cosmos settings when a protected API is configured", () => {
    const config = loadConfig({ ENTRA_TENANT_ID: " tenant-id ", ENTRA_API_AUDIENCE: "api://game", PORT: "4000" });
    expect(config).toMatchObject({ entraTenantId: "tenant-id", entraApiAudience: "api://game", port: 4000, cosmosDatabase: "card-roguelike", cosmosContainer: "active-runs" });
  });

  it("rejects an invalid API port", () => {
    expect(() => loadConfig({ ENTRA_TENANT_ID: "tenant", ENTRA_API_AUDIENCE: "api://game", PORT: "70000" })).toThrow("PORT must be an integer");
  });
});
