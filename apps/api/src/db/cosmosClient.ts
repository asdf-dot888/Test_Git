import { CosmosClient, type CosmosClientOptions, type Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import type { AppConfig } from "../config/env.js";

export type CosmosConfig = Pick<AppConfig, "cosmosEndpoint" | "cosmosDatabase" | "cosmosContainer">;

export function createCosmosClient(
  config: CosmosConfig,
  dependencies: {
    createCredential?: () => DefaultAzureCredential;
    createClient?: (options: CosmosClientOptions) => CosmosClient;
  } = {},
): CosmosClient {
  if (!config.cosmosEndpoint) throw new Error("Cosmos DB endpoint is not configured.");

  const credential = dependencies.createCredential?.() ?? new DefaultAzureCredential();
  const options: CosmosClientOptions = {
    endpoint: config.cosmosEndpoint,
    aadCredentials: credential,
    connectionPolicy: { retryOptions: { maxRetryAttemptCount: 9, maxWaitTimeInSeconds: 30 } },
  };
  return dependencies.createClient?.(options) ?? new CosmosClient(options);
}

export function getActiveRunContainer(client: CosmosClient, config: CosmosConfig): Container {
  return client.database(config.cosmosDatabase).container(config.cosmosContainer);
}
