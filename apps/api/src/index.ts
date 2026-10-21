import { createServer, type Server } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";

for (const fileName of [".env.local", ".env"]) {
  const localEnvPath = fileURLToPath(new URL(`../../../${fileName}`, import.meta.url));
  if (existsSync(localEnvPath)) loadEnvFile(localEnvPath);
}

export function startServer(port?: number): Server {
  const config = loadConfig();
  const server = createServer(createApp(config));
  server.listen(port ?? config.port);
  return server;
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
