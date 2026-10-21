import express, { type Express } from "express";
import { createEntraAuth } from "./auth/entraAuth.js";
import { loadConfig, type AppConfig } from "./config/env.js";

export function createApp(config: AppConfig = loadConfig(), authenticate = createEntraAuth(config)): Express {
  const app = express();

  app.use(express.json());
  app.use("/api", (request, response, next) => {
    if (request.method === "GET" && request.path === "/health") return next();
    return authenticate(request, response, next);
  });
  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  return app;
}
