import express, { type Express } from "express";

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  return app;
}
