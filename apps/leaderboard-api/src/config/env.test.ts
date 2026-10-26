import { describe, expect, it } from "vitest";
import type { CosmosClient, CosmosClientOptions } from "@azure/cosmos";
import { createCosmosClient } from "../db/cosmosLeaderboardClient.js";
import { loadLeaderboardConfig } from "./env.js";

const configuredEnvironment = {
  ENTRA_TENANT_ID: " tenant-id ",
  ENTRA_API_AUDIENCE: " audience-id ",
  COSMOS_ENDPOINT: " https://account.documents.azure.com ",
  COSMOS_KEY: " secret-key ",
};

describe("loadLeaderboardConfig", () => {
  it("requires auth and Cosmos settings without echoing secret values", () => {
    expect(() => loadLeaderboardConfig({ COSMOS_KEY: "never-print-this" })).toThrow("Leaderboard API configuration is incomplete.");
    expect(() => loadLeaderboardConfig({ ...configuredEnvironment, COSMOS_KEY: "" })).toThrow("Leaderboard API configuration is incomplete.");
    try {
      loadLeaderboardConfig({ ...configuredEnvironment, COSMOS_KEY: "never-print-this" as string, ENTRA_TENANT_ID: "" });
    } catch (error) {
      expect(String(error)).not.toContain("never-print-this");
    }
  });

  it("trims required values and defaults the leaderboard database and container", () => {
    expect(loadLeaderboardConfig(configuredEnvironment)).toEqual({
      entraTenantId: "tenant-id",
      entraApiAudience: "audience-id",
      cosmosEndpoint: "https://account.documents.azure.com",
      cosmosKey: "secret-key",
      cosmosDatabase: "maze-rescue",
      cosmosContainer: "leaderboard-progress",
    });
  });

  it("allows explicit database and container names", () => {
    expect(loadLeaderboardConfig({ ...configuredEnvironment, COSMOS_DATABASE: "custom-db", COSMOS_CONTAINER: "custom-container" }))
      .toMatchObject({ cosmosDatabase: "custom-db", cosmosContainer: "custom-container" });
  });

  it("passes the endpoint and server-only key to the injected Cosmos client factory", () => {
    let clientOptions: CosmosClientOptions | undefined;
    const fakeClient = {} as CosmosClient;

    const client = createCosmosClient({
      cosmosEndpoint: "https://account.documents.azure.com",
      cosmosKey: "private-server-key",
      cosmosDatabase: "maze-rescue",
      cosmosContainer: "leaderboard-progress",
    }, {
      createClient: (options) => {
        clientOptions = options;
        return fakeClient;
      },
    });

    expect(client).toBe(fakeClient);
    expect(clientOptions).toEqual({ endpoint: "https://account.documents.azure.com", key: "private-server-key" });
  });
});
