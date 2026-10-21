import express, { type Express } from "express";
import { createEntraAuth } from "./auth/entraAuth.js";
import { loadConfig, type AppConfig } from "./config/env.js";
import type { RunRepository } from "./db/runRepository.js";
import { createJsonErrorHandler, createRunRouter } from "./routes/runRoutes.js";

export function createApp(
  config: AppConfig = loadConfig(),
  authenticate = createEntraAuth(config),
  repository?: RunRepository,
  createRunDependencies?: { now?: () => Date; newOwnerId?: () => string },
): Express {
  const app = express();

  app.use(express.json({ limit: "256kb" }));
  app.use("/api", (request, response, next) => {
    if (request.method === "GET" && request.path === "/health") return next();
    return authenticate(request, response, next);
  });
  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });
  if (repository) app.use("/api/run", createRunRouter({ repository, ...createRunDependencies }));
  app.use(createJsonErrorHandler());

  return app;
}
