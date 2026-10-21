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
  const webDistPath = fileURLToPath(new URL("../../web/dist/", import.meta.url));
  const server = createServer(createApp({ config, repository, webDistPath }));
  const listenPort = port ?? config.port;
  let disposed = false;
  const disposeResources = () => {
    if (disposed) return;
    disposed = true;
    process.off("SIGTERM", shutdown);
    process.off("SIGINT", shutdown);
    cosmosClient.dispose();
  };
  const shutdown = () => {
    if (server.listening) server.close(disposeResources);
    else disposeResources();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  server.once("close", disposeResources);
  server.listen(listenPort, "0.0.0.0");
  return server;
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
