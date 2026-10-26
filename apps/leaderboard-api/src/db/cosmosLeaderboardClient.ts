import { CosmosClient, type CosmosClientOptions, type Container } from "@azure/cosmos";
import type { LeaderboardConfig } from "../config/env.js";

export type CosmosLeaderboardConfig = Pick<LeaderboardConfig, "cosmosEndpoint" | "cosmosKey" | "cosmosDatabase" | "cosmosContainer">;

export function createCosmosClient(
  config: CosmosLeaderboardConfig,
  dependencies: { createClient?: (options: CosmosClientOptions) => CosmosClient } = {},
): CosmosClient {
  if (!config.cosmosEndpoint || !config.cosmosKey) {
    throw new Error("Leaderboard API configuration is incomplete.");
  }
  const options: CosmosClientOptions = { endpoint: config.cosmosEndpoint, key: config.cosmosKey };
  return dependencies.createClient?.(options) ?? new CosmosClient(options);
}

export function getLeaderboardContainer(client: CosmosClient, config: CosmosLeaderboardConfig): Container {
  return client.database(config.cosmosDatabase).container(config.cosmosContainer);
}
