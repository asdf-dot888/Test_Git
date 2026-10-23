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
  const webDistPath = fileURLToPath(new URL("../../web/dist/", import.meta.url));
  const server = createServer(createApp({ config, webDistPath }));
  const listenPort = port ?? config.port;
  const shutdown = () => {
    if (server.listening) server.close();
  };
  const cleanupListeners = () => {
    process.off("SIGTERM", shutdown);
    process.off("SIGINT", shutdown);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  server.once("close", cleanupListeners);
  server.listen(listenPort, "0.0.0.0");
  return server;
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
