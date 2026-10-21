import { basename, extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import express, { type Express, type RequestHandler } from "express";
import { createEntraAuth } from "./auth/entraAuth.js";
import { loadConfig, type AppConfig } from "./config/env.js";
import type { RunRepository } from "./db/runRepository.js";
import { createJsonErrorHandler, createRunRouter } from "./routes/runRoutes.js";

export interface CreateAppOptions {
  webDistPath?: string;
  config?: AppConfig;
  authenticate?: RequestHandler;
  repository?: RunRepository;
  runDependencies?: { now?: () => Date; newOwnerId?: () => string };
}

export function createApp(options: CreateAppOptions = {}): Express {
  const config = options.config ?? loadConfig();
  const authenticate = options.authenticate ?? createEntraAuth(config);
  const app = express();

  app.use(express.json({ limit: "256kb" }));
  app.use("/api", (request, response, next) => {
    if (request.method === "GET" && request.path === "/health") return next();
    return authenticate(request, response, next);
  });
  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });
  if (options.repository) {
    app.use("/api/run", createRunRouter({ repository: options.repository, ...options.runDependencies }));
  }
  app.use("/api", (_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "The API route was not found." } });
  });

  if (options.webDistPath) {
    const webDistPath = resolve(options.webDistPath);
    const indexPath = resolve(webDistPath, "index.html");
    if (!existsSync(indexPath)) throw new Error("React production assets are missing. Run the root build before starting the API server.");

    app.use(express.static(webDistPath, {
      index: false,
      maxAge: "1h",
      setHeaders(response, filePath) {
        if (basename(filePath) === "index.html") {
          response.setHeader("Cache-Control", "no-cache");
        } else if (/-[A-Za-z0-9_-]{8,}\.[^.]+$/.test(basename(filePath))) {
          response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }));
    app.get("/{*path}", (request, response, next) => {
      if (!request.accepts("html") || extname(request.path)) return next();
      response.setHeader("Cache-Control", "no-cache");
      return response.sendFile(indexPath);
    });
  }

  app.use(createJsonErrorHandler());
  return app;
}
