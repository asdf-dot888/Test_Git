import { createRun } from "@board-game/game-core";
import { describe, expect, it, vi } from "vitest";
import { getTabOwnerId, RunClient, RunClientError } from "./runClient.js";

const ownerId = "1d0a0a31-5713-4d1f-96f4-684a1bb5d53a";

describe("RunClient", () => {
  it("uses bearer authentication and sends the per-tab owner header", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ? { input, init } : { input });
      return Response.json({ run: null, ownerId });
    });
    const client = new RunClient("https://game.example", async () => "entra-token", fetcher);

    await client.getActiveRun(ownerId);

    expect(calls[0]?.input).toBe("https://game.example/api/run");
    expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe("Bearer entra-token");
    expect(new Headers(calls[0]?.init?.headers).get("x-run-owner")).toBe(ownerId);
  });

  it("serializes create, save with If-Match, real activity, and delete requests", async () => {
    const run = createRun(44);
    const calls: Array<{ method: string; headers: Headers; body: string | undefined; path: RequestInfo | URL }> = [];
    const replies = [
      Response.json({ run, etag: "etag-1" }, { status: 201 }),
      Response.json({ run, etag: "etag-2" }),
      Response.json({ etag: "etag-3", expiresAt: "2026-10-21T10:15:00.000Z" }),
      new Response(null, { status: 204 }),
    ];
    const fetcher = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ method: init?.method ?? "GET", headers: new Headers(init?.headers), body: init?.body?.toString(), path });
      return replies.shift()!;
    });
    const client = new RunClient("", async () => "token", fetcher);

    await expect(client.createRun(44, ownerId)).resolves.toMatchObject({ etag: "etag-1" });
    await expect(client.saveRun(run, "etag-1", ownerId)).resolves.toMatchObject({ etag: "etag-2" });
    await expect(client.recordActivity(ownerId)).resolves.toEqual({ etag: "etag-3", expiresAt: "2026-10-21T10:15:00.000Z" });
    await expect(client.deleteRun("abandoned", ownerId)).resolves.toBeUndefined();

    expect(calls.map((call) => call.method)).toEqual(["POST", "PUT", "POST", "DELETE"]);
    expect(calls[1]?.headers.get("if-match")).toBe("etag-1");
    expect(JSON.parse(calls[0]!.body!).seed).toBe(44);
    expect(JSON.parse(calls[3]!.body!).reason).toBe("abandoned");
    expect(calls.every((call) => call.headers.get("authorization") === "Bearer token")).toBe(true);
  });

  it("surfaces structured lock, conflict, and service errors without replacing them with raw JSON", async () => {
    const client = new RunClient("", async () => "token", async () => Response.json({ error: { code: "RUN_LOCKED", message: "busy", expiresAt: "2026-10-21T10:15:00.000Z" } }, { status: 423 }));

    await expect(client.getActiveRun(ownerId)).rejects.toMatchObject<Partial<RunClientError>>({ status: 423, code: "RUN_LOCKED", expiresAt: "2026-10-21T10:15:00.000Z" });
  });
});

describe("getTabOwnerId", () => {
  it("keeps a stable owner for the tab and creates it only once", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const createId = vi.fn(() => ownerId);

    expect(getTabOwnerId(storage, createId)).toBe(ownerId);
    expect(getTabOwnerId(storage, createId)).toBe(ownerId);
    expect(createId).toHaveBeenCalledOnce();
  });
});
