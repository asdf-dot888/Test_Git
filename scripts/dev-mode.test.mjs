import { describe, expect, it } from "vitest";
import { AZURE_DEV_REQUIRED_KEYS, resolveDevelopmentMode } from "./dev-mode.mjs";

const completeEnvironment = Object.fromEntries(AZURE_DEV_REQUIRED_KEYS.map((key) => [key, `configured-${key}`]));

describe("resolveDevelopmentMode", () => {
  it("rejects an empty environment and reports every required Azure setting", () => {
    expect(resolveDevelopmentMode({})).toEqual({ mode: "invalid", missing: AZURE_DEV_REQUIRED_KEYS });
  });

  it("treats whitespace-only values as missing and ignores optional defaults", () => {
    expect(resolveDevelopmentMode({
      ENTRA_TENANT_ID: "  ",
      PORT: "3001",
      COSMOS_DATABASE: "card-roguelike",
      COSMOS_CONTAINER: "active-runs",
    })).toEqual({
      mode: "invalid",
      missing: AZURE_DEV_REQUIRED_KEYS,
    });
  });

  it("rejects partial Azure settings and returns the missing keys in configured order", () => {
    const result = resolveDevelopmentMode({ ENTRA_TENANT_ID: "tenant-id", COSMOS_ENDPOINT: "endpoint" });
    expect(result).toEqual({
      mode: "invalid",
      missing: [
        "ENTRA_API_AUDIENCE",
        "VITE_ENTRA_TENANT_ID",
        "VITE_ENTRA_CLIENT_ID",
        "VITE_ENTRA_API_SCOPE",
      ],
    });
  });

  it("selects Azure development when every required setting is present", () => {
    expect(resolveDevelopmentMode(completeEnvironment)).toEqual({ mode: "azure", missing: [] });
  });
});
