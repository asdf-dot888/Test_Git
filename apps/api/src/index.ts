import { createServer, type Server } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createCosmosClient, getActiveRunContainer } from "./db/cosmosClient.js";
import { CosmosRunRepository } from "./db/runRepository.js";

for (const fileName of [".env.local", ".env"]) {
  const localEnvPath = fileURLToPath(new URL(`../../../${fileName}`, import.meta.url));
  if (existsSync(localEnvPath)) loadEnvFile(localEnvPath);
}

export function startServer(port?: number): Server {
  const config = loadConfig();
  const cosmosClient = createCosmosClient(config);
  const repository = new CosmosRunRepository(getActiveRunContainer(cosmosClient, config));
  const server = createServer(createApp(config, undefined, repository));
  server.listen(port ?? config.port);
  return server;
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
