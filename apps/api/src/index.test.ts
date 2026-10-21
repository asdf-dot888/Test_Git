import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

async function reservePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => probe.listen(0, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve()));
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a local port.");
  const port = address.port;
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

describe("App Service server startup", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses PORT, serves the built React shell, and releases shutdown listeners on close", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const port = await reservePort();
    vi.stubEnv("PORT", String(port));
    vi.stubEnv("ENTRA_TENANT_ID", "dummy-tenant");
    vi.stubEnv("ENTRA_API_AUDIENCE", "api://dummy-audience");
    vi.stubEnv("COSMOS_ENDPOINT", "https://dummy.documents.azure.com");
    const sigtermListeners = process.listenerCount("SIGTERM");
    const sigintListeners = process.listenerCount("SIGINT");
    const { startServer } = await import("./index.js");
    const server = startServer();

    try {
      await new Promise<void>((resolve, reject) => {
        if (server.listening) return resolve();
        server.once("listening", resolve);
        server.once("error", reject);
      });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("App Service server did not bind a TCP port.");
      expect(address.port).toBe(port);

      const [health, page] = await Promise.all([
        fetch(`http://127.0.0.1:${port}/api/health`),
        fetch(`http://127.0.0.1:${port}/`),
      ]);
      expect(health.status).toBe(200);
      await expect(health.json()).resolves.toEqual({ status: "ok" });
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("<div id=\"root\">");
      expect(process.listenerCount("SIGTERM")).toBe(sigtermListeners + 1);
      expect(process.listenerCount("SIGINT")).toBe(sigintListeners + 1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }

    expect(process.listenerCount("SIGTERM")).toBe(sigtermListeners);
    expect(process.listenerCount("SIGINT")).toBe(sigintListeners);
  });
});
