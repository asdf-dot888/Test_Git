import { createServer, type Server } from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

const config = {
  entraTenantId: "tenant-123",
  entraApiAudience: "api://game-api",
  cosmosEndpoint: "",
  cosmosDatabase: "card-roguelike",
  cosmosContainer: "active-runs",
  port: 3001,
};

describe("production Express hosting", () => {
  let server: Server;
  let baseUrl: string;
  let webDistPath: string;
  const authenticateMock = vi.fn((_request: Request, _response: Response, next: NextFunction) => next());
  const authenticate = authenticateMock as unknown as RequestHandler;

  beforeAll(async () => {
    webDistPath = await mkdtemp(join(tmpdir(), "board-card-web-dist-"));
    await mkdir(join(webDistPath, "assets"));
    await writeFile(join(webDistPath, "index.html"), "<!doctype html><title>game-shell</title>");
    await writeFile(join(webDistPath, "assets", "index-abc12345.js"), "hashed-bundle");
    await writeFile(join(webDistPath, "assets", "card.svg"), "static-art");
    server = createServer(createApp({ config, authenticate, webDistPath }));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port.");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(webDistPath, { recursive: true, force: true });
  });

  it("serves React at the root and falls back to index for browser routes without caching HTML", async () => {
    const root = await fetch(`${baseUrl}/`);
    const route = await fetch(`${baseUrl}/run/phase/2`);

    expect(root.status).toBe(200);
    expect(await root.text()).toContain("game-shell");
    expect(root.headers.get("cache-control")).toBe("no-cache");
    expect(route.status).toBe(200);
    expect(await route.text()).toContain("game-shell");
    expect(route.headers.get("cache-control")).toBe("no-cache");
  });

  it("uses immutable caching for hashed assets and short caching for public artwork", async () => {
    const bundle = await fetch(`${baseUrl}/assets/index-abc12345.js`);
    const art = await fetch(`${baseUrl}/assets/card.svg`);

    expect(bundle.status).toBe(200);
    expect(bundle.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(art.status).toBe(200);
    expect(art.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("keeps API health public and never serves index.html for unknown API paths", async () => {
    authenticateMock.mockClear();
    const health = await fetch(`${baseUrl}/api/health`);
    expect(authenticateMock).not.toHaveBeenCalled();
    const unknown = await fetch(`${baseUrl}/api/missing`);

    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({ status: "ok" });
    expect(authenticateMock).toHaveBeenCalledOnce();
    expect(unknown.status).toBe(404);
    expect(unknown.headers.get("content-type")).toContain("application/json");
    await expect(unknown.json()).resolves.toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
