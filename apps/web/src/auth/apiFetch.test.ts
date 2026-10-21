import { describe, expect, it, vi } from "vitest";
import { authenticatedFetch } from "./apiFetch.js";

describe("authenticatedFetch", () => {
  it("adds the Entra access token as a bearer header to every API request", async () => {
    const capturedHeaders: Headers[] = [];
    const fetcher = vi.fn(async (...args: Parameters<typeof fetch>) => {
      capturedHeaders.push(new Headers(args[1]?.headers));
      return new Response("ok", { status: 200 });
    });
    const response = await authenticatedFetch("/api/run", { headers: { "x-test": "yes" } }, async () => "signed-access-token", fetcher);
    expect(response.status).toBe(200);
    expect(capturedHeaders[0]?.get("authorization")).toBe("Bearer signed-access-token");
    expect(capturedHeaders[0]?.get("x-test")).toBe("yes");
  });
});
